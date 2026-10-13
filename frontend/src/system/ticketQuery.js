export function ticketQuery({search='',status='',priority='',assigneeId='',overdue=false,order='NEWEST',scope='ALL'}={}){
  const params=new URLSearchParams({query:search});
  if(scope!=='ALL')params.set('scope',scope);
  if(status)params.set('status',status);
  if(priority)params.set('priority',priority);
  if(assigneeId)params.set('assigneeId',assigneeId);
  if(overdue)params.set('overdue','true');
  if(order!=='NEWEST')params.set('order',order);
  return params;
}
