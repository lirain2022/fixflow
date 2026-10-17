import CostsPage from './CostsPage';
import {ticketNextStep} from './ticketNextStep';
import {useCallback,useEffect,useRef,useState} from 'react';
import {request,readSession,saveSession} from './api';
import AuthScreen from './AuthScreen';
import TicketForm from './TicketForm';
import TicketDetail from './TicketDetail';
import {Dashboard,Users,ROLES} from './AdminPages';
import {STATUS_LABELS,PRIORITY_LABELS,CATEGORY_LABELS} from '../tickets/constants';
import Icon from '../components/Icon';
import WorkspaceHome from './WorkspaceHome';
import DispatchCenter from './DispatchCenter';
import AssetsPage from './AssetsPage';
import ChangePassword from './ChangePassword';
import TicketRowActions from './TicketRowActions';
import TicketAssignment from './TicketAssignment';
import {ticketQuery} from './ticketQuery';
import NotificationBell from './NotificationBell';
import NotificationCenter from './NotificationCenter';

export default function SystemApp(){
  const [token,setToken]=useState(readSession),[user,setUser]=useState(null),[checking,setChecking]=useState(!!token),[sessionError,setSessionError]=useState('');
  const [page,setPage]=useState('home'),[ticketFilters,setTicketFilters]=useState({});
  const [navigationId,setNavigationId]=useState(0);
  const [notificationRevision,setNotificationRevision]=useState(0);
  const notificationChanged=useCallback(()=>setNotificationRevision(n=>n+1),[]);
  const [passwordOpen,setPasswordOpen]=useState(false),[loginNotice,setLoginNotice]=useState('');
  function navigate(next,filters={}){setTicketFilters(filters);setNavigationId(id=>id+1);setPage(next);}
  const logout=useCallback(()=>{saveSession(null);setToken(null);setUser(null);setChecking(false);setPage('home');setTicketFilters({});setPasswordOpen(false);},[]);
  const api=useCallback(async(path,method,body,options)=>{try{return await request(path,method,body,token,options);}catch(e){if(e.status===401)logout();throw e;}},[token,logout]);
  useEffect(()=>{if(!token)return;let live=true;setChecking(true);setSessionError('');api('/users/me').then(u=>{if(live)setUser(u);}).catch(e=>{if(live)setSessionError(e.message);}).finally(()=>{if(live)setChecking(false);});return()=>{live=false;};},[token,api]);
  function loggedIn(session){saveSession(session.token);setUser(session.user);setToken(session.token);setSessionError('');setLoginNotice('');}
  if(checking)return <main className="session-loading" role="status">正在確認登入狀態…</main>;
  if(token&&!user)return <main className="session-loading"><p role="alert">{sessionError}</p><button className="button secondary" onClick={()=>window.location.reload()}>重試連線</button><button className="button secondary" onClick={logout}>返回登入</button></main>;
  if(!user)return <AuthScreen onLogin={loggedIn} notice={loginNotice}/>;
  return <div className="app-shell system-shell"><a className="skip-link" href="#main-content">跳到主要內容</a><aside className="sidebar"><div className="brand"><span className="brand-symbol"><Icon name="tool" size={25}/></span><div><strong>FixFlow<span>.</span></strong><small>維修工單管理</small></div></div><div className="nav-section-label">工作空間</div><nav aria-label="主要導覽">{[['home','工作首頁'],['tickets','工單中心'],['dispatch','派工中心'],['assets','設備管理'],['costs','費用總覽'],...(user.role==='ADMIN'?[['dashboard','工作總覽'],['users','帳號管理']]:[])].map(([key,label])=><button key={key} className={`nav-item ${page===key?'active':''}`} aria-current={page===key?'page':undefined} onClick={()=>navigate(key)}>{label}</button>)}</nav><div className="workspace"><span className="workspace-avatar">{user.name.slice(0,1)}</span><div><strong>{user.name}</strong><small>{ROLES[user.role]}</small></div></div></aside><div className="page-shell"><header className="topbar"><div className="breadcrumb"><span>工作區</span><strong>{ROLES[user.role]}</strong></div><div className="account-menu"><span>{user.name}</span><NotificationBell api={api} revision={notificationRevision} onOpen={()=>navigate('notifications')}/><button className="button secondary" onClick={()=>setPasswordOpen(true)}>修改密碼</button><button className="button secondary" onClick={logout}>登出</button></div></header><main id="main-content" tabIndex={-1}>{page==='notifications'?<NotificationCenter api={api} user={user} onRead={notificationChanged}/>:page==='home'?<WorkspaceHome api={api} user={user} onNavigate={navigate}/>:page==='costs'?<CostsPage api={api} user={user}/>:page==='assets'?<AssetsPage api={api} user={user}/>:page==='dispatch'?<DispatchCenter api={api} user={user} onNavigate={navigate}/>:page==='dashboard'?<Dashboard api={api}/>:page==='users'?<Users api={api} user={user}/>:<TicketWorkspace key={navigationId} api={api} user={user} initialFilters={ticketFilters} onDispatch={()=>navigate('dispatch')}/>}<footer className="page-footer"><span>FixFlow / 維修工單管理</span></footer></main></div>{passwordOpen&&<ChangePassword api={api} onClose={()=>setPasswordOpen(false)} onDone={()=>{logout();setLoginNotice('密碼已更新，請使用新密碼重新登入。');}}/>}</div>;
}
function TicketWorkspace({api,user,initialFilters={},onDispatch}){
  const [data,setData]=useState({items:[],total:0,totalPages:0}),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
  const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[status,setStatus]=useState(initialFilters.status||''),[page,setPage]=useState(0),[overdue,setOverdue]=useState(!!initialFilters.overdue);
  const [modal,setModal]=useState(null),[selected,setSelected]=useState(null),[success,setSuccess]=useState('');
  const [priority,setPriority]=useState(''),[assigneeId,setAssigneeId]=useState(''),[order,setOrder]=useState('NEWEST');
  const [technicians,setTechnicians]=useState([]),[staffError,setStaffError]=useState('');
  const [assigning,setAssigning]=useState(null);
  const [scope,setScope]=useState(initialFilters.scope||'ALL'),[actionBusy,setActionBusy]=useState(false),[focusAction,setFocusAction]=useState(false);
  const actionLock=useRef(false);
  const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
  useEffect(()=>{
    if(user.role!=='ADMIN')return;
    const controller=new AbortController();setStaffError('');
    api('/users','GET',null,{signal:controller.signal}).then(rows=>setTechnicians(rows)).catch(e=>{if(e.name!=='AbortError')setStaffError(e.message);});
    return()=>controller.abort();
  },[api,user.role,revision]);
  function clearFilters(){setScope('ALL');setQuery('');setSearch('');setStatus('');setPriority('');setAssigneeId('');setOrder('NEWEST');setOverdue(false);setPage(0);setExportError('');}
  async function exportTickets(){
    setExporting(true);setExportError('');
    try{
      const params=ticketQuery({search,status,priority,assigneeId,overdue,order,scope});
      const blob=await api(`/tickets/export?${params}`,'GET',null,{blob:true});
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=`fixflow-tickets-${new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}.csv`;
      document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){setExportError(e.message);}finally{setExporting(false);}
  }
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');const params=ticketQuery({search,status,priority,assigneeId,overdue,order,scope});params.set('page',String(page));params.set('size','10');api(`/tickets?${params}`,'GET',null,{signal:controller.signal}).then(d=>{setData(d);if(page>0&&d.items.length===0)setPage(page-1);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[api,search,status,page,revision,overdue,priority,assigneeId,order,scope]);
  function done(ticket){setFocusAction(false);const wasEditing=!!modal?.id;setModal(null);setSelected(wasEditing?null:ticket.id);setSuccess('工單已儲存');setRevision(r=>r+1);}
  function viewTicket(ticket){setFocusAction(false);setSelected(ticket.id);setSuccess('');}
  async function nextAction(ticket){
    if(actionLock.current)return;const next=ticketNextStep(ticket,user);if(!next.action)return;
    setError('');setSuccess('');
    if(next.action==='start'){
      actionLock.current=true;setActionBusy(true);
      try{await api(`/tickets/${ticket.id}/status`,'PATCH',{status:'IN_PROGRESS'});setRevision(r=>r+1);setFocusAction('repair');setSelected(ticket.id);}
      catch(e){setError(e.message);setRevision(r=>r+1);}finally{actionLock.current=false;setActionBusy(false);}
    }else{setFocusAction(next.action);setSelected(ticket.id);}
  }
  function editTicket(ticket){setSelected(null);setModal(ticket);setSuccess('');}
  function item(ticket){return <><span className="ticket-number">{ticket.ticketNo}</span><button className="ticket-link" onClick={()=>viewTicket(ticket)}>{ticket.title}</button></>;}
  return <><section className="page-heading"><div><h1>{user.role==='ADMIN'?'工單管理':'我的工單'}</h1></div>{<button className="button primary create-button" onClick={()=>{setModal({});setSuccess('');}}><Icon name="plus" size={18}/>新增工單</button>}</section>{success&&<p role="status" className="success-notice">{success}</p>}{error&&<div role="alert" className="error-notice">{error} <button className="text-button" onClick={()=>setRevision(r=>r+1)}>重試</button></div>}<section className="ticket-panel"><header className="panel-heading"><div><h2>工單列表 <span className="count-badge">{data.total}</span></h2></div><div className="report-actions">{<button className="button primary" onClick={onDispatch}>前往派工中心</button>}<button className="text-button" disabled={loading} onClick={()=>setRevision(r=>r+1)}>重新整理</button><button className="button secondary" disabled={loading||!!error||exporting||data.total===0||query!==search} onClick={exportTickets}>{exporting?'匯出中…':'匯出 CSV'}</button></div></header>{query!==search&&<p className="report-hint">關鍵字尚未套用，請按搜尋。</p>}{exportError&&<p role="alert" className="report-error">{exportError}</p>}{staffError&&<p role="alert" className="report-error">人員選單載入失敗：{staffError}，請按重新整理。</p>}<div className="ticket-queues" role="group" aria-label="工單分類">{[['ALL','全部'],['CREATED','我建立的'],['ASSIGNED','派給我的'],['ACTION_REQUIRED','待我處理']].map(([value,label])=><button key={value} className={`button ${scope===value?'primary':'secondary'}`} aria-pressed={scope===value} onClick={()=>{setScope(value);setPage(0);}}>{label}</button>)}</div><form className="toolbar ticket-filters" onSubmit={event=>{event.preventDefault();setSearch(query);setPage(0);}}><div className="search-field"><Icon name="search" size={18}/><input aria-label="搜尋工單" value={query} maxLength={200} onChange={e=>setQuery(e.target.value)} placeholder="搜尋編號、標題或位置…"/></div><div className="filter-field"><select aria-label="工單狀態" value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">所有狀態</option>{Object.entries(STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div><div className="filter-field"><select aria-label="工單優先級" value={priority} onChange={e=>{setPriority(e.target.value);setPage(0);}}><option value="">所有優先級</option>{Object.entries(PRIORITY_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>{user.role==='ADMIN'&&<div className="filter-field"><select aria-label="處理人員" value={assigneeId} onChange={e=>{setAssigneeId(e.target.value);setPage(0);}}><option value="">所有人員／未指派</option>{technicians.map(tech=><option key={tech.id} value={tech.id}>{tech.name}（{tech.email}）{tech.enabled?'':'（已停用）'}</option>)}</select></div>}<div className="filter-field"><select aria-label="工單排序" value={order} onChange={e=>{setOrder(e.target.value);setPage(0);}}><option value="NEWEST">最新建立優先</option><option value="OLDEST">最早建立優先</option><option value="DUE_SOON">最早到期優先</option><option value="PRIORITY">緊急程度優先</option></select></div><label className="overdue-filter"><input type="checkbox" checked={overdue} onChange={e=>{setOverdue(e.target.checked);setPage(0);}}/>只看逾期</label><button className="button secondary">搜尋</button><button type="button" className="text-button" onClick={clearFilters}>清除條件</button></form>{loading?<div className="empty-state" role="status">載入工單中…</div>:data.items.length===0?<div className="empty-state"><h3>目前沒有符合條件的工單</h3><p>{search||status||priority||assigneeId||overdue||scope!=='ALL'?'試試其他搜尋条件，或清除篩選。':'你建立或被指派的工單會顯示在這裡，可以從新增工單開始。'}</p>{(search||status||priority||assigneeId||overdue||scope!=='ALL')&&<button className="button secondary" onClick={clearFilters}>清除篩選</button>}</div>:<><div className="table-wrap"><table className="ticket-table"><thead><tr><th>工單</th><th>分類</th><th>設備／位置</th><th>優先級</th><th>狀態</th><th>處理人員</th><th>操作</th></tr></thead><tbody>{data.items.map(t=><tr key={t.id}><td>{item(t)}</td><td><span className="category-tag">{CATEGORY_LABELS[t.category]}</span></td><td><strong>{t.asset?.name||'一般報修'}</strong><br/>{t.location}</td><td><span className={`priority priority-${t.priority}`}>{PRIORITY_LABELS[t.priority]}</span></td><td><span className={`status-tag status-${t.status}`}>{STATUS_LABELS[t.status]}</span>{t.overdue&&<small className="overdue">已逾期</small>}</td><td>{t.assignedTo?.name||'未指派'}</td><td><TicketRowActions ticket={t} user={user} onView={viewTicket} onEdit={editTicket} onAssign={setAssigning} onNext={nextAction} busy={actionBusy}/></td></tr>)}</tbody></table></div><div className="ticket-cards">{data.items.map(t=><article className="ticket-card" key={t.id}><div className="card-top"><span className={`status-tag status-${t.status}`}>{STATUS_LABELS[t.status]}</span><span className={`priority priority-${t.priority}`}>{PRIORITY_LABELS[t.priority]}優先級</span></div><h3>{item(t)}</h3><p className="card-location">設備：{t.asset?.name||'一般報修'} · {t.location}</p><div className="card-bottom"><span>{t.assignedTo?.name||'等待派工'}</span>{t.overdue&&<span className="overdue">已逾期</span>}</div><TicketRowActions ticket={t} user={user} onView={viewTicket} onEdit={editTicket} onAssign={setAssigning} onNext={nextAction} busy={actionBusy}/></article>)}</div></>}<footer className="panel-footer"><span>共 {data.total} 筆 · 第 {page+1} 頁</span><div className="pagination"><button className="text-button" disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}>上一頁</button><button className="text-button" disabled={page+1>=data.totalPages||loading} onClick={()=>setPage(p=>p+1)}>下一頁</button></div></footer></section>{assigning&&<TicketAssignment ticketId={assigning.id} api={api} onClose={()=>{setAssigning(null);setRevision(n=>n+1);}} onDone={t=>{setAssigning(null);setSuccess(`已指派給 ${t.assignedTo?.name||'處理人員'}`);setRevision(n=>n+1);}}/>}{modal&&<TicketForm user={user} ticket={modal.id?modal:null} api={api} onDone={done} onClose={()=>setModal(null)}/>} {selected&&!modal&&<TicketDetail focusAction={focusAction} id={selected} user={user} api={api} onClose={()=>{setSelected(null);setFocusAction(false);}} onChanged={()=>setRevision(r=>r+1)} onEdit={ticket=>{setSelected(null);setModal(ticket);}}/>}</>;
}
