import {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowUpRight,ChevronRight,ClipboardList,Clock3,ShieldCheck} from 'lucide-react';
import Navigation from './Navigation';
import HomeSupport,{progressUrl} from './HomeSupport';
import MotionScene from './MotionScene';
import ProcessPage from './ProcessPage';
import RepairPage from './RepairPage';
import {services,ServiceGlyph} from './services';
import './style.css';
import './pages.css';
function Home(){return <main id="main-content">
 <section className="hero new-hero"><div className="noise"/><div className="heroCopy"><p className="eyebrow"><span/> ALL SYSTEMS. ONE FIX.</p><h1>壞掉的，<br/><em>我們讓它重新運作。</em></h1><p>從一台筆電到整個網路系統。讓設備的問題有地方說，維修的進度有地方看。</p><div className="heroBtns"><a className="primary" href="/repair.html">填寫報修單 <ChevronRight size={17}/></a><a className="ghost" href={progressUrl}>查詢維修進度</a></div><div className="trust"><span><ClipboardList size={14}/>線上報修</span><span><Clock3 size={14}/>進度追蹤</span><span><ShieldCheck size={14}/>維修紀錄</span></div></div><MotionScene/></section>
 <section className="section home-services" id="services"><div className="sectionHead"><div><small>01 / WHAT WE FIX</small><h2>每一種設備，<br/><strong>都有修好的可能。</strong></h2></div><p>選擇你遇到問題的設備類型，<br/>讓我們從正確的方向開始。</p></div><div className="serviceGrid">{services.map(service=><a className="service service-link" href={'/repair.html?service='+service.id} key={service.id}><ServiceGlyph service={service}/><h3>{service.title}</h3><p>{service.description}</p><span className="service-action">開始報修 <ArrowUpRight size={16}/></span></a>)}</div></section>
 <section className="home-journey"><div><p className="eyebrow">CLEAR AT EVERY STEP</p><h2>把維修，變成看得見的進度。</h2><p>報修、派工、維修、驗收、結案。從第一步到最後一步，工單陪你記錄。</p><a className="ghost" href="/process.html">查看完整維修流程 <ArrowUpRight size={16}/></a></div><div className="mini-journey" aria-label="維修流程摘要">{['提出報修','安排派工','維修處理','確認驗收','完成結案'].map((label,i)=><div key={label}><b>0{i+1}</b><span>{label}</span></div>)}</div></section>
 <HomeSupport/>
 <section className="home-cta"><div><p className="eyebrow">LET’S GET IT WORKING</p><h2>哪裡需要幫忙？</h2><p>告訴我們設備狀況，開始你的報修。</p></div><a className="primary" href="/repair.html">前往線上報修 <ArrowUpRight size={20}/></a></section>
 </main>;}
function App(){useEffect(()=>{const id=window.location.hash.slice(1);if(['fees','faq','services'].includes(id))document.getElementById(id)?.scrollIntoView({behavior:'instant'});},[]);const pathname=window.location.pathname;const page=pathname==='/process.html'?<ProcessPage/>:pathname==='/repair.html'?<RepairPage/>:<Home/>;return <><a className="public-skip-link" href="#main-content">跳到主要內容</a><Navigation/>{page}<footer className="public-footer"><a className="brand" href="/">RE:<b>FIX</b></a><p>維修有進度，生活更安心。</p><a href="/process.html">維修流程</a><a href="/#fees">費用說明</a><a href="/#faq">常見問題</a><a href="/repair.html">開始報修 ↗</a><span>© 2026 RE:FIX SERVICE SYSTEM</span></footer></>;}
createRoot(document.getElementById('root')).render(<App/>);
