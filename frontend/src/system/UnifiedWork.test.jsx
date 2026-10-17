import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import TicketDetail from './TicketDetail';

it('keeps the repair base revision when a comment reveals another editors changed costs',async()=>{
 const ticket={id:1,version:1,title:'Problem',ticketNo:'FIX-1',status:'IN_PROGRESS',createdBy:{id:1,name:'Owner'},assignedTo:{id:2,name:'Worker'},attachments:[],repairs:[],comments:[],activities:[],repairDraft:{content:'Draft',workHours:1,laborCost:25,parts:[]}};
 const api=vi.fn(async(path,method)=>{if(path==='/users/technicians')return [];if(path.endsWith('/comments'))return {...ticket,version:3,repairDraft:{...ticket.repairDraft,laborCost:200}};if(method==='PUT')throw new Error('工單已更新');return ticket;});
 render(<TicketDetail id={1} user={{id:2,role:'CUSTOMER'}} api={api} onClose={()=>{}} onChanged={()=>{}}/>);
 fireEvent.change(await screen.findByLabelText('人工費（NT$）'),{target:{value:'80'}});
 fireEvent.change(screen.getByLabelText('新增留言'),{target:{value:'Update'}});fireEvent.click(screen.getByRole('button',{name:'送出留言'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'儲存費用草稿'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'儲存費用草稿'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/tickets/1/repair-draft','PUT',expect.objectContaining({version:1,laborCost:'80'})));
 expect(await screen.findByRole('alert')).toHaveTextContent('工單已更新');expect(screen.getByLabelText('人工費（NT$）')).toHaveValue(80);
});

it('preserves unsaved costs after a comment and returns through the back action',async()=>{
 let ticket={id:1,version:1,title:'Problem',ticketNo:'FIX-1',status:'IN_PROGRESS',createdBy:{id:1,name:'Owner'},assignedTo:{id:2,name:'Worker'},attachments:[],repairs:[],comments:[],activities:[],repairDraft:{content:'Draft',workHours:1,laborCost:25,parts:[]}};
 const close=vi.fn();const api=async(path,method)=>{if(path==='/users/technicians')return [];if(method==='POST')ticket={...ticket,version:2};return ticket;};
 render(<TicketDetail id={1} user={{id:2,role:'CUSTOMER'}} api={api} onClose={close} onChanged={()=>{}}/>);
 const cost=await screen.findByLabelText('人工費（NT$）');fireEvent.change(cost,{target:{value:'80'}});
 fireEvent.change(screen.getByLabelText('新增留言'),{target:{value:'Update'}});fireEvent.click(screen.getByRole('button',{name:'送出留言'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'返回列表'})).toBeEnabled());expect(cost).toHaveValue(80);
 fireEvent.click(screen.getByRole('button',{name:'返回列表'}));expect(close).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'放棄修改'}));expect(close).toHaveBeenCalledOnce();expect(screen.queryByRole('button',{name:'更新工單資料'})).not.toBeInTheDocument();
});

it('lets an ordinary assigned account start its work',async()=>{
  const ticket={id:1,title:'Problem',ticketNo:'FIX-1',status:'ASSIGNED',createdBy:{id:1,name:'Owner'},assignedTo:{id:2,name:'Worker'},attachments:[],repairs:[],comments:[],activities:[]};
  const api=async path=>path==='/users/technicians'?[]:ticket;
  render(<TicketDetail id={1} user={{id:2,role:'CUSTOMER'}} api={api} onClose={()=>{}} onChanged={()=>{}}/>);
  expect(await screen.findByRole('button',{name:'開始維修'})).toBeEnabled();
  expect(screen.getByRole('button',{name:'確認派工'})).toBeInTheDocument();
});

it.each([['IN_PROGRESS','repair','textbox','維修紀錄'],['RESOLVED','accept','button','確認結案']])('focuses the requested action for admins in %s',async(status,focusAction,role,name)=>{
 const ticket={id:1,title:'Problem',ticketNo:'FIX-1',status,createdBy:{id:1,name:'Owner'},assignedTo:{id:2,name:'Admin'},attachments:[],repairs:[],comments:[],activities:[]};
 render(<TicketDetail id={1} user={{id:2,role:'ADMIN'}} focusAction={focusAction} api={async path=>path==='/users/technicians'?[]:ticket} onClose={()=>{}} onChanged={()=>{}} onEdit={()=>{}}/>);
 const action=await screen.findByRole(role,{name,exact:true});await waitFor(()=>expect(action).toHaveFocus());
});


it('keeps list navigation separate from reverting workflow with the displayed revision',async()=>{
 const ticket={id:1,version:7,title:'Problem',ticketNo:'FIX-1',status:'ASSIGNED',createdBy:{id:1,name:'Owner'},assignedTo:{id:2,name:'Worker'},attachments:[],repairs:[],comments:[],activities:[]};
 const close=vi.fn(),changed=vi.fn(),confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 const api=vi.fn(async(path,method)=>path==='/users/technicians'?[]:method==='POST'?{...ticket,version:8,status:'OPEN',assignedTo:null}:ticket);
 render(<TicketDetail id={1} user={{id:1,role:'CUSTOMER'}} api={api} onClose={close} onChanged={changed}/>);
 await screen.findByText('Problem');fireEvent.click(screen.getByRole('button',{name:'上一步',exact:true}));expect(api).not.toHaveBeenCalledWith('/tickets/1/previous-step','POST',expect.anything());
 confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'上一步',exact:true}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/tickets/1/previous-step','POST',{version:7}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'上一步',exact:true})).toBeDisabled());expect(close).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'返回列表',exact:true}));expect(close).toHaveBeenCalledOnce();confirm.mockRestore();
});
