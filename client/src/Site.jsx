import {useEffect,useState} from 'react';
import {wa,inr,PHONE,ADDRESS,MAP_SRC,MAP_LINK,SOCIAL_LINKS} from './config.js';

async function request(path,options){
  const response=await fetch(path,options);
  let data;
  try{data=await response.json()}catch{throw new Error('The server could not be reached. Please try again.')}
  if(!response.ok)throw new Error(data.error||'Something went wrong. Please try again.');
  return data;
}

function LeadForm({type,car,placeholder,buttonLabel}){
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  async function submit(event){
    event.preventDefault();
    const form=event.currentTarget;
    const data=Object.fromEntries(new FormData(form));
    const enquiryMessage=type==='sell'
      ?[
        `Car model: ${data.carModel}`,
        `Car color: ${data.carColor}`,
        `Kilometres driven: ${data.kilometres} km`,
        `Expected price: ₹${Number(data.expectedPrice).toLocaleString('en-IN')}`,
        `Ownership: ${data.ownership}`,
        data.additionalDetails?`Additional details: ${data.additionalDetails}`:''
      ].filter(Boolean).join('\n')
      :data.message;
    setBusy(true);
    setMessage('');
    try{
      await request('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,message:enquiryMessage,type,car:car?._id})});
      form.reset();
      setMessage('Thanks! The Pandiyan Cars team will be in touch shortly.');
    }catch(error){setMessage(error.message)}
    finally{setBusy(false)}
  }
  return <form className="form" onSubmit={submit}>
    <div className="form-pair">
      <label>Your name<input name="name" autoComplete="name" placeholder="e.g. Arjun Kumar" required maxLength="80"/></label>
      <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" required maxLength="20"/></label>
    </div>
    <label>Email <span className="optional">(optional)</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength="254"/></label>
    {type==='sell'?<div className="seller-car-fields">
      <label>Car model<input name="carModel" placeholder="e.g. Honda City VX" required maxLength="120"/></label>
      <label>Car color<input name="carColor" placeholder="e.g. Pearl white" required maxLength="40"/></label>
      <label>Kilometres driven<input name="kilometres" type="number" min="0" placeholder="e.g. 45000" required/></label>
      <label>Expected price (₹)<input name="expectedPrice" type="number" min="0" placeholder="e.g. 650000" required/></label>
      <label>Ownership<select name="ownership" defaultValue="" required><option value="" disabled>Select ownership</option><option>1st owner</option><option>2nd owner</option><option>3rd owner</option><option>4 or more owners</option></select></label>
      <label className="seller-notes">Anything else about your car? <span className="optional">(optional)</span><textarea name="additionalDetails" rows="2" placeholder={placeholder} maxLength="500"/></label>
    </div>:<label>How can we help?<textarea name="message" rows="3" placeholder={placeholder} maxLength="1000"/></label>}
    <button className="button button-dark" type="submit" disabled={busy}>{busy?'Sending…':buttonLabel}<span aria-hidden="true">↗</span></button>
    {message&&<p className="form-message" role="status">{message}</p>}
  </form>;
}

function SectionLabel({children,number}){return <div className="section-label"><span>{number}</span><span>{children}</span></div>}

export default function Site(){
  const [cars,setCars]=useState([]);
  const [filters,setFilters]=useState({model:'',make:'',bodyType:'',priceMin:'',priceMax:'',fuel:'',transmission:'',color:'',owners:'',kmMin:'',kmMax:'',yearMin:'',yearMax:''});
  const [error,setError]=useState('');
  const [selectedCar,setSelectedCar]=useState(null);
  const [featuredIndex,setFeaturedIndex]=useState(0);
  const [menuOpen,setMenuOpen]=useState(false);
  const [heroMake,setHeroMake]=useState('');
  const [heroBodyType,setHeroBodyType]=useState('');
  const [heroBudget,setHeroBudget]=useState('');

  useEffect(()=>{
    let active=true;
    request('/api/cars')
      .then(data=>{if(active){setCars(data);setError('')}})
      .catch(()=>{if(active)setError('We couldn’t load the car listings. Please try again in a moment.')});
    return ()=>{active=false};
  },[]);

  useEffect(()=>{
    if(cars.length<2)return undefined;
    const timer=setInterval(()=>setFeaturedIndex(index=>(index+1)%cars.length),4500);
    return ()=>clearInterval(timer);
  },[cars.length]);

  function moveFeatured(step){setFeaturedIndex(index=>(index+step+cars.length)%cars.length)}
  function setFilter(field,value){setFilters(current=>({...current,[field]:value}))}
  function clearFilters(){setFilters({model:'',make:'',bodyType:'',priceMin:'',priceMax:'',fuel:'',transmission:'',color:'',owners:'',kmMin:'',kmMax:'',yearMin:'',yearMax:''})}
  function searchFromHero(event){
    event.preventDefault();
    const budgets={
      '0-500000':['','500000'],
      '500000-1000000':['500000','1000000'],
      '1000000-2000000':['1000000','2000000'],
      '2000000+':['2000000','']
    };
    const [priceMin,priceMax]=budgets[heroBudget]||['',''];
    setFilters(current=>({...current,make:heroMake,bodyType:heroBodyType,priceMin,priceMax}));
    document.getElementById('buy')?.scrollIntoView({behavior:'smooth'});
  }
  const optionsFor=field=>[...new Set(cars.map(car=>car[field]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const filteredCars=cars.filter(car=>{
    const modelMatches=!filters.model||car.title?.toLowerCase().includes(filters.model.trim().toLowerCase());
    const makeMatches=!filters.make||car.brand===filters.make;
    const bodyMatches=!filters.bodyType||car.bodyType===filters.bodyType;
    const colorMatches=!filters.color||car.color===filters.color;
    const fuelMatches=!filters.fuel||car.fuel===filters.fuel;
    const transmissionMatches=!filters.transmission||car.transmission===filters.transmission;
    const ownersMatches=!filters.owners||(filters.owners==='4+'?Number(car.owners)>=4:Number(car.owners)===Number(filters.owners));
    const within=(value,min,max)=>(!min||Number(value)>=Number(min))&&(!max||Number(value)<=Number(max));
    return modelMatches&&makeMatches&&bodyMatches&&colorMatches&&fuelMatches&&transmissionMatches&&ownersMatches&&
      within(car.price,filters.priceMin,filters.priceMax)&&within(car.km,filters.kmMin,filters.kmMax)&&within(car.year,filters.yearMin,filters.yearMax);
  });

  return <>
    <header className="site-nav">
      <a href="#top" className="brand" aria-label="Pandiyan Cars home"><span className="brand-mark">P<span>.</span></span><span>Pandiyan<span className="brand-sub">PRE-OWNED CARS · MADURAI</span></span></a>
      <button className="menu-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>☰</button>
      <nav className={menuOpen?'nav-links open':'nav-links'} aria-label="Main navigation">
        <a href="#buy" onClick={()=>setMenuOpen(false)}>Buy cars</a><a href="/gallery" onClick={()=>setMenuOpen(false)}>Gallery</a><a href="#sell" onClick={()=>setMenuOpen(false)}>Sell your car</a>
        <a href="#about" onClick={()=>setMenuOpen(false)}>Our story</a><a href="#contact" onClick={()=>setMenuOpen(false)}>Contact</a>
        <a className="button button-dark nav-cta" href={wa('Hi Pandiyan Cars, I would like to enquire about a car.')} target="_blank" rel="noreferrer" onClick={()=>setMenuOpen(false)}>Talk to us <span aria-hidden="true">↗</span></a>
      </nav>
    </header>

    <main id="top">
      <section className="hero">
        <img className="hero-photo" src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2200&q=85" alt="A well-kept car ready for its next owner"/>
        <div className="hero-shade"/>
        <div className="hero-ribbon" aria-hidden="true"/>
        <div className="hero-content">
          <div className="eyebrow eyebrow-light"><span className="eyebrow-dot"/>PRE-OWNED CARS · MADURAI</div>
          <h1>Find the car<br/>that feels like<br/><em>your next chapter.</em></h1>
          <p>Good cars, chosen with care. Explore a considered collection of pre-owned cars, ready for the road ahead.</p>
          <div className="hero-actions"><a className="button button-lime" href="#buy">Explore our cars <span aria-hidden="true">↗</span></a><a className="text-link light-link" href="#sell">I want to sell my car <span aria-hidden="true">→</span></a></div>
        </div>
        {cars.length>0&&<aside className="hero-feature" aria-label="Pandiyan picks">
          <span className="feature-kicker">A PANDIYAN PICK <span aria-hidden="true">✳</span></span>
          <div className="feature-viewport" aria-live="polite">
            <div className="feature-track" style={{transform:`translateX(-${featuredIndex*100}%)`}}>
              {cars.map((car,index)=><article className="hero-feature-slide" key={car._id} aria-label={`${index+1} of ${cars.length}`}>
                <img src={car.images?.[0]||'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80'} alt={car.title}/>
                <div className="feature-details"><div><span>{car.brand||'PRE-OWNED · CHECKED'}</span><h2>{car.title}</h2><p>{car.year} · {Number(car.km||0).toLocaleString('en-IN')} km</p></div><strong>{inr(car.price)}</strong></div>
                <button type="button" className="feature-link" onClick={()=>setSelectedCar(car)}>Discover this car <span aria-hidden="true">↗</span></button>
              </article>)}
            </div>
          </div>
          {cars.length>1&&<div className="feature-controls" aria-label="Choose a Pandiyan pick">
            <button type="button" aria-label="Previous featured car" onClick={()=>moveFeatured(-1)}>←</button>
            <span>{String(featuredIndex+1).padStart(2,'0')} / {String(cars.length).padStart(2,'0')}</span>
            <button type="button" aria-label="Next featured car" onClick={()=>moveFeatured(1)}>→</button>
          </div>}
        </aside>}
        <form className="hero-search" onSubmit={searchFromHero}>
          <div className="hero-search-heading"><span>START YOUR SEARCH</span><strong>Find your next car</strong></div>
          <label><span>MAKE</span><select value={heroMake} onChange={event=>setHeroMake(event.target.value)}><option value="">All makes</option>{optionsFor('brand').map(item=><option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>BODY TYPE</span><select value={heroBodyType} onChange={event=>setHeroBodyType(event.target.value)}><option value="">Any body type</option>{optionsFor('bodyType').map(item=><option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>YOUR BUDGET</span><select value={heroBudget} onChange={event=>setHeroBudget(event.target.value)}><option value="">Any budget</option><option value="0-500000">Under ₹5 lakh</option><option value="500000-1000000">₹5–10 lakh</option><option value="1000000-2000000">₹10–20 lakh</option><option value="2000000+">₹20 lakh+</option></select></label>
          <button type="submit" className="hero-search-submit">Find a car <span aria-hidden="true">↗</span></button>
        </form>
        <div className="hero-index">CAREFULLY CHOSEN <span>·</span> THOROUGHLY CHECKED</div>
      </section>

      <section id="buy" className="section inventory-section">
        <div className="section-top"><SectionLabel number="01">THE LINE-UP</SectionLabel><span className="inventory-count">{filteredCars.length.toString().padStart(2,'0')} of {cars.length} cars</span></div>
        <div className="section-heading-row"><div><h2>Find your <em>perfect car.</em></h2><p className="section-intro">Narrow down the line-up to find the right fit.</p></div><a className="text-link desktop-link" href={wa('Hi Pandiyan Cars, I am looking for a car that is not listed on your website.')}>Can’t find what you’re after? <span aria-hidden="true">→</span></a></div>
        <div className="car-finder" aria-label="Find your perfect car">
          <div className="car-filters">
            <label>Model<input value={filters.model} onChange={event=>setFilter('model',event.target.value)} placeholder="Search model"/></label>
            <label>Make<select value={filters.make} onChange={event=>setFilter('make',event.target.value)}><option value="">All makes</option>{optionsFor('brand').map(item=><option key={item} value={item}>{item}</option>)}</select></label>
            <label>Body type<select value={filters.bodyType} onChange={event=>setFilter('bodyType',event.target.value)}><option value="">All body types</option>{optionsFor('bodyType').map(item=><option key={item} value={item}>{item}</option>)}</select></label>
            <fieldset className="filter-range"><legend>Price range (₹)</legend><div><label><span className="sr-only">Minimum price</span><input type="number" min="0" placeholder="Min" value={filters.priceMin} onChange={event=>setFilter('priceMin',event.target.value)}/></label><span aria-hidden="true">–</span><label><span className="sr-only">Maximum price</span><input type="number" min="0" placeholder="Max" value={filters.priceMax} onChange={event=>setFilter('priceMax',event.target.value)}/></label></div></fieldset>
            <label>Fuel type<select value={filters.fuel} onChange={event=>setFilter('fuel',event.target.value)}><option value="">All fuel types</option>{['Petrol','Diesel','CNG','Electric'].map(item=><option key={item}>{item}</option>)}</select></label>
            <label>Transmission<select value={filters.transmission} onChange={event=>setFilter('transmission',event.target.value)}><option value="">Any transmission</option>{['Manual','Automatic'].map(item=><option key={item}>{item}</option>)}</select></label>
            <label>Color<select value={filters.color} onChange={event=>setFilter('color',event.target.value)}><option value="">All colors</option>{optionsFor('color').map(item=><option key={item} value={item}>{item}</option>)}</select></label>
            <label>Ownership<select value={filters.owners} onChange={event=>setFilter('owners',event.target.value)}><option value="">Any number of owners</option><option value="1">1st owner</option><option value="2">2nd owner</option><option value="3">3rd owner</option><option value="4+">4+ owners</option></select></label>
            <fieldset className="filter-range"><legend>Distance driven (km)</legend><div><label><span className="sr-only">Minimum kilometres</span><input type="number" min="0" placeholder="Min" value={filters.kmMin} onChange={event=>setFilter('kmMin',event.target.value)}/></label><span aria-hidden="true">–</span><label><span className="sr-only">Maximum kilometres</span><input type="number" min="0" placeholder="Max" value={filters.kmMax} onChange={event=>setFilter('kmMax',event.target.value)}/></label></div></fieldset>
            <fieldset className="filter-range"><legend>Make year</legend><div><label><span className="sr-only">Year from</span><input type="number" min="1950" max="2100" placeholder="From" value={filters.yearMin} onChange={event=>setFilter('yearMin',event.target.value)}/></label><span aria-hidden="true">–</span><label><span className="sr-only">Year to</span><input type="number" min="1950" max="2100" placeholder="To" value={filters.yearMax} onChange={event=>setFilter('yearMax',event.target.value)}/></label></div></fieldset>
          </div>
          <button type="button" className="filter-reset" onClick={clearFilters}>Clear filters <span aria-hidden="true">×</span></button>
        </div>
        {error&&<p className="empty-state" role="alert">{error}</p>}
        {!error&&!cars.length&&<div className="empty-state"><span className="empty-mark">✳</span><h3>No cars in the line-up just yet.</h3><p>We’re always finding the next good one. Send us a message and we’ll help you look.</p><a className="text-link" href={wa('Hi Pandiyan Cars, I am looking for a car.')}>Ask us on WhatsApp <span aria-hidden="true">↗</span></a></div>}
        {!error&&cars.length>0&&!filteredCars.length&&<div className="empty-state"><span className="empty-mark">✳</span><h3>No cars match those filters.</h3><p>Try adjusting your search or clearing the filters.</p><button className="button button-outline" onClick={clearFilters}>Clear filters</button></div>}
        <div className="car-grid">{filteredCars.map((car,index)=><article className="car-card" key={car._id}>
          <div className="car-image-wrap"><img className="car-image" src={car.images?.[0]||'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=75'} alt={car.title} loading="lazy"/><span className="car-number">{String(index+1).padStart(2,'0')}</span><span className="car-image-label">CHECKED &amp; READY</span></div>
          <div className="car-details"><div className="car-title-row"><div><span className="car-make">{car.brand||'PANDIYAN PICK'}</span><h3>{car.title}</h3></div><strong className="car-price">{inr(car.price)}</strong></div>
            <div className="car-specs"><span>{car.year}</span><span>{Number(car.km||0).toLocaleString('en-IN')} km</span><span>{car.fuel}</span><span>{car.transmission}</span>{car.bodyType&&<span>{car.bodyType}</span>}{car.color&&<span>{car.color}</span>}{car.owners&&<span>{car.owners} owner{Number(car.owners)===1?'':'s'}</span>}</div>
            <div className="car-actions"><button className="button button-outline" onClick={()=>setSelectedCar(car)}>Ask about this car <span aria-hidden="true">↗</span></button><a className="whatsapp-link" target="_blank" rel="noreferrer" href={wa(`Hi Pandiyan Cars, I'm interested in the ${car.title} (${car.year}) listed for ${inr(car.price)}.`)}>WhatsApp us</a></div>
          </div>
        </article>)}</div>
        <div className="mobile-enquire"><a className="text-link" href={wa('Hi Pandiyan Cars, I am looking for a car that is not listed on your website.')}>Looking for something else? Tell us <span aria-hidden="true">→</span></a></div>
      </section>

      <section id="sell" className="sell-section">
        <div className="sell-copy"><SectionLabel number="02">YOUR CAR’S NEXT CHAPTER</SectionLabel><h2>Ready to pass<br/>the keys <em>on?</em></h2><p>We’ll give your car a fair look, a straight answer and a no-pressure offer. You bring the car; we’ll take it from here.</p><div className="sell-points"><span><b>01</b> Tell us about your car</span><span><b>02</b> We’ll arrange an inspection</span><span><b>03</b> Get a fair, clear offer</span></div><div className="sell-car-visual" aria-hidden="true"><img src="/images/sell-car.png" alt=""/></div></div>
        <div className="sell-form-panel"><div className="form-heading"><span className="form-kicker">SELL WITH US</span><h3>Let’s get started.</h3><p>Share a few details. We’ll take it from there.</p></div><LeadForm type="sell" placeholder="Make, model, year, kilometres and expected price" buttonLabel="Get my car valued"/></div>
      </section>

      <section id="about" className="story-section">
        <div className="story-image"><img src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80" alt="A scenic open road at golden hour" loading="lazy"/><span>MADURAI, OUR HOME.</span></div>
        <div className="story-copy"><SectionLabel number="03">A LITTLE ABOUT US</SectionLabel><h2>Cars are easy.<br/><em>Trust is personal.</em></h2><p>At Pandiyan Cars, we believe buying a pre-owned car should feel exciting, not uncertain. We’re a local team that takes the time to check the details, share what we know and help you find a car that fits your life.</p><p>No big promises. No pressure. Just good cars and a good conversation.</p><a className="text-link" href="#contact">Come say hello <span aria-hidden="true">→</span></a><div className="signature">Good journeys start here<span>— Pandiyan Cars</span></div></div>
      </section>

      <section className="reviews-section" aria-labelledby="reviews-title">
        <div><SectionLabel number="04">KIND WORDS, GOOGLE VERIFIED</SectionLabel><h2 id="reviews-title">Reviews from our <em>community.</em></h2><p>See what customers are saying about Pandiyan Cars on Google.</p></div>
        <a className="button button-dark" href={MAP_LINK} target="_blank" rel="noreferrer">Read our Google reviews <span aria-hidden="true">↗</span></a>
      </section>

      <section id="contact" className="contact-section"><div className="contact-header"><SectionLabel number="05">FIND YOUR WAY TO US</SectionLabel><h2>We’re right <em>here.</em></h2></div><div className="contact-grid"><div className="contact-details"><span className="contact-label">COME BY</span><p>{ADDRESS}</p><a className="text-link" href={MAP_LINK} target="_blank" rel="noreferrer">Get directions <span aria-hidden="true">↗</span></a><div className="contact-rule"/><span className="contact-label">GIVE US A CALL</span><a className="contact-phone" href={`tel:${PHONE.replace(/\s/g,'')}`}>{PHONE}</a><span className="contact-hours">Here to help with your next good drive.</span><a className="button button-dark" href={wa('Hi Pandiyan Cars, I would like to get in touch.')}>Chat on WhatsApp <span aria-hidden="true">↗</span></a></div><iframe title="Pandiyan Cars location on Google Maps" src={MAP_SRC} loading="lazy" className="map" referrerPolicy="no-referrer-when-downgrade"/></div></section>
    </main>

    <footer className="site-footer"><a href="#top" className="brand footer-brand"><span className="brand-mark">P<span>.</span></span><span>Pandiyan<span className="brand-sub">PRE-OWNED CARS · MADURAI</span></span></a><span className="footer-line">GOOD CARS. GOOD PEOPLE. GOOD TO GO.</span><span className="footer-right">© {new Date().getFullYear()} Pandiyan Cars</span><div className="social-links">{SOCIAL_LINKS.facebook&&<a href={SOCIAL_LINKS.facebook} target="_blank" rel="noreferrer" aria-label="Pandiyan Cars on Facebook">Facebook ↗</a>}{SOCIAL_LINKS.instagram&&<a href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer" aria-label="Pandiyan Cars on Instagram">Instagram ↗</a>}</div><span className="developer-credit">Developed by <strong>JOD Tech IT Solution</strong></span></footer>

    {selectedCar&&<div className="dialog-backdrop" onClick={()=>setSelectedCar(null)}><div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="enquiry-title" onClick={event=>event.stopPropagation()}><button className="dialog-close" aria-label="Close enquiry form" onClick={()=>setSelectedCar(null)}>×</button><span className="form-kicker">A GOOD CHOICE</span><h2 id="enquiry-title">Ask us about<br/><em>{selectedCar.title}</em></h2><p>{selectedCar.year} · {inr(selectedCar.price)}</p><LeadForm type="buy" car={selectedCar} placeholder="Ask us a question or request a test drive" buttonLabel="Send my enquiry"/></div></div>}
  </>;
}
