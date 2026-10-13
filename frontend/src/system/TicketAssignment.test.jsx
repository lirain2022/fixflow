import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import TicketAssignment from './TicketAssignment';
import TicketRowActions from './TicketRowActions';

it('assigns from the ticket list and retains selection after a failed save',async()=>{
  let saves=0;const done=vi.fn();const api=vi.fn(async(path,method)=>{
    if(method==='PATCH'){if(++saves===1)throw Error('連線失敗');return {id:1,status:'ASSIGNED',assignedTo:{name:'王技師'}};}
    if(path==='/workspace/technicians')return [{id:2,name:'王技師',assigned:1,inProgress:2}];
    return {id:1,ticketNo:'FIX-1',title:'冷氣漏水',status:'OPEN'};
  });
  render(<TicketAssignment ticketId={1} api={api} onDone={done} onClose={()=>{}}/>);
  fireEvent.change(await screen.findByLabelText('選擇處理人員'),{target:{value:'2'}});fireEvent.click(screen.getByRole('button',{name:'確認派工'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('連線失敗');expect(screen.getByLabelText('選擇處理人員')).toHaveValue('2');
  fireEvent.click(screen.getByRole('button',{name:'確認派工'}));await waitFor(()=>expect(done).toHaveBeenCalled());
  expect(api).toHaveBeenCalledWith('/tickets/1/assign','PATCH',{technicianId:2,expectedStatus:'OPEN'});
});

it('does not allow assignment when the latest ticket is already in progress',async()=>{
  const api=async path=>path==='/workspace/technicians'?[{id:2,name:'王技師'}]:{id:1,status:'IN_PROGRESS'};
  render(<TicketAssignment ticketId={1} api={api} onDone={()=>{}} onClose={()=>{}}/>);
  expect(await screen.findByText('這張工單目前不能派工，請更新列表查看最新進度。')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'確認派工'})).not.toBeInTheDocument();
});

it('does not offer the current technician as a new assignment',async()=>{
  const api=async path=>path==='/workspace/technicians'?[{id:2,name:'王技師',assigned:1,inProgress:0}]:{id:1,status:'ASSIGNED',assignedTo:{id:2,name:'王技師'}};
  render(<TicketAssignment ticketId={1} api={api} onDone={()=>{}} onClose={()=>{}}/>);
  expect(await screen.findByRole('option',{name:/王技師/})).toBeDisabled();
});

it.each(['TECHNICIAN','CUSTOMER'])('keeps assignment unavailable on another owners ticket for %s',(role)=>{
  render(<TicketRowActions ticket={{id:1,ticketNo:'FIX-1',status:'OPEN',createdBy:{id:3}}} user={{id:1,role}} onView={()=>{}} onEdit={()=>{}} onAssign={()=>{}}/>);
  expect(screen.queryByRole('button',{name:'派工 FIX-1'})).not.toBeInTheDocument();
});
it.each(['ADMIN','CUSTOMER'])('offers an assignment action for an open ticket to %s',(role)=>{
  const assign=vi.fn(),ticket={id:1,ticketNo:'FIX-1',status:'OPEN',createdBy:{id:1}};
  render(<TicketRowActions ticket={ticket} user={{id:1,role}} onAssign={assign}/>);fireEvent.click(screen.getByRole('button',{name:'派工 FIX-1'}));expect(assign).toHaveBeenCalledWith(ticket);
});
