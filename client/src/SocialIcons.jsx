const platforms=[
  {name:'Facebook',path:<path d="M13.5 8H11V6.4c0-.7.4-.9.9-.9h1.5V3.1L11.3 3C9 3 8 4.4 8 6.1V8H6v2.7h2V17h3v-6.3h2.1L13.5 8Z"/>},
  {name:'Instagram',path:<><rect x="3.5" y="3.5" width="13" height="13" rx="3.5"/><circle cx="10" cy="10" r="3.2"/><circle cx="14.3" cy="5.9" r=".8" fill="currentColor" stroke="none"/></>},
];

export default function SocialIcons(){
  return <div className="social-links">
    <span className="social-label">Follow us</span>
    <div className="social-icons">
      {platforms.map(platform=><span className="social-icon" role="img" aria-label={platform.name} title={platform.name} key={platform.name}>
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">{platform.path}</svg>
      </span>)}
    </div>
  </div>;
}
