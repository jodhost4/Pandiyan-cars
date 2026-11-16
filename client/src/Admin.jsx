import {useEffect,useState} from 'react';
import {wa,inr} from './config.js';

const STAGES=['new','contacted','visit','won','lost'];
const blank={title:'',brand:'',bodyType:'',color:'',year:'',price:'',km:'',fuel:'Petrol',transmission:'Manual',owners:1,description:'',status:'available'};

async function api(path,options={}){
  const headers={Authorization:`Bearer ${localStorage.getItem('token')||''}`};
  if(options.body&&!(options.body instanceof FormData))headers['Content-Type']='application/json';
  const response=await fetch(`/api${path}`,{...options,headers:{...headers,...options.headers}});
  let data;
  try{data=await response.json()}catch{throw new Error('The server could not be reached. Please try again.')}
  if(!response.ok){
    if(response.status===401){localStorage.removeItem('token');window.location.reload()}
    throw new Error(data.error||'The request could not be completed.');
  }
  return data;
}

function useLoad(loader){
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    let active=true;
    loader().then(result=>{if(active){setData(result);setError('')}}).catch(reason=>{if(active)setError(reason.message)});
    return ()=>{active=false};
  },[reload]);
  return {data,error,refresh:()=>setReload(value=>value+1),setData};
}

export default function Admin(){
  const [authed,setAuthed]=useState(Boolean(localStorage.getItem('token')));
  const [tab,setTab]=useState('cars');
  if(!authed)return <Login onLogin={()=>setAuthed(true)}/>;
  return <div className="admin"><header className="nav"><a href="/" className="admin-brand">Pandiyan Cars <span>· Owner dashboard</span></a>
    <nav>{['cars','gallery','leads','reports'].map(item=><a key={item} className={tab===item?'on':''} onClick={()=>setTab(item)}>{item==='leads'?'CRM leads':item[0].toUpperCase()+item.slice(1)}</a>)}
      <a onClick={()=>{localStorage.removeItem('token');setAuthed(false)}}>Log out</a></nav></header>
    <main className="sec">{tab==='cars'?<Cars/>:tab==='gallery'?<GalleryAdmin/>:tab==='leads'?<Leads/>:<Reports/>}</main></div>;
}

function Login({onLogin}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function submit(event){
    event.preventDefault();setError('');setBusy(true);
    try{
      const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      let data;
      try{data=await response.json()}catch{throw new Error('The server could not be reached. Please try again.')}
      if(!response.ok)throw new Error(data.error||'Unable to log in.');
      localStorage.setItem('token',data.token);onLogin();
    }catch(reason){setError(reason.message)}
    finally{setBusy(false)}
  }
  return <div className="admin-login"><a href="/" className="admin-back">← Back to Pandiyan Cars</a><form className="admin-login-card" onSubmit={submit}><span className="form-kicker">PANDIYAN CARS · OWNER ACCESS</span><h1>Welcome back.</h1><p>Sign in to manage your cars and enquiries.</p>
    <label>Email<input type="email" autoComplete="username" value={email} onChange={event=>setEmail(event.target.value)} required/></label>
    <label>Password<input type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} required/></label>
    <button className="button button-dark" disabled={busy}>{busy?'Signing in…':'Sign in'} <span aria-hidden="true">→</span></button>
    {error&&<p className="admin-error" role="alert">{error}</p>}</form></div>;
}

