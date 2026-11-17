import {useEffect,useState} from 'react';
import SocialIcons from './SocialIcons.jsx';

async function request(path){
  const response=await fetch(path);
  let data;
  try{data=await response.json()}catch{throw new Error('The server could not be reached. Please try again.')};
  if(!response.ok)throw new Error(data.error||'The gallery could not be loaded.');
  return data;
}

export default function Gallery(){
  const [photos,setPhotos]=useState([]);
  const [error,setError]=useState('');

  useEffect(()=>{
    let active=true;
    request('/api/gallery')
      .then(data=>{if(active){setPhotos(data);setError('')}})
      .catch(reason=>{if(active)setError(reason.message)});
    return ()=>{active=false};
  },[]);

  useEffect(()=>{
    const elements=document.querySelectorAll('.gallery-intro .eyebrow, .gallery-intro h1, .gallery-intro p, .gallery-count, .gallery-empty h2, .gallery-empty p, .gallery-photo, .gallery-photo figcaption, .gallery-footer > *');
    if(!('IntersectionObserver' in window)){
      elements.forEach(element=>element.classList.add('is-visible'));
      return undefined;
    }
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },{threshold:.12,rootMargin:'0px 0px -35px 0px'});
    elements.forEach((element,index)=>{
      element.style.setProperty('--reveal-delay',`${(index%4)*75}ms`);
      element.classList.add('scroll-reveal');
      observer.observe(element);
    });
    return ()=>observer.disconnect();
  },[photos.length,error]);

  return <div className="gallery-page">
    <header className="site-nav gallery-nav">
      <a href="/" className="brand" aria-label="Elite Wheelz home"><img className="brand-logo" src="/images/elite-wheelz-logo.png" alt=""/><span>Elite Wheelz<span className="brand-sub">PRE-OWNED CARS · MADURAI</span></span></a>
      <nav className="nav-links" aria-label="Main navigation">
        <a href="/">Home</a><a href="/#buy">Buy cars</a><a href="/#sell">Sell your car</a>
      </nav>
    </header>
    <main>
      <section className="gallery-intro">
        <span className="eyebrow">A CLOSER LOOK AT THE JOURNEY</span>
        <h1>Life in the<br/><em>driver’s seat.</em></h1>
        <p>Cars, people and moments from Elite Wheelz. Every photograph is shared by our team.</p>
        <span className="gallery-count">{photos.length.toString().padStart(2,'0')} PHOTOS</span>
      </section>
      {error&&<p className="empty-state" role="alert">{error}</p>}
      {!error&&!photos.length&&<div className="empty-state gallery-empty"><span className="empty-mark">✳</span><h2>Our gallery is getting ready.</h2><p>Check back soon for moments from Elite Wheelz.</p></div>}
      {photos.length>0&&<section className="gallery-grid" aria-label="Photo gallery">
        {photos.map((photo,index)=><figure className="gallery-photo" key={photo._id}>
          <img src={photo.image} alt={photo.caption||`Elite Wheelz gallery photo ${index+1}`} loading="lazy"/>
          {photo.caption&&<figcaption>{photo.caption}</figcaption>}
        </figure>)}
      </section>}
    </main>
    <footer className="gallery-footer"><a href="/">← Back to Elite Wheelz</a><SocialIcons/><span>GOOD CARS. GOOD PEOPLE.</span><span className="developer-credit">Developed by <strong>JOD Tech IT Solution</strong></span></footer>
  </div>;
}
