import {useEffect,useRef,useState} from 'react';
import Modal from './Modal';

export default function TicketAssignment({ticketId,api,onDone,onClose}){
  const [data,setData]=useState(null),[technician,setTechnician]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[conflict,setConflict]=useState(false);
  const saving=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();setData(null);setError('');setConflict(false);
    Promise.all([api(`/tickets/${ticketId}`,'GET',null,{signal:controller.signal}),api('/workspace/technicians','GET',null,{signal:controller.signal})])
      .then(([ticket,staff])=>{if(!controller.signal.aborted){setData({ticket,staff});setTechnician('');}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
    return()=>controller.abort();
  },[ticketId,api,revision]);
  async function submit(event){
    event.preventDefault();if(saving.current||conflict||!technician||!data)return;
    saving.current=true;setBusy(true);setError('');
    try{const result=await api(`/tickets/${ticketId}/assign`,'PATCH',{technicianId:Number(technician),expectedStatus:data.ticket.status});onDone(result);}
    catch(e){setError(e.message);setConflict(e.status===409);}finally{saving.current=false;setBusy(false);}
  }
  const allowed=data&&['OPEN','ASSIGNED'].includes(data.ticket.status);
  return <Modal title="安排處理人員" onClose={()=>!saving.current&&onClose()}><form onSubmit={submit}><div className="form-fields">
    {error&&<p role="alert" className="error-notice">{error}</p>}
    {!data?error?<button type="button" className="button secondary" onClick={()=>setRevision(n=>n+1)}>重新載入</button>:<p role="status">載入工單與人員…</p>:<><p className="ticket-number">{data.ticket.ticketNo}</p><h3>{data.ticket.title}</h3><p className="muted">目前負責：{data.ticket.assignedTo?.name||'尚未指派'}。</p>
    {!allowed?<p>這張工單目前不能派工，請更新列表查看最新進度。</p>:<><label className="field">選擇處理人員<select required value={technician} disabled={busy||conflict} onChange={e=>setTechnician(e.target.value)}><option value="">請選擇人員</option>{data.staff.map(s=><option key={s.id} value={s.id} disabled={s.id===data.ticket.assignedTo?.id}>{s.name} · 待處理 {s.assigned}／維修中 {s.inProgress}</option>)}</select></label>{!data.staff.some(s=>s.id!==data.ticket.assignedTo?.id)&&<p>目前沒有其他可指派的人員，請確認對方已註冊且帳號已啟用。</p>}</>}
    {conflict&&<p>無法完成派工，請先<button type="button" className="text-button" onClick={()=>setRevision(n=>n+1)}>重新載入</button>，再確認派工。</p>}</>}
    </div><footer className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>返回工單列表</button>{allowed&&<button className="button primary" disabled={busy||conflict||!technician}>{busy?'派工中…':'確認派工'}</button>}</footer></form></Modal>;
}
