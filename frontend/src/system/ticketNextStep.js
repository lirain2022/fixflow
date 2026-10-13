import {canManageTicket} from './ticketAccess';
export function ticketNextStep(ticket,user){
  const manager=canManageTicket(ticket,user),assignee=manager;
  const person=(value)=>value?.id===user.id?'你':value?.name||'處理人員';
  switch(ticket.status){
    case 'OPEN':return {action:manager?'assign':null,label:'派工',waiting:manager?'等待你派工':`等待${person(ticket.createdBy)}派工`};
    case 'ASSIGNED':return {action:assignee?'start':null,label:'開始維修',waiting:manager?'可開始維修':`等待${person(ticket.assignedTo)}開始維修`};
    case 'IN_PROGRESS':return {action:assignee?'repair':null,label:'填寫完成紀錄',waiting:manager?'可填寫費用與完成維修':`等待${person(ticket.assignedTo)}完成維修`};
    case 'RESOLVED':return {action:manager?'accept':null,label:'確認／退回',waiting:manager?'等待你驗收':`等待${person(ticket.createdBy)}驗收`};
    case 'CLOSED':return {action:null,waiting:'已結案'};
    case 'CANCELLED':return {action:null,waiting:'已取消'};
    default:return {action:null,waiting:''};
  }
}
