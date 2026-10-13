import {ticketNextStep} from './ticketNextStep';
const steps=[['OPEN','待派工'],['ASSIGNED','已派工'],['IN_PROGRESS','維修中'],['RESOLVED','待驗收'],['CLOSED','已結案']];
export default function TicketProgress({ticket,user}){const index=steps.findIndex(([value])=>value===ticket.status);return <section className="ticket-progress" aria-label="工單進度"><p>{ticketNextStep(ticket,user).waiting}</p>{index>=0&&<ol>{steps.map(([value,label],i)=><li key={value} className={i<=index?'reached':''} aria-current={i===index?'step':undefined}>{label}</li>)}</ol>}</section>;}
