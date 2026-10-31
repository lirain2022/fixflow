import {useEffect,useRef,useState} from 'react';
import './quotes.css';
const STATUS={PENDING:'待確認',ACCEPTED:'已同意',CHANGES_REQUESTED:'待重新報價'};
const money=value=>'NT$ '+Number(value).toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2});
function cents(value){if(!/^\d{1,10}(\.\d{1,2})?$/.test(value))return null;const [whole,fraction='']=value.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'));}
function QuoteContent({quote}){return <><dl className="quote-amounts"><div><dt>預估人工費</dt><dd>{money(quote.laborCost)}</dd></div><div><dt>預估零件費</dt><dd>{money(quote.partsCost)}</dd></div><div><dt>預估合計</dt><dd>{money(quote.total)}</dd></div></dl><p className="quote-text">{quote.description}</p>{quote.response&&<p className="quote-response">{quote.response}</p>}<p className="quote-meta">報價 #{quote.id} · {new Date(quote.createdAt).toLocaleString('zh-TW')}{quote.respondedAt&&<> · {STATUS[quote.status]}於 {new Date(quote.respondedAt).toLocaleString('zh-TW')}</>}</p></>;}
export default function TicketQuotes({ticketId,ticketStatus,api,admin=false,onUpdated=()=>{}}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[revision,setRevision]=useState(0);
 const [composing,setComposing]=useState(false),[question,setQuestion]=useState(false),[message,setMessage]=useState('');
 const [form,setForm]=useState({laborCost:'0',partsCost:'0',description:'',previousQuoteId:null});
 const panel=useRef(null),lock=useRef(false),knownId=useRef(null);
 const base=(admin?'/tickets/':'/member/tickets/')+ticketId+'/quotes';
 useEffect(()=>{let live=true;setBusy(true);api(base).then(d=>{if(!live)return;const latestId=d?.latest?.id||null;if(knownId.current!==latestId)setComposing(false);knownId.current=latestId;setData(d);setUncertain(false);setError('');}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setBusy(false);});return()=>{live=false;};},[base,api,revision,ticketStatus]);
 const latest=data?.latest,history=Array.isArray(data?.history)?data.history:[];
 const pending=!!latest&&latest.status==='PENDING'&&data.active;
 useEffect(()=>{if(!admin&&pending&&panel.current)panel.current.open=true;},[admin,pending,latest?.id]);
 function openForm(){setForm({laborCost:latest?.laborCost||'0',partsCost:latest?.partsCost||'0',description:latest?.description||'',previousQuoteId:latest?.id||null});setComposing(true);if(panel.current)panel.current.open=true;}
 async function send(path,body){
  if(lock.current||busy||uncertain)return;lock.current=true;setBusy(true);setError('');
  try{const result=await api(path,'POST',body);setData(result);knownId.current=result.latest?.id||null;setComposing(false);setQuestion(false);setMessage('');Promise.resolve(onUpdated()).catch(()=>{});}
  catch(e){setError(e.message);if(!e.status||e.status>=500||e.status===409)setUncertain(true);if(panel.current)panel.current.open=true;}
  finally{lock.current=false;setBusy(false);}
 }
 function submit(e){e.preventDefault();if(cents(form.laborCost)===null||cents(form.partsCost)===null||!form.description.trim()){setError('請填寫報價說明，費用為非負數且最多兩位小數。');return;}send(base,form);}
 const total=cents(form.laborCost)!==null&&cents(form.partsCost)!==null?money((cents(form.laborCost)+cents(form.partsCost))/100):'請確認金額';
 return <section className="quote-section" aria-label="維修報價確認">
  {error&&<p role="alert" className="quote-error">{error}{uncertain&&'，請先重新載入確認送出結果。'} <button type="button" disabled={busy} onClick={()=>setRevision(v=>v+1)}>重新載入報價</button></p>}
  <details ref={panel} className="quote-panel">
   <summary><span>維修報價</span><span className="quote-summary">{latest?`${STATUS[latest.status]} · ${money(latest.total)}`:busy?'讀取中…':'尚未提供'}</span></summary>
   <div className="quote-body">
    {latest?<QuoteContent quote={latest}/>:<p>尚未提供維修報價。</p>}
    <p className="quote-meta">預估報價與實際維修費用分開記錄；同意報價不會付款。</p>
    {!admin&&pending&&<div className="quote-actions"><button className="primary" disabled={busy||uncertain} onClick={()=>{if(confirm(`同意此報價 ${money(latest.total)}，並安排維修？`))send(base+'/respond',{quoteId:latest.id,version:latest.version,decision:'ACCEPTED',message:''});}}>同意此報價</button><button disabled={busy||uncertain} onClick={()=>setQuestion(v=>!v)}>對報價有疑問</button></div>}
    {!admin&&question&&pending&&<form className="quote-form" onSubmit={e=>{e.preventDefault();if(!message.trim()){setError('請填寫報價問題。');return;}send(base+'/respond',{quoteId:latest.id,version:latest.version,decision:'CHANGES_REQUESTED',message});}}><label>報價問題<textarea required maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)}/></label><button disabled={busy||uncertain}>送出問題</button></form>}
    {latest?.status==='CHANGES_REQUESTED'&&!admin&&<p>已通知管理員，請等候重新報價。</p>}
    {admin&&data?.active&&data?.eligible&&!composing&&<button disabled={busy||uncertain} onClick={openForm}>{latest?'重新報價':'建立報價'}</button>}
    {admin&&data&&!data.eligible&&<p className="quote-meta">此工單沒有可確認報價的會員。</p>}
    {admin&&composing&&data?.active&&<form className="quote-form" onSubmit={submit}><label>預估人工費（NT$）<input type="number" min="0" max="9999999999.99" step="0.01" required value={form.laborCost} onChange={e=>setForm(f=>({...f,laborCost:e.target.value}))}/></label><label>預估零件費（NT$）<input type="number" min="0" max="9999999999.99" step="0.01" required value={form.partsCost} onChange={e=>setForm(f=>({...f,partsCost:e.target.value}))}/></label><label>報價說明<textarea required maxLength={2000} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="維修範圍、零件規格與包含項目"/></label><strong>預估合計 {total}</strong>{latest&&<p className="quote-meta">新版送出後需會員重新確認，舊版會保留。</p>}<div className="quote-actions"><button className="primary" disabled={busy||uncertain}>{busy?'送出中…':'送出報價'}</button><button type="button" disabled={busy} onClick={()=>setComposing(false)}>取消編輯</button></div></form>}
    {history.length>1&&<details className="quote-history"><summary>歷次報價（{history.length-1}）</summary>{history.slice(1).map(q=><article key={q.id}><strong>{STATUS[q.status]}（舊版）</strong><QuoteContent quote={q}/></article>)}</details>}
   </div>
  </details>
 </section>;
}