function Cars(){
  const {data:cars,error,refresh}=useLoad(()=>api('/cars?all=1'));
  const [form,setForm]=useState(blank);
  const [files,setFiles]=useState([]);
  const [filePreviews,setFilePreviews]=useState([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const set=key=>event=>setForm(current=>({...current,[key]:event.target.value}));
  useEffect(()=>{
    const previews=files.map(file=>URL.createObjectURL(file));
    setFilePreviews(previews);
    return ()=>previews.forEach(preview=>URL.revokeObjectURL(preview));
  },[files]);
  function edit(car){setForm({...blank,...car});setFiles([]);setMessage('');window.scrollTo({top:0,behavior:'smooth'})}
  function reset(){setForm(blank);setFiles([]);setMessage('')}
  async function save(event){
    event.preventDefault();setBusy(true);setMessage('');
    try{
      const body=new FormData();
      Object.entries(form).forEach(([key,value])=>body.append(key,value));
      files.forEach(file=>body.append('images',file));
      await api(form._id?`/cars/${form._id}`:'/cars',{method:form._id?'PUT':'POST',body});
      reset();setMessage('Car details saved.');refresh();
    }catch(reason){setMessage(reason.message)}
    finally{setBusy(false)}
  }
  async function changeStatus(car){
    try{const body=new FormData();body.append('status',car.status==='sold'?'available':'sold');await api(`/cars/${car._id}`,{method:'PUT',body});refresh()}
    catch(reason){setMessage(reason.message)}
  }
  async function remove(car){
    if(!window.confirm(`Delete ${car.title}? This cannot be undone.`))return;
    try{await api(`/cars/${car._id}`,{method:'DELETE'});refresh()}
    catch(reason){setMessage(reason.message)}
  }
  return <><div className="admin-page-heading"><div><span className="form-kicker">YOUR INVENTORY</span><h1>Cars</h1><p>Add a new car or update the cars on your website.</p></div><a className="button button-outline" href="/" target="_blank" rel="noreferrer">View website ↗</a></div>
    <form className="admin-editor" onSubmit={save}><h2>{form._id?'Edit car details':'Add a car'}</h2>
      <div className="admin-form-grid">
        <label>Car title<input placeholder="e.g. Maruti Swift VXi" value={form.title} onChange={set('title')} required maxLength="120"/></label>
        <label>Brand<input placeholder="Maruti Suzuki" value={form.brand||''} onChange={set('brand')}/></label>
        <label>Body type<input placeholder="e.g. SUV, hatchback, sedan" value={form.bodyType||''} onChange={set('bodyType')} maxLength="40"/></label>
        <label>Color<input placeholder="e.g. White, Silver" value={form.color||''} onChange={set('color')} maxLength="40"/></label>
        <label>Year<input type="number" min="1950" max="2100" placeholder="2022" value={form.year} onChange={set('year')} required/></label>
        <label>Price (₹)<input type="number" min="0" placeholder="650000" value={form.price} onChange={set('price')} required/></label>
        <label>Kilometres<input type="number" min="0" placeholder="25000" value={form.km} onChange={set('km')} required/></label>
        <label>Previous owners<input type="number" min="1" value={form.owners} onChange={set('owners')}/></label>
        <label>Fuel<select value={form.fuel} onChange={set('fuel')}>{['Petrol','Diesel','CNG','Electric'].map(item=><option key={item}>{item}</option>)}</select></label>
        <label>Transmission<select value={form.transmission} onChange={set('transmission')}><option>Manual</option><option>Automatic</option></select></label>
        <label>Listing status<select value={form.status||'available'} onChange={set('status')}><option value="available">Available</option><option value="sold">Sold</option></select></label>
        <label className="admin-full">Description<textarea rows="3" maxLength="2000" placeholder="What makes this car a good choice?" value={form.description||''} onChange={set('description')}/></label>
        <label className="admin-full">Car photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>{const selected=[...event.target.files];setFiles(selected.slice(0,8));setMessage(selected.length>8?'Only the first 8 photos were selected.':'')}}/><span className="admin-help">{files.length?`${files.length} new photo${files.length===1?'':'s'} selected. Saving replaces the current photos.`:'Add up to 8 JPG, PNG or WebP photos, 5 MB each. Select photos together with the car details to publish them as one listing.'}</span></label>
        {(filePreviews.length>0||(!files.length&&form.images?.length>0))&&<div className="admin-photo-previews admin-full" aria-label={files.length?'Selected car photo previews':'Current car photos'}>
          {(filePreviews.length?filePreviews:form.images).map((src,index)=><img key={`${src}-${index}`} src={src} alt={`Car photo ${index+1} preview`}/>)}
        </div>}
      </div>
      <div className="admin-actions"><button className="button button-dark" disabled={busy}>{busy?'Saving…':form._id?'Save changes':'Add car'} <span aria-hidden="true">→</span></button>{form._id&&<button type="button" className="button button-outline" onClick={reset}>Cancel edit</button>}{message&&<span className="admin-feedback" role="status">{message}</span>}</div>
    </form>
    <div className="admin-section-heading"><h2>All cars</h2><span>{cars?.length||0} listings</span></div>
    {error&&<p className="admin-error" role="alert">{error}</p>}
    {cars?.length===0&&<p className="admin-empty">No cars have been added yet. Add your first listing above.</p>}
    <div className="grid">{(cars||[]).map(car=><article className="card" key={car._id}><img src={car.images?.[0]||'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=70'} alt={car.title}/><div className="body"><span className={`admin-status ${car.status==='sold'?'sold':''}`}>{car.status}</span><h3>{car.title}</h3><div className="price">{inr(car.price)}</div><p className="meta">{car.year} · {Number(car.km||0).toLocaleString('en-IN')} km · {car.fuel}</p><div className="row"><button className="btn sm" onClick={()=>edit(car)}>Edit</button><button className="btn sm ghost" onClick={()=>changeStatus(car)}>{car.status==='sold'?'Mark available':'Mark sold'}</button><button className="btn sm ghost" onClick={()=>remove(car)}>Delete</button></div></div></article>)}</div>
  </>;
}

function GalleryAdmin(){
  const {data:photos,error,refresh}=useLoad(()=>api('/gallery'));
  const [files,setFiles]=useState([]);
  const [previews,setPreviews]=useState([]);
  const [caption,setCaption]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    const urls=files.map(file=>URL.createObjectURL(file));
    setPreviews(urls);
    return ()=>urls.forEach(url=>URL.revokeObjectURL(url));
  },[files]);
  function choosePhotos(event){
    const selected=[...event.target.files];
    setFiles(selected.slice(0,8));
    setMessage(selected.length>8?'Only the first 8 photos were selected.':'');
  }
  async function uploadPhotos(event){
    event.preventDefault();
    if(!files.length){setMessage('Choose at least one photo to upload.');return}
    const form=event.currentTarget;
    setBusy(true);setMessage('');
    try{
      const body=new FormData();
      files.forEach(file=>body.append('images',file));
      body.append('caption',caption);
      await api('/gallery',{method:'POST',body});
      setFiles([]);setCaption('');form.reset();
      setMessage('Gallery photos uploaded.');
      refresh();
    }catch(reason){setMessage(reason.message)}
    finally{setBusy(false)}
  }
  async function removePhoto(photo){
    if(!window.confirm('Delete this gallery photo? This cannot be undone.'))return;
    setMessage('');
    try{await api(`/gallery/${photo._id}`,{method:'DELETE'});setMessage('Gallery photo deleted.');refresh()}
    catch(reason){setMessage(reason.message)}
  }
  return <>
    <div className="admin-page-heading"><div><span className="form-kicker">PHOTO COLLECTION</span><h1>Gallery</h1><p>Upload photos for the public gallery. Only signed-in owners can manage these photos.</p></div><a className="button button-outline" href="/gallery" target="_blank" rel="noreferrer">View gallery ↗</a></div>
    <form className="admin-editor gallery-upload-form" onSubmit={uploadPhotos}>
      <h2>Upload gallery photos</h2>
      <div className="admin-form-grid">
        <label className="admin-full">Photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple required onChange={choosePhotos}/><span className="admin-help">{files.length?`${files.length} photo${files.length===1?'':'s'} selected.`:'Choose up to 8 JPG, PNG or WebP images, up to 5 MB each.'}</span></label>
        <label className="admin-full">Caption <span className="admin-help">(optional; applies to all selected photos)</span><input value={caption} onChange={event=>setCaption(event.target.value)} maxLength="120" placeholder="e.g. A day with the Pandiyan Cars team"/></label>
        {previews.length>0&&<div className="admin-photo-previews admin-full">{previews.map((src,index)=><img key={src} src={src} alt={`Selected gallery photo ${index+1}`}/>)}</div>}
      </div>
      <div className="admin-actions"><button className="button button-dark" disabled={busy||!files.length}>{busy?'Uploading…':'Upload photos'} <span aria-hidden="true">↑</span></button>{message&&<span className="admin-feedback" role="status">{message}</span>}</div>
    </form>
    <div className="admin-section-heading"><h2>Published photos</h2><span>{photos?.length||0} photos</span></div>
    {error&&<p className="admin-error" role="alert">{error}</p>}
    {photos?.length===0&&<p className="admin-empty">No gallery photos yet. Upload your first photos above.</p>}
    {photos?.length>0&&<div className="admin-gallery-grid">{photos.map(photo=><article className="admin-gallery-card" key={photo._id}><img src={photo.image} alt={photo.caption||'Gallery photo'}/><div><p>{photo.caption||'No caption'}</p><button className="btn sm ghost" onClick={()=>removePhoto(photo)}>Delete photo</button></div></article>)}</div>}
  </>;
}

