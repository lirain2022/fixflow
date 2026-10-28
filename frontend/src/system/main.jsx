import React from 'react';
import {createRoot} from 'react-dom/client';
import SystemApp from './SystemApp';
import '../styles.css';
import './system.css';
const query=new URLSearchParams(location.search);
if(query.get('portal')!=='admin'){location.replace(query.get('action')==='new'?'/member.html?next=report':query.get('view')==='tickets'?'/member.html?next=tickets':'/member.html?screen=login');}else createRoot(document.getElementById('root')).render(<React.StrictMode><SystemApp/></React.StrictMode>);
