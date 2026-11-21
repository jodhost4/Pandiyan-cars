require('dotenv').config();
const crypto=require('crypto');
const path=require('path');
const fs=require('fs');
const express=require('express');
const mongoose=require('mongoose');
const cors=require('cors');
const jwt=require('jsonwebtoken');
const multer=require('multer');
const {Schema,model}=mongoose;

const uploadsDir=process.env.UPLOADS_DIR||path.join(__dirname,'uploads');
const clientDist=path.join(__dirname,'..','client','dist');
const clientIndex=path.join(clientDist,'index.html');
fs.mkdirSync(uploadsDir,{recursive:true});
const app=express();
app.use(cors());
app.use(express.json({limit:'20kb'}));
app.use('/uploads',express.static(uploadsDir));
app.use(express.static(clientDist));

const imageTypes={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'};
const upload=multer({
  storage:multer.diskStorage({
    destination:(_req,_file,callback)=>callback(null,uploadsDir),
    filename:(_req,file,callback)=>callback(null,`${crypto.randomUUID()}${imageTypes[file.mimetype]}`)
  }),
  limits:{fileSize:5*1024*1024,files:8},
  fileFilter:(_req,file,callback)=>{
    if(!imageTypes[file.mimetype])return callback(new Error('Only JPG, PNG and WebP images are supported.'));
    callback(null,true);
  }
});

const carSchema=new Schema({
  title:{type:String,required:true,trim:true,maxlength:120},
  brand:{type:String,trim:true,maxlength:80},
  bodyType:{type:String,trim:true,maxlength:40},
  color:{type:String,trim:true,maxlength:40},
  year:{type:Number,required:true,min:1950,max:2100},
  price:{type:Number,required:true,min:0},
  km:{type:Number,required:true,min:0},
  fuel:{type:String,enum:['Petrol','Diesel','CNG','Electric'],required:true},
  transmission:{type:String,enum:['Manual','Automatic'],required:true},
  owners:{type:Number,min:1,default:1},
  description:{type:String,trim:true,maxlength:2000},
  images:[String],
  status:{type:String,enum:['available','sold'],default:'available'}
},{timestamps:true});
const leadSchema=new Schema({
  type:{type:String,enum:['buy','sell','contact'],default:'contact'},
  name:{type:String,required:true,trim:true,maxlength:80},
  phone:{type:String,required:true,trim:true,maxlength:20},
  email:{type:String,trim:true,lowercase:true,maxlength:254},
  message:{type:String,trim:true,maxlength:1000},
  car:{type:Schema.Types.ObjectId,ref:'Car'},
  status:{type:String,enum:['new','contacted','visit','won','lost'],default:'new'},
  notes:[{text:{type:String,required:true,maxlength:1000},at:{type:Date,default:Date.now}}]
},{timestamps:true});
const galleryPhotoSchema=new Schema({
  image:{type:String,required:true},
  caption:{type:String,trim:true,maxlength:120}
},{timestamps:true});
const brandSchema=new Schema({
  name:{type:String,required:true,trim:true,maxlength:80,unique:true},
  logo:{type:String,required:true}
},{timestamps:true});
const Car=model('Car',carSchema);
const Lead=model('Lead',leadSchema);
const GalleryPhoto=model('GalleryPhoto',galleryPhotoSchema);
const Brand=model('Brand',brandSchema);

function auth(req,res,next){
  try{
    const header=req.headers.authorization||'';
    const token=header.startsWith('Bearer ')?header.slice(7):'';
    jwt.verify(token,process.env.JWT_SECRET);
    next();
  }catch{
    res.status(401).json({error:'Please log in to continue.'});
  }
}
const wrap=handler=>(req,res,next)=>Promise.resolve(handler(req,res,next)).catch(next);
const carFields=['title','brand','bodyType','color','year','price','km','fuel','transmission','owners','description','status'];
function carBody(req){
  const body={};
  for(const field of carFields)if(req.body[field]!==undefined)body[field]=req.body[field];
  if(req.files?.length)body.images=req.files.map(file=>`/uploads/${file.filename}`);
  return body;
}

app.post('/api/login',(req,res)=>{
  const {email,password}=req.body||{};
  if(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD||!process.env.JWT_SECRET){
    return res.status(503).json({error:'Owner login is not configured on the server.'});
  }
  if(typeof email==='string'&&typeof password==='string'&&
      email===process.env.ADMIN_EMAIL&&password===process.env.ADMIN_PASSWORD){
    return res.json({token:jwt.sign({role:'owner'},process.env.JWT_SECRET,{expiresIn:'7d'})});
  }
  return res.status(401).json({error:'Wrong email or password.'});
});

app.get('/api/cars',(req,res,next)=>{
  if(req.query.all)return auth(req,res,next);
  return next();
},wrap(async(req,res)=>{
  const filter={};
  if(req.query.q){
    const query=String(req.query.q).slice(0,80).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    filter.$or=[{title:new RegExp(query,'i')},{brand:new RegExp(query,'i')}];
  }
  if(req.query.fuel&&['Petrol','Diesel','CNG','Electric'].includes(req.query.fuel))filter.fuel=req.query.fuel;
  res.json(await Car.find(filter).sort('-createdAt').lean());
}));
app.post('/api/cars',auth,upload.array('images',8),wrap(async(req,res)=>{
  res.status(201).json(await Car.create(carBody(req)));
}));
app.put('/api/cars/:id',auth,upload.array('images',8),wrap(async(req,res)=>{
  const car=await Car.findByIdAndUpdate(req.params.id,carBody(req),{new:true,runValidators:true});
  if(!car)return res.status(404).json({error:'Car not found.'});
  res.json(car);
}));
app.delete('/api/cars/:id',auth,wrap(async(req,res)=>{
  const car=await Car.findByIdAndDelete(req.params.id);
  if(!car)return res.status(404).json({error:'Car not found.'});
  res.json({ok:true});
}));

app.get('/api/gallery',wrap(async(_req,res)=>{
  res.json(await GalleryPhoto.find().sort('-createdAt').lean());
}));
app.post('/api/gallery',auth,upload.array('images',8),wrap(async(req,res)=>{
  if(!req.files?.length)return res.status(400).json({error:'Choose at least one photo to upload.'});
  const caption=typeof req.body.caption==='string'?req.body.caption.trim().slice(0,120):'';
  const photos=await GalleryPhoto.insertMany(req.files.map(file=>({
    image:`/uploads/${file.filename}`,
    caption
  })));
  res.status(201).json(photos);
}));
app.delete('/api/gallery/:id',auth,wrap(async(req,res)=>{
  const photo=await GalleryPhoto.findByIdAndDelete(req.params.id);
  if(!photo)return res.status(404).json({error:'Gallery photo not found.'});
  const filename=photo.image.startsWith('/uploads/')?path.basename(photo.image):'';
  if(filename){
    try{await fs.promises.unlink(path.join(uploadsDir,filename))}
    catch(error){if(error.code!=='ENOENT')console.error('Could not remove deleted gallery image:',error)}
  }
  res.json({ok:true});
}));

app.get('/api/brands',wrap(async(_req,res)=>{
  res.json(await Brand.find().sort('name').lean());
}));
app.post('/api/brands',auth,upload.single('logo'),wrap(async(req,res)=>{
  const name=typeof req.body.name==='string'?req.body.name.trim().slice(0,80):'';
  if(!name){
    if(req.file)await fs.promises.unlink(req.file.path);
    return res.status(400).json({error:'Enter a brand name.'});
  }
  if(!req.file)return res.status(400).json({error:'Choose a brand logo to upload.'});
  try{
    const brand=await Brand.create({name,logo:`/uploads/${req.file.filename}`});
    res.status(201).json(brand);
  }catch(error){
    try{await fs.promises.unlink(req.file.path)}
    catch(cleanupError){if(cleanupError.code!=='ENOENT')console.error('Could not remove rejected brand logo:',cleanupError)}
    throw error;
  }
}));
app.delete('/api/brands/:id',auth,wrap(async(req,res)=>{
  const brand=await Brand.findByIdAndDelete(req.params.id);
  if(!brand)return res.status(404).json({error:'Brand not found.'});
  const filename=brand.logo.startsWith('/uploads/')?path.basename(brand.logo):'';
  if(filename){
    try{await fs.promises.unlink(path.join(uploadsDir,filename))}
    catch(error){if(error.code!=='ENOENT')console.error('Could not remove deleted brand logo:',error)}
  }
  res.json({ok:true});
}));

app.post('/api/leads',wrap(async(req,res)=>{
  const {type='contact',name,phone,email,message,car}=req.body||{};
  if(typeof name!=='string'||!name.trim()||typeof phone!=='string'||!phone.trim()){
    return res.status(400).json({error:'Name and phone are required.'});
  }
  if(!['buy','sell','contact'].includes(type))return res.status(400).json({error:'Please choose a valid enquiry type.'});
  if(email&&typeof email==='string'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    return res.status(400).json({error:'Please enter a valid email address.'});
  }
  const lead=await Lead.create({type,name,phone,email,message,car:car||undefined});
  res.status(201).json(lead);
}));
app.get('/api/leads',auth,wrap(async(_req,res)=>{
  res.json(await Lead.find().populate('car','title').sort('-createdAt').lean());
}));
app.put('/api/leads/:id',auth,wrap(async(req,res)=>{
  const updates={};
  if(req.body.status!==undefined){
    if(!['new','contacted','visit','won','lost'].includes(req.body.status)){
      return res.status(400).json({error:'Please choose a valid CRM stage.'});
    }
    updates.status=req.body.status;
  }
  const update={$set:updates};
  if(typeof req.body.note==='string'&&req.body.note.trim()){
    update.$push={notes:{text:req.body.note.trim().slice(0,1000)}};
  }
  if(!Object.keys(updates).length&&!update.$push)return res.status(400).json({error:'No lead updates were provided.'});
  const lead=await Lead.findByIdAndUpdate(req.params.id,update,{new:true,runValidators:true}).populate('car','title');
  if(!lead)return res.status(404).json({error:'Lead not found.'});
  res.json(lead);
}));

app.get('/api/reports',auth,wrap(async(_req,res)=>{
  const group=(collection,field)=>collection.aggregate([{$group:{_id:`$${field}`,n:{$sum:1}}},{$sort:{_id:1}}]);
  const [byStatus,byType,carStatus,monthly,sold]=await Promise.all([
    group(Lead,'status'),group(Lead,'type'),group(Car,'status'),
    Lead.aggregate([{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$createdAt'}},n:{$sum:1}}},{$sort:{_id:1}}]),
    Car.aggregate([{$match:{status:'sold'}},{$group:{_id:null,total:{$sum:'$price'},n:{$sum:1}}}])
  ]);
  res.json({byStatus,byType,carStatus,monthly,sold:sold[0]||{total:0,n:0}});
}));

app.get('*',(req,res,next)=>{
  if(req.path.startsWith('/api/')||!fs.existsSync(clientIndex))return next();
  return res.sendFile(clientIndex);
});

app.use((err,_req,res,_next)=>{
  if(err instanceof multer.MulterError){
    const message=err.code==='LIMIT_FILE_SIZE'?'Each image must be 5 MB or smaller.':err.code==='LIMIT_UNEXPECTED_FILE'?'Please upload a single brand logo.':'Please upload no more than 8 car images.';
    return res.status(400).json({error:message});
  }
  if(err.code===11000)return res.status(409).json({error:'A brand with this name already exists.'});
  if(err instanceof mongoose.Error.ValidationError||err instanceof mongoose.Error.CastError){
    return res.status(400).json({error:err.message});
  }
  if(err.message==='Only JPG, PNG and WebP images are supported.')return res.status(400).json({error:err.message});
  if(err instanceof SyntaxError&&err.status===400)return res.status(400).json({error:'The request body must be valid JSON.'});
  console.error(err);
  return res.status(500).json({error:'The server could not complete this request.'});
});

const port=process.env.PORT||5000;
if(!process.env.MONGO_URI||!process.env.JWT_SECRET||!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD){
  console.error('MONGO_URI, JWT_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD must be configured before starting the API.');
  process.exit(1);
}
if(process.env.JWT_SECRET.length<32){
  console.error('JWT_SECRET must be at least 32 characters long.');
  process.exit(1);
}
mongoose.connect(process.env.MONGO_URI)
  .then(()=>app.listen(port,()=>console.log(`Elite Wheelz API listening on port ${port}`)))
  .catch(error=>{console.error('Could not connect to MongoDB:',error.message);process.exit(1)});
