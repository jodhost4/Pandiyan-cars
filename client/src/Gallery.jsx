import {useEffect,useState} from 'react';
import {SOCIAL_LINKS} from './config.js';

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

  return <div className="gallery-page">
    <header className="site-nav gallery-nav">
      <a href="/" className="brand" aria-label="Pandiyan Cars home"><span className="brand-mark">P<span>.</span></span><span>Pandiyan<span className="brand-sub">PRE-OWNED CARS · MADURAI</span></span></a>
      <nav className="nav-links" aria-label="Main navigation">
        <a href="/">Home</a><a href="/#buy">Buy cars</a><a href="/#sell">Sell your car</a>
      </nav>
    </header>
    <main>
      <section className="gallery-intro">
        <span className="eyebrow">A CLOSER LOOK AT THE JOURNEY</span>
        <h1>Life in the<br/><em>driver’s seat.</em></h1>
        <p>Cars, people and moments from Pandiyan Cars. Every photograph is shared by our team.</p>
        <span className="gallery-count">{photos.length.toString().padStart(2,'0')} PHOTOS</span>
      </section>
      {error&&<p className="empty-state" role="alert">{error}</p>}
      {!error&&!photos.length&&<div className="empty-state gallery-empty"><span className="empty-mark">✳</span><h2>Our gallery is getting ready.</h2><p>Check back soon for moments from Pandiyan Cars.</p></div>}
      {photos.length>0&&<section className="gallery-grid" aria-label="Photo gallery">
        {photos.map((photo,index)=><figure className="gallery-photo" key={photo._id}>
          <img src={photo.image} alt={photo.caption||`Pandiyan Cars gallery photo ${index+1}`} loading="lazy"/>
          {photo.caption&&<figcaption>{photo.caption}</figcaption>}
        </figure>)}
      </section>}
    </main>
    <footer className="gallery-footer"><a href="/">← Back to Pandiyan Cars</a><div>{SOCIAL_LINKS.facebook&&<a href={SOCIAL_LINKS.facebook} target="_blank" rel="noreferrer">Facebook ↗</a>}{SOCIAL_LINKS.instagram&&<a href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer">Instagram ↗</a>}</div><span>GOOD CARS. GOOD PEOPLE.</span><span className="developer-credit">Developed by <strong>JOD Tech IT Solution</strong></span></footer>
  </div>;
}
