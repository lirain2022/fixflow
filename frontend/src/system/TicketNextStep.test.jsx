import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import TicketRowActions from './TicketRowActions';
const user={id:2,role:'CUSTOMER'},base={id:1,ticketNo:'FIX-1',createdBy:{id:1,name:'小王'},assignedTo:{id:2,name:'小林'}};
it.each([['ASSIGNED','開始維修'],['IN_PROGRESS','填寫完成紀錄']])('offers the next step only to the assignee in %s',(status,label)=>{const next=vi.fn();render(<TicketRowActions ticket={{...base,status}} user={user} onView={()=>{}} onEdit={()=>{}} onNext={next}/>);fireEvent.click(screen.getByRole('button',{name:label+' FIX-1'}));expect(next).toHaveBeenCalledWith({...base,status});});
it('offers acceptance to the owner and shows who is waiting',()=>{render(<TicketRowActions ticket={{...base,status:'RESOLVED'}} user={{id:1,role:'CUSTOMER'}} onView={()=>{}} onEdit={()=>{}} onNext={()=>{}}/>);expect(screen.getByRole('button',{name:'確認／退回 FIX-1'})).toBeEnabled();expect(screen.getByText('等待你驗收')).toBeInTheDocument();});
it('lets the creator start work without switching to the assigned account',()=>{render(<TicketRowActions ticket={{...base,status:'ASSIGNED'}} user={{id:1,role:'CUSTOMER'}} onView={()=>{}} onEdit={()=>{}} onNext={()=>{}}/>);expect(screen.getByRole('button',{name:'開始維修 FIX-1'})).toBeEnabled();});
it('lets the assignee accept completed work',()=>{render(<TicketRowActions ticket={{...base,status:'RESOLVED'}} user={user} onView={()=>{}} onEdit={()=>{}} onNext={()=>{}}/>);expect(screen.getByRole('button',{name:'確認／退回 FIX-1'})).toBeEnabled();});
