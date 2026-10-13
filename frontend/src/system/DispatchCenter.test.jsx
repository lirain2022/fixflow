import {render,screen,fireEvent} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import DispatchCenter from './DispatchCenter';
it('finds closed tickets without equipment and opens their saved costs',async()=>{
 const ticket={id:9,ticketNo:'FIX-9',title:'一般報修費用',location:'B1',priority:'LOW',status:'CLOSED',asset:null,createdBy:{id:1,name:'Owner'},assignedTo:{id:1,name:'Owner'},attachments:[],comments:[],activities:[],repairs:[],repairCostSummary:{recordedRepairs:1,recordedTotal:450}};
 const api=vi.fn(async path=>path==='/workspace/technicians'||path==='/users/technicians'?[]:path==='/tickets/9'?ticket:{items:path.includes('status=CLOSED')?[ticket]:[],total:path.includes('status=CLOSED')?1:0,totalPages:1});
 render(<DispatchCenter api={api} user={{id:1,role:'CUSTOMER'}} onNavigate={()=>{}}/>);
 await screen.findByText('目前沒有待派工單');fireEvent.click(screen.getByRole('button',{name:'已結案／費用'}));
 expect(await screen.findByText('一般報修費用')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'查看費用 一般報修費用'}));
 expect(await screen.findByLabelText('維修費用',{exact:true})).toHaveTextContent('NT$ 450.00');
 expect(screen.queryByRole('button',{name:'儲存費用草稿'})).not.toBeInTheDocument();
});
it.each(['CUSTOMER','TECHNICIAN'])('lets a standard or legacy account open dispatch (%s)',async(role)=>{
 const api=vi.fn(async path=>path==='/workspace/technicians'?[]:{items:[],total:0,totalPages:0}),navigate=vi.fn();
 render(<DispatchCenter api={api} user={{id:1,role}} onNavigate={navigate}/>);
 expect(await screen.findByText('目前沒有待派工單')).toBeInTheDocument();
 expect(screen.queryByText('由報修人員或管理員安排派工')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'查看已派工單'}));
 await screen.findByText('目前沒有已派工單');expect(navigate).not.toHaveBeenCalled();
 expect(api.mock.calls.some(([path])=>path.includes('status=ASSIGNED'))).toBe(true);
});
