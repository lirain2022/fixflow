import {useEffect,useState} from 'react';
import TicketDetail from './TicketDetail';
import TicketForm from './TicketForm';

export default function NotificationCenter({api,user,onRead}){
  const [data,setData]=useState({items:[],total:0,totalPages:0,unreadCount:0}),[page,setPage]=useState(0),[unreadOnly,setUnreadOnly]=useState(false),[revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[detail,setDetail]=useState(null),[editing,setEditing]=useState(null);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');const params=new URLSearchParams({page:String(page),size:'20',unreadOnly:String(unreadOnly)});
    api(`/notifications?${params}`,'GET',null,{signal:controller.signal}).then(result=>{if(controller.signal.aborted)return;setData(result);if(page>0&&!result.items.length)setPage(p=>p-1);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[api,page,unreadOnly,revision]);
  useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible'&&!busy&&!detail&&!editing)setRevision(n=>n+1);},30000);return()=>clearInterval(timer);},[busy,detail,editing]);
  function refresh(){setRevision(n=>n+1);onRead();}
  async function acknowledge(note,open=false){
    setBusy(true);setError('');
    try{if(!note.readAt){await api(`/notifications/${note.id}/read`,'PATCH');refresh();}if(open)setDetail(note.ticketId);}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function readAll(){setBusy(true);setError('');try{await api('/notifications/read-all','PATCH');refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <><header className="page-heading"><div><h1>通知中心</h1></div></header>
    <section className="ticket-panel notification-panel"><header className="panel-heading"><h2>工單通知 <span className="count-badge">{data.unreadCount} 未讀</span></h2><div className="report-actions"><button className="text-button" disabled={loading||busy} onClick={refresh}>更新通知</button><button className="button secondary" disabled={loading||busy||data.unreadCount===0} onClick={readAll}>全部標為已讀</button></div></header>
    <div className="notification-filters"><label className="overdue-filter"><input type="checkbox" checked={unreadOnly} disabled={busy} onChange={e=>{setUnreadOnly(e.target.checked);setPage(0);}}/>只看未讀</label></div>
    {error&&<p className="error-notice" role="alert">{error} <button className="text-button" disabled={busy} onClick={refresh}>重試通知</button></p>}
    {loading?<p className="empty-state" role="status">讀取通知中…</p>:data.items.length===0?<div className="empty-state"><h3>{unreadOnly?'目前沒有未讀通知':'目前沒有通知'}</h3><p>新的相關工單活動會顯示在這裡。</p></div>:<ol className="notification-list">{data.items.map(note=><li key={note.id} className={note.readAt?'':'notification-unread'}><div className="notification-info"><span className="ticket-number">{note.ticketNo}{!note.readAt&&<span className="notification-unread-label">未讀</span>}</span><h3>{note.title}</h3><p>{note.message}</p><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString('zh-TW')}</time></div><div className="notification-actions"><button className="button secondary" disabled={busy} onClick={()=>acknowledge(note,true)} aria-label={`開啟通知 ${note.id} 的工單`}>查看工單</button>{!note.readAt&&<button className="text-button" disabled={busy} onClick={()=>acknowledge(note)}>標為已讀</button>}</div></li>)}</ol>}
    <footer className="panel-footer"><span>共 {data.total} 則 · 第 {page+1} 頁</span><div className="pagination"><button className="text-button" disabled={busy||loading||page===0} onClick={()=>setPage(p=>p-1)}>上一頁</button><button className="text-button" disabled={busy||loading||page+1>=data.totalPages} onClick={()=>setPage(p=>p+1)}>下一頁</button></div></footer></section>
    {detail&&!editing&&<TicketDetail id={detail} user={user} api={api} onClose={()=>setDetail(null)} onChanged={refresh} onEdit={ticket=>{setDetail(null);setEditing(ticket);}}/>}
    {editing&&<TicketForm ticket={editing} user={user} api={api} onClose={()=>setEditing(null)} onDone={()=>{setEditing(null);refresh();}}/>}
  </>;
}
