import {canManageTicket} from './ticketAccess';
import {ticketNextStep} from './ticketNextStep';
import {ticketEditReason} from './ticketEditing';
export default function TicketRowActions({ticket,user,onView,onEdit,onAssign,onNext,busy=false}){
  const reason=ticketEditReason(ticket,user),next=ticketNextStep(ticket,user);
  return <div className="ticket-row-actions"><p className="ticket-waiting">{next.waiting}</p><div><button className="text-button" disabled={busy} aria-label={`查看 ${ticket.ticketNo}`} onClick={()=>onView(ticket)}>查看</button><button className="text-button" aria-label={`編輯 ${ticket.ticketNo}`} disabled={busy||!!reason} title={reason} onClick={()=>onEdit(ticket)}>編輯</button>{canManageTicket(ticket,user)&&onAssign&&['OPEN','ASSIGNED'].includes(ticket.status)&&<button className={`button ${ticket.status==='OPEN'?'primary next-step-button':'secondary'}`} disabled={busy} aria-label={`${ticket.status==='OPEN'?'派工':'改派'} ${ticket.ticketNo}`} onClick={()=>onAssign(ticket)}>{ticket.status==='OPEN'?'派工':'改派'}</button>}{onNext&&next.action&&next.action!=='assign'&&<button className="button primary next-step-button" disabled={busy} aria-label={`${next.label} ${ticket.ticketNo}`} onClick={()=>onNext(ticket)}>{next.label}</button>}</div></div>;
}
