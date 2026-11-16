import React from 'react';import {createRoot} from 'react-dom/client';
import Site from './Site.jsx';import Admin from './Admin.jsx';import Gallery from './Gallery.jsx';import './styles.css';
const page=location.pathname.startsWith('/admin')?<Admin/>:location.pathname==='/gallery'?<Gallery/>:<Site/>;
createRoot(document.getElementById('root')).render(page);
