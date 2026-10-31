import {useState,useEffect,useRef} from 'react';
import {CATEGORY_LABELS,PRIORITY_LABELS} from '../tickets/constants';
import {readHandoff,saveHandoff,clearHandoff} from '../system/landingHandoff';

export default function MemberReport({api,onDone,onCancel,onReview,initialCategory='OTHER'}){
 const [draft,setDraft]=useState(()=>({title:'',description:'',location:'',category:initialCategory,priority:'MEDIUM',partRequests:[],...readHandoff()}));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[storageError,setStorageError]=useState('');
 const lock=useRef(false),finished=useRef(false);
 const uncertain=draft.submissionState==='uncertain';
 useEffect(()=>{if(finished.current)return;try{saveHandoff(draft);setStorageError('');}catch(e){setStorageError(e.message);}},[draft]);
 useEffect(()=>{if(!busy&&!storageError)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[busy,storageError]);
 const change=(key,value)=>setDraft(d=>({...d,[key]:value}));
 const changePart=(index,key,value)=>setDraft(d=>({...d,partRequests:d.partRequests.map((part,i)=>i===index?{...part,[key]:value}:part)}));
 async function submit(e){
  e.preventDefault();if(lock.current||uncertain)return;
  const {title,description,location,category,priority}=draft;
  if(!title.trim()||!description.trim()||!location.trim()){setError('請填寫問題標題、描述與報修位置。');return;}
  const partRequests=draft.partRequests.map(p=>({...p,quantity:Number(p.quantity)}));
  for(const part of partRequests){
   if(!part.name.trim()||!part.purpose.trim()||!Number.isInteger(part.quantity)||part.quantity<1||part.quantity>99){setError('請填寫零件名稱、用途與規格，數量為 1–99。');return;}
   if(part.referenceUrl.trim()){try{const url=new URL(part.referenceUrl.trim());if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error();}catch{setError('請填寫有效的 HTTP 或 HTTPS 參考連結。');return;}}
  }
  lock.current=true;setBusy(true);setError('');
  // Persist uncertainty before sending so a reload cannot silently repeat a POST.
  const pending={...draft,submissionState:'uncertain',submissionReviewRequested:false};setDraft(pending);
  try{saveHandoff(pending);}catch(e){setStorageError(e.message);}
  try{
   const ticket=await api('/member/tickets','POST',{title,description,location,category,priority,partRequests});
   finished.current=true;clearHandoff();onDone(ticket);
  }catch(e){
   setError(e.message);
   if(e.status&&e.status<500){const editable={...draft,submissionState:undefined};setDraft(editable);try{saveHandoff(editable);}catch{}}
  }finally{setBusy(false);lock.current=false;}
 }
 function cancel(){if(confirm('取消這次報修並清除表單？')){finished.current=true;clearHandoff();onCancel();}}
 function review(){const checked={...draft,submissionReviewRequested:true};try{saveHandoff(checked);setDraft(checked);onReview();}catch(e){setError(e.message);}}
 function resume(){if(confirm('已確認「我的報修」沒有這張工單？恢復編輯後可再送出，請勿重複建立。')){const editable={...draft,submissionState:undefined,submissionReviewRequested:false};try{saveHandoff(editable);setDraft(editable);setError('');}catch(e){setError(e.message);}}}
 return <section className="member-panel member-report">
  <header className="member-report-heading"><p className="eyebrow">REPAIR REQUEST</p><h1>新增報修</h1><p>填寫設備問題，需要的零件也可以一起提出。</p></header>
  <form className="member-form" onSubmit={submit}>
   <fieldset disabled={busy||uncertain} className="member-report-fields"><legend>報修資料</legend>
    <label>問題標題<input required maxLength={120} value={draft.title} onChange={e=>change('title',e.target.value)} placeholder="例如：筆電無法開機"/></label>
    <div className="member-columns"><label>問題分類<select value={draft.category} onChange={e=>change('category',e.target.value)}>{Object.entries(CATEGORY_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>優先級<select value={draft.priority} onChange={e=>change('priority',e.target.value)}>{Object.entries(PRIORITY_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
    <label>問題描述<textarea required maxLength={4000} rows={4} value={draft.description} onChange={e=>change('description',e.target.value)} placeholder="請描述發生的情況與時間"/></label>
    <label>報修位置<input required maxLength={200} value={draft.location} onChange={e=>change('location',e.target.value)} placeholder="例如：台北辦公室 2F"/></label>
   </fieldset>
   <section className="member-report-parts" aria-label="選填零件需求"><div className="member-row"><h2>零件需求 <small>選填</small></h2><span className="member-muted">{draft.partRequests.length} / 10 項</span></div>
    <p className="member-muted">想更換或加裝的零件可一起送出，實際規格與費用由處理人員確認。</p>
    {draft.partRequests.map((part,i)=><fieldset key={i} disabled={busy||uncertain} className="member-report-fields member-part-input"><legend>零件需求 {i+1}</legend>
     <div className="member-columns"><label>零件名稱<input required maxLength={120} value={part.name} onChange={e=>changePart(i,'name',e.target.value)} placeholder="例如：SSD 1TB"/></label><label>數量<input type="number" min={1} max={99} step={1} required value={part.quantity} onChange={e=>changePart(i,'quantity',e.target.value)}/></label></div>
     <label>用途與規格<textarea required maxLength={2000} rows={2} value={part.purpose} onChange={e=>changePart(i,'purpose',e.target.value)}/></label>
     <label>參考連結（選填）<input type="url" maxLength={1000} value={part.referenceUrl} onChange={e=>changePart(i,'referenceUrl',e.target.value)} placeholder="https://…"/></label>
     <button type="button" className="member-remove-part" aria-label={'移除零件需求 '+(i+1)} onClick={()=>change('partRequests',draft.partRequests.filter((_,index)=>index!==i))}>移除此項</button>
    </fieldset>)}
    <button type="button" disabled={busy||uncertain||draft.partRequests.length>=10} onClick={()=>change('partRequests',[...draft.partRequests,{name:'',quantity:1,purpose:'',referenceUrl:''}])}>加入零件需求</button>
   </section>
   {storageError&&<p role="alert">{storageError}</p>}{error&&<p role="alert">{error}</p>}
   {uncertain&&!busy&&<div role="status"><p>送出結果尚未確認，請先查看我的報修，避免重複建立工單。</p><button type="button" onClick={review}>查看我的報修</button>{draft.submissionReviewRequested&&<button type="button" onClick={resume}>確認未建立，繼續編輯</button>}</div>}
   <footer className="member-report-actions"><button type="button" disabled={busy} onClick={cancel}>取消</button><button className="primary" disabled={busy||uncertain}>{busy?'送出中…':'送出報修'}</button></footer>
  </form>
 </section>;
}
