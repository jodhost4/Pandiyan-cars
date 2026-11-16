export const WHATSAPP='919999999999';           // country code + number, no +
export const PHONE='+91 99999 99999';
export const ADDRESS='Pandiyan Cars, Avinashi Road, Coimbatore, Tamil Nadu';
// Google Maps → Share → Embed a map → copy the src URL
export const MAP_SRC='https://www.google.com/maps?q=Avinashi+Road+Coimbatore&output=embed';
export const wa=(t,num=WHATSAPP)=>`https://wa.me/${num}?text=${encodeURIComponent(t)}`;
export const inr=n=>'₹'+Number(n||0).toLocaleString('en-IN');
