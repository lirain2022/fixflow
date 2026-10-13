export function canManageTicket(ticket,user){
  return !!ticket&&(user.role==='ADMIN'||ticket.createdBy?.id===user.id||ticket.assignedTo?.id===user.id);
}
