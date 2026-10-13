import {useEffect,useState} from 'react';
import {PRIORITY_LABELS,STATUS_LABELS} from '../tickets/constants';
import TicketDetail from './TicketDetail';
import TicketForm from './TicketForm';

export default function DispatchCenter({api,user,onNavigate}){
  return <AdminDispatch api={api} user={user} onNavigate={onNavigate}/>;
}
function AdminDispatch({api,user,onNavigate}){
  const [tickets,setTickets]=useState({items:[],total:0,totalPages:0});
  const [detail,setDetail]=useState(null),[editing,setEditing]=useState(null);
  const [status,setStatus]=useState('OPEN');
  const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(0),[revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{let live=true;setLoading(true);setError('');const params=new URLSearchParams({status,query:search,page:String(page),size:'10'});
    api(`/tickets?${params}`).then(list=>{if(!live)return;setTickets(list);if(page>0&&!list.items.length)setPage(p=>p-1);}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};
  },[api,page,search,revision,status]);
  function changed(){setRevision(n=>n+1);}
  return <><header className="page-heading"><div><h1>派工中心</h1></div><button className="button secondary" disabled={loading} onClick={changed}>重新整理</button></header>{error&&<div className="error-notice" role="alert">{error}<button className="text-button" onClick={changed}>重新載入</button></div>}
    <div className="dispatch-shortcuts ticket-queues" role="group" aria-label="派工進度">{[['OPEN','待派工'],['ASSIGNED','查看已派工單'],['IN_PROGRESS','維修中'],['RESOLVED','待驗收'],['CLOSED','已結案／費用']].map(([value,label])=><button key={value} className={`button ${status===value?'primary':'secondary'}`} aria-pressed={status===value} onClick={()=>{setStatus(value);setPage(0);}}>{label}</button>)}</div>
    {loading?<p role="status">正在載入工單…</p>:<div className="dispatch-layout dispatch-readonly"><section className="ticket-panel"><header className="panel-heading"><div><h2>{STATUS_LABELS[status]}{['OPEN','ASSIGNED'].includes(status)?'單':'工單'} <span className="count-badge">{tickets.total}</span></h2></div></header><form className="toolbar" onSubmit={e=>{e.preventDefault();setSearch(query);setPage(0);}}><div className="search-field"><input aria-label="搜尋派工工單" placeholder="搜尋標題、編號或位置" maxLength={200} value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="button secondary">搜尋</button></form><div className="dispatch-tickets">{tickets.items.length===0?<div className="empty-state"><h3>目前沒有{STATUS_LABELS[status]}{['OPEN','ASSIGNED'].includes(status)?'單':'工單'}</h3><p>{search?'請嘗試其他搜尋條件。':'可切換上方進度查看其他工單。'}</p></div>:tickets.items.map(ticket=><article className="dispatch-ticket" key={ticket.id}><div className="dispatch-ticket-summary"><span><span className="ticket-number">{ticket.ticketNo}</span><strong>{ticket.title}</strong><small>設備：{ticket.asset?`${ticket.asset.code} · ${ticket.asset.name}`:'一般報修'} · {ticket.location}</small><small>負責人：{ticket.assignedTo?.name||'尚未指派'} · {STATUS_LABELS[ticket.status]}</small></span></div><div className="dispatch-ticket-footer"><span className={`priority priority-${ticket.priority}`}>{PRIORITY_LABELS[ticket.priority]}優先級 {ticket.overdue?'· 已逾期':''}</span><button className="text-button" onClick={()=>setDetail(ticket.id)} aria-label={`${status==='CLOSED'?'查看費用':'查看'} ${ticket.title}`}>{status==='CLOSED'?'查看費用':'查看詳細'}</button></div></article>)}</div><footer className="panel-footer"><span>第 {page+1} 頁</span><div className="pagination"><button className="text-button" disabled={page===0} onClick={()=>setPage(p=>p-1)}>上一頁</button><button className="text-button" disabled={page+1>=tickets.totalPages} onClick={()=>setPage(p=>p+1)}>下一頁</button></div></footer></section>
    </div>}

    {detail&&!editing&&<TicketDetail id={detail} user={user} api={api} onClose={()=>setDetail(null)} onChanged={changed} onEdit={ticket=>{setDetail(null);setEditing(ticket);}}/>}
    {editing&&<TicketForm user={user} ticket={editing} api={api} onClose={()=>setEditing(null)} onDone={()=>{setEditing(null);changed();}}/>}
  </>;
}