function Leads(){
  const {data:leads,error,refresh}=useLoad(()=>api('/leads'));
  const [filter,setFilter]=useState('');
  const [notes,setNotes]=useState({});
  const [message,setMessage]=useState('');
  async function update(id,changes){
    try{await api(`/leads/${id}`,{method:'PUT',body:JSON.stringify(changes)});setMessage('CRM update saved.');refresh()}
    catch(reason){setMessage(reason.message)}
  }
  const visible=(leads||[]).filter(lead=>!filter||lead.status===filter);
  return <><div className="admin-page-heading"><div><span className="form-kicker">CUSTOMER RELATIONSHIPS</span><h1>Enquiries</h1><p>Every buyer and seller enquiry, together in one place.</p></div><label className="admin-filter">Filter by stage<select value={filter} onChange={event=>setFilter(event.target.value)}><option value="">All stages</option>{STAGES.map(stage=><option key={stage}>{stage}</option>)}</select></label></div>
    {error&&<p className="admin-error" role="alert">{error}</p>}{message&&<p className="admin-feedback" role="status">{message}</p>}
    {!error&&!visible.length&&<p className="admin-empty">No enquiries here yet. New website submissions will appear on this page.</p>}
    {visible.map(lead=><article className="lead" key={lead._id}><div className="lead-main"><div className="lead-title"><h2>{lead.name}</h2><span className="tag">{lead.type}</span></div><div className="lead-contact"><a href={`tel:${lead.phone}`}>{lead.phone}</a>{lead.email&&<a href={`mailto:${lead.email}`}>{lead.email}</a>}</div><p className="meta">{new Date(lead.createdAt).toLocaleString('en-IN')}{lead.car&&` · ${lead.car.title}`}</p>{lead.message&&<p className="lead-message">{lead.message}</p>}
      {(lead.notes||[]).map((note,index)=><p className="admin-note" key={index}><b>Follow-up note</b> {note.text} <span>{new Date(note.at).toLocaleDateString('en-IN')}</span></p>)}
      <form className="lead-note-form" onSubmit={event=>{event.preventDefault();if(notes[lead._id]?.trim())update(lead._id,{note:notes[lead._id]});setNotes(current=>({...current,[lead._id]:''}))}}><input aria-label={`Add note for ${lead.name}`} placeholder="Add a follow-up note" value={notes[lead._id]||''} onChange={event=>setNotes(current=>({...current,[lead._id]:event.target.value}))}/><button className="btn sm">Save note</button></form></div>
      <div className="lead-actions"><label>Stage<select value={lead.status} onChange={event=>update(lead._id,{status:event.target.value})}>{STAGES.map(stage=><option key={stage}>{stage}</option>)}</select></label><a className="btn sm wa" target="_blank" rel="noreferrer" href={wa(`Hi ${lead.name}, this is Pandiyan Cars regarding your enquiry.`,'91'+lead.phone.replace(/\D/g,'').slice(-10))}>WhatsApp</a><a className="btn sm ghost" href={`tel:${lead.phone}`}>Call</a></div>
    </article>)}</>;
}

