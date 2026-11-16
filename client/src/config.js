export const WHATSAPP='919999999999';           // country code + number, no +
export const PHONE='+91 99999 99999';
export const ADDRESS='65/5C, Ram Nagar Bypass Road, S S Colony, Madurai, Tamil Nadu 625016';
export const MAP_LINK='https://www.google.com/maps/place/Pandyan+Cars/@9.9186384,78.0943045,858m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3b00cf76b886f31f:0x819f1dcc5a3f029a!8m2!3d9.9186384!4d78.0943045!16s%2Fg%2F1hhl10dhs?entry=ttu&g_ep=EgoyMDI2MTExMC4wIKXMDSoASAFQAw%3D%3D';
export const MAP_SRC='https://www.google.com/maps?q=9.9186384,78.0943045&output=embed';
export const SOCIAL_LINKS={facebook:'',instagram:'https://www.instagram.com/pandyan_cars/?hl=en'};
export const wa=(t,num=WHATSAPP)=>`https://wa.me/${num}?text=${encodeURIComponent(t)}`;
export const inr=n=>'₹'+Number(n||0).toLocaleString('en-IN');
