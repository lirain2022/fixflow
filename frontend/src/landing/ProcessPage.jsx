import {useEffect,useRef,useState} from 'react';
import {ClipboardList,Users,Wrench,ClipboardCheck,CheckCheck,ArrowUpRight} from 'lucide-react';
const steps=[
 {title:'提出報修',status:'待派工',Icon:ClipboardList,text:'填寫問題與設備位置，登入後確認送出。工單建立後，可以補上照片或留言，讓狀況更清楚。',hint:'你要做的：描述問題、確認資料'},
 {title:'安排處理人員',status:'已派工',Icon:Users,text:'工單會記錄負責的處理人員。後續進度、溝通與維修紀錄，都集中在同一張工單。',hint:'你可以查看：負責人與最新動態'},
 {title:'檢查與維修',status:'維修中',Icon:Wrench,text:'開始處理後，工單會更新為維修中。維修內容、工時與費用由處理人員依實際情況記錄。',hint:'你可以查看：處理進度與維修紀錄'},
 {title:'確認修復結果',status:'待驗收',Icon:ClipboardCheck,text:'維修完成後，請確認設備是否恢復正常，並查看維修內容與已登錄費用。若仍有問題，可在工單提出重修。',hint:'你要做的：檢查設備、確認結果'},
 {title:'驗收與結案',status:'已結案',Icon:CheckCheck,text:'確認修復結果後完成結案。工單、費用與歷次維修紀錄會保留下來，方便日後查詢。',hint:'你可以查看：完整維修歷程'},
];
export default function ProcessPage(){
 const [active,setActive]=useState(0);const items=useRef([]);
 useEffect(()=>{if(!window.IntersectionObserver)return;const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)setActive(Number(e.target.dataset.step));},{rootMargin:'-15% 0px -40% 0px',threshold:.15});items.current.forEach(el=>el&&observer.observe(el));return()=>observer.disconnect();},[]);
 return <main id="main-content" className="public-page process-page"><div className="page-intro"><a className="back-home" href="/">← 返回首頁</a><p className="eyebrow">HOW IT WORKS / 維修流程</p><h1>從故障到恢復，<br/><em>每一步，都有進度。</em></h1><p>不需要猜測接下來會發生什麼。從提出問題到確認結案，所有處理都記錄在工單裡。</p></div>
 <div className="journey-layout"><aside className="journey-guide"><div className="journey-orb" aria-hidden="true"><span/><Wrench size={38}/></div><p className="eyebrow">YOUR REPAIR JOURNEY</p><h2>五個階段，<br/>一次看懂。</h2><p>這是流程介紹；實際工單進度請登入會員後查看。</p><a className="primary" href="/repair.html">開始線上報修 <ArrowUpRight size={17}/></a></aside><ol className="journey-steps">{steps.map((step,i)=><li key={step.title} data-step={i} ref={el=>{items.current[i]=el;}} className={i<=active?'lit':''}><span className="journey-node">0{i+1}</span><div className="journey-card"><header><step.Icon size={24}/><span>{step.status}</span></header><h2>{step.title}</h2><p>{step.text}</p><small>{step.hint}</small></div></li>)}</ol></div>
 <section className="journey-cta"><div><h2>準備開始了嗎？</h2><p>先填寫問題，確認後再送出。</p></div><a className="primary" href="/repair.html">填寫報修單 <ArrowUpRight size={18}/></a></section></main>;
}
