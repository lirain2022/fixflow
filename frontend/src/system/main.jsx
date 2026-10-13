import React from 'react';
import {createRoot} from 'react-dom/client';
import SystemApp from './SystemApp';
import '../styles.css';
import './system.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><SystemApp/></React.StrictMode>);
