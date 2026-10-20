import {useEffect,useState} from 'react';
import {ArrowRight,Check,LockKeyhole} from 'lucide-react';
import {CATEGORY_LABELS,PRIORITY_LABELS} from '../tickets/constants';
import {readHandoff,saveHandoff,clearHandoff} from '../system/landingHandoff';
import {services,ServiceGlyph} from './services';
export default function RepairPage({onContinue=url=>window.location.assign(url)}){
 const service=services.find(s=>s.id===new URLSearchParams(window.location.search).get('service'));
 const [restored]=useState(readHandoff);
 const [draft,setDraft]=useState(()=>({title:'',description:'',location:'',category:service?.category||'OTHER',priority:'MEDIUM',...restored}));
 const [error,setError]=useState(''),[storageError,setStorageError]=useState('');
 const hasInput=!!(draft.title||draft.description||draft.location);
 useEffect(()=>{if(!hasInput){clearHandoff();setStorageError('');return;}try{saveHandoff(draft);setStorageError('');}catch(e){setStorageError(e.message);}},[draft,hasInput]);
 useEffect(()=>{if(!storageError||!hasInput)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[storageError,hasInput]);
 function update(key,value){setDraft(previous=>({...previous,[key]:value}));setError('');}
 function submit(e){e.preventDefault();if(!draft.title.trim()||!draft.description.trim()||!draft.location.trim()){setError('請填寫標題、問題描述與報修位置。');return;}try{onContinue(saveHandoff(draft));}catch(e){setError(e.message);}}
 return <main id="main-content" className="public-page repair-page">
  <div className="page-intro"><a className="back-home" href="/">← 返回首頁</a><p className="eyebrow">REPAIR REQUEST / 線上報修</p><h1>把問題告訴我們，<br/><em>讓修復從這裡開始。</em></h1><p>先描述設備狀況，再登入確認。送出前，你隨時可以修改資料。</p></div>
  <div className="repair-layout"><aside className="repair-aside">
   <div className="repair-orbit" aria-hidden="true"><span/><span/><span/><LockKeyhole size={34}/></div>
   <div className="report-steps" aria-label="報修步驟"><p className="active"><b>01</b> 填寫問題</p><p><b>02</b> 登入並確認</p><p><b>03</b> 送出、追蹤進度</p></div>
   {service&&!restored&&<div className="selected-service"><ServiceGlyph service={service} small/><span>你選擇的服務<strong>{service.title}</strong></span></div>}
   <div className="report-notes"><h2>準備好這些資訊，更快開始</h2><p><Check size={16}/> 發生什麼問題、從何時開始</p><p><Check size={16}/> 設備所在的樓層或位置</p><p><Check size={16}/> 是否影響日常使用</p></div>
  </aside><form className="public-report-form" onSubmit={submit}>
   <div className="form-title"><h2>報修資料</h2><span>以下欄位皆為必填</span></div>
   {restored&&<p className="report-note">已恢復本分頁尚未送出的資料，請確認後繼續。</p>}
   <label>問題標題<input required maxLength={120} value={draft.title} onChange={e=>update('title',e.target.value)} placeholder="例如：二樓辦公室 Wi-Fi 無法連線" autoComplete="off"/></label>
   <div className="report-form-row"><label>問題分類<select value={draft.category} onChange={e=>update('category',e.target.value)}>{Object.entries(CATEGORY_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>優先級<select value={draft.priority} onChange={e=>update('priority',e.target.value)}>{Object.entries(PRIORITY_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
   <label>問題描述<textarea required maxLength={4000} rows={6} value={draft.description} onChange={e=>update('description',e.target.value)} placeholder="請說明發生情況、時間，以及對使用造成的影響…"/></label>
   <span className="field-count">{draft.description.length} / 4000</span>
   <label>報修位置<input required maxLength={200} value={draft.location} onChange={e=>update('location',e.target.value)} placeholder="例如：總部 2F 辦公室" autoComplete="off"/></label>
   {(error||storageError)&&<p className="public-form-error" role="alert">{error||storageError}</p>}
   <button type="submit" className="submit">下一步：確認報修 <ArrowRight size={18}/></button>
   <p className="handoff-note">尚未登入時會先前往會員登入；確認送出後才會建立工單。</p>
  </form></div>
 </main>;
}
