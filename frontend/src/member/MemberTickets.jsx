import {useEffect,useState} from 'react';
import {STATUS_LABELS} from '../tickets/constants';
import {nextStep} from './MemberTicketDetail';

export default function MemberTickets({api,onOpen,filters,onFiltersChange}){
 const {page,status,query,search}=filters;
 const [data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let live=true;
  setData(null);setError('');
  const params=new URLSearchParams({page,size:10,status:status==='ACTIVE'?'':status,query:search});
  if(status==='ACTIVE')params.set('active','true');
  api('/member/tickets?'+params,'GET',null,{signal:controller.signal}).then(result=>{
   if(!live)return;
   const lastPage=Math.max(0,result.totalPages-1);
   if(page>lastPage){onFiltersChange(current=>({...current,page:lastPage}));return;}
   setData(result);
  }).catch(e=>{if(live&&e.name!=='AbortError')setError(e.message);});
  return()=>{live=false;controller.abort();};
 },[api,page,status,search,revision,onFiltersChange]);
 const change=values=>onFiltersChange(current=>({...current,...values}));
 const filtered=!!(status||query||search);
 return <section className="member-panel">
  <h2>我的報修</h2>
  <form className="member-filters" onSubmit={e=>{e.preventDefault();change({search:query,page:0});}}>
   <input aria-label="搜尋我的工單" value={query} onChange={e=>change({query:e.target.value})} maxLength={200} placeholder="搜尋編號、問題或位置"/>
   <select aria-label="工單狀態" value={status} onChange={e=>change({status:e.target.value,page:0})}>
    <option value="">所有狀態</option><option value="ACTIVE">處理中（全部）</option>
    {Object.entries(STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}
   </select>
   <button>搜尋</button>
   {filtered&&<button type="button" onClick={()=>onFiltersChange({page:0,status:'',query:'',search:''})}>清除篩選</button>}
  </form>
  {error?<p role="alert">{error} <button onClick={()=>setRevision(r=>r+1)}>重試</button></p>:!data?<p role="status">載入工單中…</p>:<>
   {!data.items.length?<p className="member-muted">目前沒有符合條件的報修工單。</p>:data.items.map(ticket=><button className="member-ticket" key={ticket.id} onClick={()=>onOpen(ticket.id)}>
    <div className="member-row"><small>{ticket.ticketNo}</small><span className="member-badge">{STATUS_LABELS[ticket.status]}</span></div>
    <h3>{ticket.title}</h3><p>{ticket.location}</p><span>{nextStep[ticket.status]}</span><strong>查看進度 →</strong>
   </button>)}
   <div className="member-row"><span role="status">共 {data.total} 筆 · 第 {page+1} 頁</span><div>
    <button disabled={!page} onClick={()=>change({page:page-1})}>上一頁</button>
    <button disabled={page+1>=data.totalPages} onClick={()=>change({page:page+1})}>下一頁</button>
   </div></div>
  </>}
 </section>;
}
