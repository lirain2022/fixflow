import {useEffect,useRef,useState} from 'react';
import Modal from './Modal';
import AssetPicker from './AssetPicker';
import AssetForm from './AssetForm';
import {money} from './repairMoney';
import {STATUS_LABELS} from '../tickets/constants';

export default function UnlinkedAssetTickets({api,revision,onChanged,onOpenTicket,onOpenAsset}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[page,setPage]=useState(0),[retry,setRetry]=useState(0);
 const [query,setQuery]=useState(''),[search,setSearch]=useState('');
 const [ticket,setTicket]=useState(null),[asset,setAsset]=useState(null),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[linkError,setLinkError]=useState(''),[linked,setLinked]=useState(null);
 const sending=useRef(false);
 useEffect(()=>{const controller=new AbortController();setData(null);setError('');
  api(`/tickets/unlinked-assets?${new URLSearchParams({page:String(page),size:'5',query:search})}`,'GET',null,{signal:controller.signal})
   .then(result=>{if(!controller.signal.aborted){setData(result);if(page>0&&!result.items.length)setPage(p=>p-1);}}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
  return()=>controller.abort();
 },[api,page,search,revision,retry]);
 async function link(){
  if(!asset||!ticket||sending.current)return;sending.current=true;setBusy(true);setLinkError('');
  try{await api(`/tickets/${ticket.id}/asset`,'PATCH',{assetId:asset.id,version:ticket.version});setLinked(asset);setTicket(null);setAsset(null);setRetry(n=>n+1);onChanged();}
  catch(e){setLinkError(e.message);}finally{sending.current=false;setBusy(false);}
 }
 return <section className="ticket-panel" aria-label="未連結設備的工單與費用"><header className="panel-heading"><div><h2>未連結設備的工單與費用 <span className="count-badge">{data?.total??'—'}</span></h2><p>包含已結案工單；補連結後，費用會納入設備履歷。</p></div><button className="text-button" onClick={()=>setRetry(n=>n+1)}>更新未連結工單</button></header>
  <form className="toolbar" onSubmit={e=>{e.preventDefault();setSearch(query);setPage(0);}}><label className="search-field"><input aria-label="搜尋未連結工單" placeholder="工單編號、問題或位置" maxLength={200} value={query} onChange={e=>setQuery(e.target.value)}/></label><button className="button secondary">搜尋未連結工單</button></form>
  {linked&&<p role="status" className="success-notice">已連結至 {linked.name}。<button className="text-button" onClick={()=>onOpenAsset(linked.id)}>查看設備履歷</button></p>}
  {error?<p role="alert" className="error-notice">{error}</p>:!data?<p role="status">載入未連結工單…</p>:<>{!data.items.length?<p className="empty-state">目前沒有可查看的未連結工單。</p>:data.items.map(t=><article key={t.id} className="asset-history-row"><div><span className="ticket-number">{t.ticketNo}</span><strong>{t.title}</strong><p>{t.location} · {STATUS_LABELS[t.status]}</p><p>已登錄費用：{t.repairCostSummary?.recordedRepairs?money(t.repairCostSummary.recordedTotal):'尚未登錄'}</p>{t.repairCostSummary?.unpricedRepairs>0&&<p className="muted">另有 {t.repairCostSummary.unpricedRepairs} 次未登錄費用</p>}<div className="action-row"><button className="button secondary" onClick={()=>onOpenTicket(t.id)}>查看工單與費用</button>{t.status!=='CANCELLED'&&<button className="button primary" aria-label={`補連結設備 ${t.ticketNo}`} onClick={()=>{setTicket(t);setAsset(null);setLinkError('');}}>補連結設備</button>}</div></div></article>)}<footer className="panel-footer"><span>共 {data.total} 筆 · 第 {page+1} 頁</span><div className="pagination"><button className="text-button" disabled={!page} onClick={()=>setPage(p=>p-1)}>上一頁</button><button className="text-button" disabled={page+1>=data.totalPages} onClick={()=>setPage(p=>p+1)}>下一頁</button></div></footer></>}
  {ticket&&!creating&&<Modal title="補連結設備" onClose={()=>{if(!busy)setTicket(null);}}><div className="form-fields"><p>{ticket.ticketNo} · {ticket.title}</p><AssetPicker linking api={api} selected={asset} onSelect={setAsset} disabled={busy}/><button className="button secondary" disabled={busy} onClick={()=>setCreating(true)}>新增設備再連結</button>{linkError&&<p role="alert" className="error-notice">{linkError} 請關閉視窗並更新未連結工單後重試；已新增的設備會保留。</p>}</div><footer className="dialog-actions"><button className="button secondary" disabled={busy} onClick={()=>setTicket(null)}>取消</button><button className="button primary" disabled={busy||!asset?.enabled} onClick={link}>{busy?'連結中…':'確認連結'}</button></footer></Modal>}
  {creating&&<AssetForm api={api} onClose={()=>setCreating(false)} onDone={created=>{setCreating(false);setAsset(created);onChanged();}}/>}
 </section>;
}