function Bars({title,data}){
  const max=Math.max(1,...data.map(item=>item.n));
  if(!data.length)return <div className="rep"><h3>{title}</h3><p className="admin-help">No data to show yet.</p></div>;
  return <div className="rep"><h3>{title}</h3>{data.map(item=><div className="bar" key={item._id}><span>{item._id}</span><i style={{width:`${item.n/max*100}%`}}/><b>{item.n}</b></div>)}</div>;
}

function Reports(){
  const {data:report,error}=useLoad(()=>api('/reports'));
  if(error)return <p className="admin-error" role="alert">{error}</p>;
  if(!report)return <p className="admin-empty">Loading reports…</p>;
  const won=report.byStatus.find(item=>item._id==='won')?.n||0;
  const total=report.byStatus.reduce((sum,item)=>sum+item.n,0);
  return <><div className="admin-page-heading"><div><span className="form-kicker">A CLEARER PICTURE</span><h1>Reports</h1><p>Lead activity and current vehicle inventory at a glance.</p></div></div>
    <div className="stats"><div><b>{total}</b>Total leads</div><div><b>{total?Math.round(won/total*100):0}%</b>Lead-to-sale rate</div><div><b>{report.sold.n}</b>Cars sold</div><div><b>{inr(report.sold.total)}</b>Listed value sold</div></div>
    <div className="grid"><Bars title="Leads by stage" data={report.byStatus}/><Bars title="Leads by enquiry type" data={report.byType}/><Bars title="Enquiries by month" data={report.monthly}/><Bars title="Inventory by status" data={report.carStatus}/></div>
  </>;
}
