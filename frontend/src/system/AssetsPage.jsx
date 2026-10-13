import UnlinkedAssetTickets from './UnlinkedAssetTickets';
import {useEffect,useState} from 'react';
import AssetForm from './AssetForm';
import AssetMaintenanceSummary from './AssetMaintenanceSummary';
import TicketDetail,{time} from './TicketDetail';
import TicketForm from './TicketForm';
import {CATEGORY_LABELS,STATUS_LABELS} from '../tickets/constants';

const ASSET_STATUS={ACTIVE:'無未結案報修',MAINTENANCE:'有未結案報修',RETIRED:'已停用'};
function AssetMeta({asset,compact=false}){
  return <dl className="asset-meta"><div><dt>位置</dt><dd>{asset.location}</dd></div><div><dt>分類</dt><dd>{CATEGORY_LABELS[asset.category]}</dd></div>{!compact&&<><div><dt>型號</dt><dd>{asset.model||'未填寫'}</dd></div><div><dt>保固到期</dt><dd>{asset.warrantyUntil||'未填寫'}</dd></div></>}</dl>;
}
function AssetHistory({id,api,user,revision,onEdit,onOpenTicket,onReport}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[page,setPage]=useState(0),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setData(null);setError('');
    Promise.all([api(`/assets/${id}`,'GET',null,{signal:controller.signal}),api(`/assets/${id}/tickets?page=${page}&size=10`,'GET',null,{signal:controller.signal})])
      .then(([asset,history])=>{if(!controller.signal.aborted){setData({asset,history});if(page>0&&!history.items.length)setPage(p=>p-1);}}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
    return()=>controller.abort();
  },[id,api,page,revision,retry]);
  if(error)return <p className="error-notice" role="alert">{error} <button className="text-button" onClick={()=>setRetry(n=>n+1)}>重新載入履歷</button></p>;
  if(!data)return <p role="status">載入設備履歷中…</p>;
  return <><section className="ticket-panel asset-overview"><div className="asset-card-heading"><div><p className="ticket-number">{data.asset.code}</p><h2>{data.asset.name}</h2></div><span className={`asset-state asset-${data.asset.status}`}>{ASSET_STATUS[data.asset.status]}</span></div><AssetMeta asset={data.asset}/><div className="action-row asset-overview-actions">{data.asset.enabled&&<button className="button primary" onClick={()=>onReport(data.asset)}>此設備報修</button>}{<button className="button secondary" onClick={()=>onEdit(data.asset)}>編輯設備</button>}</div></section>
    <section className="ticket-panel asset-history"><header className="panel-heading"><div><h2>相關工單 <span className="count-badge">{data.history.total}</span></h2><p>{user.role==='ADMIN'?'此設備的所有關聯工單。':'只顯示你有權限查看的關聯工單。'}</p></div><button className="text-button" onClick={()=>setRetry(n=>n+1)}>更新履歷</button></header>
      {!data.history.items.length?<div className="empty-state"><h3>目前沒有可查看的關聯工單</h3><p>{data.asset.status==='MAINTENANCE'?'此設備有其他人處理的工單，目前帳號無查看權限。':'可直接按「此設備報修」建立工單。'}</p></div>:data.history.items.map(t=><article className="asset-history-row" key={t.id}><div><span className="ticket-number">{t.ticketNo}</span><button className="ticket-link" onClick={()=>onOpenTicket(t.id)}>{t.title}</button><p className="asset-fault-description">{t.description}</p><p className="muted">負責人：{t.assignedTo?.name||'尚未指派'} · {time(t.createdAt)}</p></div><span className={`status-tag status-${t.status}`}>{STATUS_LABELS[t.status]}</span></article>)}
      <footer className="panel-footer"><span>共 {data.history.total} 筆 · 第 {page+1} 頁</span><div className="pagination"><button className="text-button" disabled={!page} onClick={()=>setPage(p=>p-1)}>上一頁</button><button className="text-button" disabled={page+1>=data.history.totalPages} onClick={()=>setPage(p=>p+1)}>下一頁</button></div></footer>
    </section><AssetMaintenanceSummary summary={data.history.maintenanceSummary} user={user}/></>;
}
export default function AssetsPage({api,user}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(0),[revision,setRevision]=useState(0);
  const [view,setView]=useState('assets');
  const [reportAsset,setReportAsset]=useState(null);
  const [editing,setEditing]=useState(null),[selected,setSelected]=useState(null),[ticketId,setTicketId]=useState(null),[ticketEditor,setTicketEditor]=useState(null),[success,setSuccess]=useState('');
  useEffect(()=>{
    if(selected)return;
    const controller=new AbortController();setData(null);setError('');
    const params=new URLSearchParams({query:search,page:String(page),size:'12'});
    api(`/assets?${params}`,'GET',null,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted){setData(result);if(page>0&&!result.items.length)setPage(p=>p-1);}}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
    return()=>controller.abort();
  },[api,search,page,revision,selected]);
  return <><header className="page-heading"><div><h1>{selected?'設備維修履歷':'設備管理'}</h1></div>{selected?<button className="button secondary" onClick={()=>{setSelected(null);setSuccess('');}}>返回設備列表</button>:<button className="button primary create-button" onClick={()=>setEditing({})}>新增設備</button>}</header>
    {!selected&&<div className="section-switcher" role="group" aria-label="設備檢視"><button className="button" aria-pressed={view==='assets'} onClick={()=>setView('assets')}>設備列表</button><button className="button" aria-pressed={view==='unlinked'} onClick={()=>setView('unlinked')}>未連結工單與費用</button></div>}{success&&<p className="success-notice" role="status">{success}</p>}
    {selected?<AssetHistory key={selected} id={selected} api={api} user={user} revision={revision} onEdit={setEditing} onOpenTicket={setTicketId} onReport={setReportAsset}/>:<>
      <div hidden={view!=='unlinked'}><UnlinkedAssetTickets api={api} revision={revision} onChanged={()=>setRevision(n=>n+1)} onOpenTicket={setTicketId} onOpenAsset={setSelected}/></div><div hidden={view!=='assets'}><section className="ticket-panel asset-list"><form className="toolbar asset-search" onSubmit={e=>{e.preventDefault();setSearch(query);setPage(0);}}><div className="search-field"><input aria-label="搜尋設備資料" value={query} maxLength={200} onChange={e=>setQuery(e.target.value)} placeholder="搜尋設備編號、名稱或位置…"/></div><button className="button secondary">搜尋設備</button><button type="button" className="text-button" onClick={()=>{setQuery('');setSearch('');setPage(0);setRevision(n=>n+1);}}>清除搜尋</button><button type="button" className="text-button" onClick={()=>setRevision(n=>n+1)}>重新整理設備</button></form></section>
      {error?<p role="alert" className="error-notice">{error}</p>:!data?<p role="status">載入設備中…</p>:<><div className="asset-grid">{data.items.map(asset=><article className="ticket-panel asset-card" key={asset.id}><div className="asset-card-heading"><div><p className="ticket-number">{asset.code}</p><h2>{asset.name}</h2></div><span className={`asset-state asset-${asset.status}`}>{ASSET_STATUS[asset.status]}</span></div><AssetMeta asset={asset} compact/><div className="action-row">{asset.enabled&&<button className="button primary" onClick={()=>setReportAsset(asset)}>此設備報修</button>}<button className="button secondary" onClick={()=>{setSelected(asset.id);setSuccess('');}}>維修紀錄</button>{<button className="text-button" onClick={()=>setEditing(asset)}>編輯設備</button>}</div></article>)}</div>{!data.items.length&&<div className="empty-state"><h3>沒有符合條件的設備</h3><p>{search?'請調整搜尋條件。':'先新增設備，再在報修時選用。'}</p></div>}<footer className="panel-footer"><span>共 {data.total} 台 · 第 {page+1} 頁</span><div className="pagination"><button className="text-button" disabled={!page} onClick={()=>setPage(p=>p-1)}>上一頁</button><button className="text-button" disabled={page+1>=data.totalPages} onClick={()=>setPage(p=>p+1)}>下一頁</button></div></footer></>}
    </div></>}
    {reportAsset&&<TicketForm initialAsset={reportAsset} user={user} api={api} onClose={()=>setReportAsset(null)} onDone={t=>{setReportAsset(null);setTicketId(t.id);setRevision(n=>n+1);}}/>}
    {editing&&<AssetForm asset={editing.id?editing:null} api={api} onClose={()=>{setEditing(null);setRevision(n=>n+1);}} onDone={()=>{setEditing(null);setSuccess('設備已儲存');setRevision(n=>n+1);}}/>}
    {ticketId&&!ticketEditor&&<TicketDetail id={ticketId} api={api} user={user} onClose={()=>setTicketId(null)} onChanged={()=>setRevision(n=>n+1)} onEdit={t=>{setTicketId(null);setTicketEditor(t);}}/>}
    {ticketEditor&&<TicketForm user={user} ticket={ticketEditor} api={api} onClose={()=>setTicketEditor(null)} onDone={t=>{setTicketEditor(null);setTicketId(t.id);setRevision(n=>n+1);}}/>}
  </>;
}
