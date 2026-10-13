import {canManageTicket} from './ticketAccess';
export function ticketEditReason(ticket,user){
  if(['CLOSED','CANCELLED'].includes(ticket.status))return '工單已結束';
  return canManageTicket(ticket,user)?'':'只能編輯你建立或被指派的工單';
}
