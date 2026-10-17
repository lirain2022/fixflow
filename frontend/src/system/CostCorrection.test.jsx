import CostCorrection from './CostCorrection';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import TicketDetail from './TicketDetail';
function setup(fail=false,status='CLOSED'){
 let t={id:1,version:8,title:'冷氣維修',ticketNo:'FIX-1',status,createdBy:{id:1,name:'報修者'},assignedTo:{id:1,name:'報修者'},attachments:[],comments:[],activities:[],repairs:[{id:5,content:'更換接頭',author:'處理人',totalCost:null,parts:[]}],repairCostSummary:{recordedRepairs:0,unpricedRepairs:1,recordedTotal:0}};
 const changed=vi.fn(),api=vi.fn(async(path,method,body)=>{if(path==='/users/technicians')return [];if(path.endsWith('/cost-corrections')){if(fail)throw Error('工單已更新，請重新開啟後確認');t={...t,version:9,repairCostSummary:{recordedRepairs:1,unpricedRepairs:0,recordedTotal:125},repairs:[{...t.repairs[0],workHours:1,laborCost:125,partsCost:0,totalCost:125}],costChanges:[{id:6,author:'報修者',content:'未登錄 → 125.00；補登收據'}]};}return t;});
 render(<TicketDetail id={1} user={{id:1,role:'CUSTOMER'}} api={api} onChanged={changed} onClose={()=>{}} onEdit={()=>{}}/>);return {api,changed};
}
it('backfills a closed repair and displays its audit without reopening the ticket',async()=>{
 const {api,changed}=setup();fireEvent.click(await screen.findByRole('button',{name:'補登費用'}));const dialog=screen.getByRole('dialog',{name:'補登維修費用'});
 fireEvent.change(within(dialog).getByLabelText('修改原因'),{target:{value:'補登收據'}});fireEvent.change(within(dialog).getByLabelText('人工費（NT$）'),{target:{value:'125'}});fireEvent.change(within(dialog).getByLabelText('實際工時（小時）'),{target:{value:'1'}});
 fireEvent.click(within(dialog).getByRole('button',{name:'儲存費用更正'}));await waitFor(()=>expect(api).toHaveBeenCalledWith('/tickets/1/cost-corrections','POST',expect.objectContaining({repairId:5,version:8,reason:'補登收據',laborCost:'125'})));await waitFor(()=>expect(changed).toHaveBeenCalled());expect(screen.queryByRole('dialog',{name:'補登維修費用'})).not.toBeInTheDocument();expect(screen.getByText('未登錄 → 125.00；補登收據')).toBeInTheDocument();
});
it('keeps the correction input when the version has changed',async()=>{
 setup(true);fireEvent.click(await screen.findByRole('button',{name:'補登費用'}));const dialog=screen.getByRole('dialog',{name:'補登維修費用'});fireEvent.change(within(dialog).getByLabelText('修改原因'),{target:{value:'補登收據'}});fireEvent.change(within(dialog).getByLabelText('人工費（NT$）'),{target:{value:'125'}});fireEvent.click(within(dialog).getByRole('button',{name:'儲存費用更正'}));expect(await within(dialog).findByRole('alert')).toHaveTextContent('工單已更新');expect(within(dialog).getByLabelText('修改原因')).toHaveValue('補登收據');
});
it('shows missing equipment and costs before acceptance',async()=>{
 setup(false,'RESOLVED');const check=await screen.findByRole('region',{name:'結案前檢查'});expect(check).toHaveTextContent('尚未連結設備');expect(check).toHaveTextContent('尚有 1 次維修未登錄費用');
});

it('free correction preserves used parts and guards unsaved dismissal',()=>{
 const close=vi.fn(),confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 render(<CostCorrection ticket={{id:1,version:8,ticketNo:'FIX-1'}} repair={{id:5,content:'維修',workHours:2,laborCost:100,totalCost:150,parts:[{name:'接頭',quantity:2,unitPrice:25}]}} api={vi.fn()} onClose={close} onDone={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'設為免費維修'}));expect(screen.getByLabelText('人工費（NT$）')).toHaveValue(0);expect(screen.getByLabelText('零件 1 數量')).toHaveValue(2);expect(screen.getByLabelText('零件 1 單價（NT$）')).toHaveValue(0);expect(screen.getByLabelText('預估總費用')).toHaveTextContent('NT$ 0.00');
 fireEvent.click(screen.getByRole('button',{name:'取消更正'}));expect(confirm).toHaveBeenCalled();expect(close).not.toHaveBeenCalled();confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'取消更正'}));expect(close).toHaveBeenCalledOnce();confirm.mockRestore();
});
