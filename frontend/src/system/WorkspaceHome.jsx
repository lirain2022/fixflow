import {useEffect,useState} from 'react';
import {STATUS_LABELS} from '../tickets/constants';

export default function WorkspaceHome({user,api,onNavigate}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{let live=true;setData(null);setError('');api('/workspace/summary').then(result=>{if(live)setData(result);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[api,revision]);
  const admin=user.role==='ADMIN';
  const statuses=['OPEN','ASSIGNED','IN_PROGRESS','RESOLVED'];
  return <><header className="page-heading"><div><h1>工作首頁</h1></div><button className="button secondary" onClick={()=>setRevision(n=>n+1)}>重新整理</button></header>
    {error?<div className="error-notice" role="alert">{error}<button className="text-button" onClick={()=>setRevision(n=>n+1)}>重新載入</button></div>:!data?<p role="status">正在整理你的工作…</p>:<><div className="metric-grid workspace-metrics">{statuses.map(status=><button className="metric-card metric-link" aria-label={`${STATUS_LABELS[status]} ${data.byStatus[status]||0}`} key={status} onClick={()=>onNavigate('tickets',{status})}><span>{STATUS_LABELS[status]}</span><strong>{data.byStatus[status]||0}</strong></button>)}<button className="metric-card metric-link" aria-label={`逾期未完成 ${data.overdue}`} onClick={()=>onNavigate('tickets',{overdue:true})}><span>逾期未完成</span><strong>{data.overdue}</strong></button><button className="metric-card metric-link" onClick={()=>onNavigate('tickets',{})}><span>{admin?'全部工單':'我的工單總數'}</span><strong>{data.total}</strong></button></div><section className="ticket-panel workspace-next"><div><h2>{admin?'安排工單':'待我處理'}</h2></div><button className="button primary" onClick={()=>onNavigate(admin?'dispatch':'tickets',admin?{}:{scope:'ACTION_REQUIRED'})}>{admin?'前往派工中心':'前往工單中心'}</button></section></>}
  </>;
}
