import {clearHandoff} from '../system/landingHandoff';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,ChevronDown,Menu,X} from 'lucide-react';
import {request} from '../system/api';import {readSession,saveSession} from '../member/memberSession';
import {services,ServiceGlyph} from './services';
export default function Navigation(){
 const [member,setMember]=useState(null);
 useEffect(()=>{let live=true;async function check(){const token=readSession();if(!token){if(live)setMember(null);return;}try{const u=await request('/users/me','GET',null,token);if(live)setMember(u.role==='ADMIN'?null:u);}catch{if(live)setMember(null);}}check();window.addEventListener('member-session',check);return()=>{live=false;window.removeEventListener('member-session',check);};},[]);
 const [open,setOpen]=useState(false),[mobile,setMobile]=useState(false);
 const root=useRef(null),trigger=useRef(null),mobileTrigger=useRef(null);
 useEffect(()=>{
  function outside(e){if(!root.current?.contains(e.target)){setOpen(false);setMobile(false);}}
  function escape(e){if(e.key==='Escape'){if(open){setOpen(false);trigger.current?.focus();}else if(mobile){setMobile(false);mobileTrigger.current?.focus();}}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[open,mobile]);
 const current=window.location.pathname;
 return <header className="site-header" ref={root} onBlur={e=>{if(e.relatedTarget&&!root.current?.contains(e.relatedTarget)){setOpen(false);setMobile(false);}}}>
  <nav aria-label="網站導覽" className="site-nav">
   <a className="brand" href="/" aria-label="RE:FIX 首頁">RE:<b>FIX</b></a>
   <button className="mobile-nav-toggle" ref={mobileTrigger} aria-expanded={mobile} aria-controls="public-navigation" aria-label={mobile?'關閉導覽':'開啟導覽'} onClick={()=>{setMobile(!mobile);setOpen(false);}}>{mobile?<X size={20}/>:<Menu size={20}/>}</button>
   <div id="public-navigation" className={`public-links ${mobile?'mobile-open':''}`}>
    <button className={`services-trigger ${open?'is-open':''}`} ref={trigger} aria-expanded={open} aria-controls="service-dropdown" onClick={()=>setOpen(!open)}>服務項目 <ChevronDown size={15}/></button>
    <a href="/process.html" aria-current={current==='/process.html'?'page':undefined}>維修流程</a>
    <a href="/repair.html" aria-current={current==='/repair.html'?'page':undefined}>線上報修</a>
   </div>
   <div className="login-actions">{member?<><span className="member-nav-user" title={member.name}>{member.name}</span><a className="navcta" href="/member.html">會員中心 <ArrowUpRight size={15}/></a><button className="admin-entry" onClick={()=>{saveSession(null);clearHandoff();window.dispatchEvent(new Event('member-session'));location.assign('/');}}>登出</button></>:<><a className="admin-entry" href="/system.html?portal=admin">管理員登入</a><a className="navcta" href="/member.html?screen=login">會員登入 <ArrowUpRight size={15}/></a></>}</div>
  </nav>
  <div id="service-dropdown" className="service-dropdown" hidden={!open}>
   <div className="dropdown-heading"><span>你想修好什麼？</span><small>選擇設備，開始報修</small></div>
   <div className="dropdown-grid">{services.map(service=><a key={service.id} className="dropdown-service" href={`/repair.html?service=${service.id}`}><ServiceGlyph service={service} small/><span><strong>{service.title}</strong><small>{service.description}</small></span><ArrowUpRight size={16}/></a>)}</div>
  </div>
 </header>;
}
