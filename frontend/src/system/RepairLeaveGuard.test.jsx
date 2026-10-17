import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import TicketDetail from './TicketDetail';
function setup({fail=false}={}){
 let ticket={id:1,version:7,title:'Repair',ticketNo:'FIX-1',status:'IN_PROGRESS',createdBy:{id:1,name:'Owner'},assignedTo:{id:2,name:'Worker'},attachments:[],repairs:[],comments:[],activities:[]};
 const api=vi.fn(async(path,method,body)=>{if(path==='/users/technicians')return [];if(path.endsWith('/repair-draft')){if(fail)throw Error('儲存失敗，請重試');ticket={...ticket,version:8,repairDraft:{content:body.description,workHours:body.workHours,laborCost:body.laborCost,parts:body.parts}};}if(path.endsWith('/previous-step'))ticket={...ticket,version:9,status:'ASSIGNED'};return ticket;});
 const close=vi.fn(),edit=vi.fn();render(<TicketDetail id={1} user={{id:1,role:'CUSTOMER'}} api={api} onClose={close} onEdit={edit} onChanged={()=>{}}/>);return {api,close,edit};
}
async function change(){fireEvent.change(await screen.findByLabelText('人工費（NT$）'),{target:{value:'125'}});}
const prompt=()=>screen.getByRole('dialog',{name:'尚有未儲存的維修費用'});
it('keeps dirty inputs on continue and discards only when explicitly chosen',async()=>{
 const {api,close}=setup();await change();fireEvent.click(screen.getByRole('button',{name:'返回列表'}));expect(prompt()).toBeVisible();expect(close).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'繼續編輯'}));expect(screen.getByLabelText('人工費（NT$）')).toHaveValue(125);
 fireEvent.click(screen.getByRole('button',{name:'返回列表'}));fireEvent.click(screen.getByRole('button',{name:'放棄修改'}));expect(close).toHaveBeenCalledOnce();expect(api.mock.calls.some(([p])=>p.endsWith('/repair-draft'))).toBe(false);
});
it('saves costs before leaving and uses the latest revision when returning to assigned',async()=>{
 const {api,close}=setup();await change();fireEvent.click(screen.getByRole('button',{name:'上一步',exact:true}));expect(prompt()).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'儲存草稿後繼續'}));await waitFor(()=>expect(api).toHaveBeenCalledWith('/tickets/1/previous-step','POST',{version:8}));expect(api).toHaveBeenCalledWith('/tickets/1/repair-draft','PUT',expect.objectContaining({laborCost:'125',version:7}));expect(close).not.toHaveBeenCalled();
});
it('keeps all input and does not leave when saving fails',async()=>{
 const {close}=setup({fail:true});await change();fireEvent.click(screen.getByRole('button',{name:'返回列表'}));fireEvent.click(screen.getByRole('button',{name:'儲存草稿後繼續'}));expect(await screen.findByRole('alert')).toHaveTextContent('儲存失敗');await waitFor(()=>expect(screen.queryByRole('dialog',{name:'尚有未儲存的維修費用'})).not.toBeInTheDocument());expect(screen.getByLabelText('人工費（NT$）')).toHaveValue(125);expect(close).not.toHaveBeenCalled();
});
it('guards Escape and edit, but does not prompt again after a successful save',async()=>{
 const {close,edit}=setup();await change();fireEvent(screen.getByRole('dialog',{name:'工單詳細資訊'}),new Event('cancel',{bubbles:true,cancelable:true}));expect(prompt()).toBeVisible();fireEvent(prompt(),new Event('cancel',{bubbles:true,cancelable:true}));expect(screen.queryByRole('dialog',{name:'尚有未儲存的維修費用'})).not.toBeInTheDocument();expect(close).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'編輯工單'}));expect(prompt()).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'儲存草稿後繼續'}));await waitFor(()=>expect(edit).toHaveBeenCalledOnce());fireEvent.click(screen.getByRole('button',{name:'返回列表'}));expect(close).toHaveBeenCalledOnce();
});
it('does not leave when incomplete parts cannot be saved',async()=>{
 const {close,api}=setup();await change();fireEvent.click(screen.getByRole('button',{name:'新增零件'}));fireEvent.click(screen.getByRole('button',{name:'返回列表'}));fireEvent.click(screen.getByRole('button',{name:'儲存草稿後繼續'}));await waitFor(()=>expect(screen.queryByRole('dialog',{name:'尚有未儲存的維修費用'})).not.toBeInTheDocument());expect(screen.getByRole('alert')).toHaveTextContent('零件需填名稱');expect(close).not.toHaveBeenCalled();expect(api.mock.calls.some(([p])=>p.endsWith('/repair-draft'))).toBe(false);
});
