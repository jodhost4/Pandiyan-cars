import React from 'react';import {createRoot} from 'react-dom/client';
import Site from './Site.jsx';import Admin from './Admin.jsx';import './styles.css';
createRoot(document.getElementById('root')).render(location.pathname.startsWith('/admin')?<Admin/>:<Site/>);
