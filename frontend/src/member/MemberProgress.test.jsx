import {render,screen,fireEvent,cleanup,waitFor,act} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import MemberTicketDetail from './MemberTicketDetail';
import MemberFeed from './MemberFeed';
const ticket={id:4,ticketNo:'FIX-4',title:'筆電維修',status:'RESOLVED',description:'完整問題說明',location:'台北',repairs:[],comments:[],attachments:[]};
const part={id:8,ticketId:4,ticketNo:'FIX-4',name:'SSD',quantity:1,status:'REVIEWED',purpose:'很長的需求內容',reply:'已確認相容',createdAt:'2026-10-29T00:00:00Z'};
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('keeps acceptance visible and expands supplemental details only when requested',async()=>{
 const api=vi.fn(async path=>path.endsWith('/part-requests')?[part]:ticket);
 render(<MemberTicketDetail id={4} api={api} onBack={()=>{}}/>);
 expect(await screen.findByRole('button',{name:'確認驗收',exact:true})).toBeVisible();
 const description=screen.getByText('完整問題說明');expect(description).not.toBeVisible();
 fireEvent.click(screen.getByText('報修資料',{exact:true}));expect(description).toBeVisible();
 expect(screen.getByText('報修照片',{exact:true}).closest('details')).not.toHaveAttribute('open');
 expect(await screen.findByText('已確認相容')).not.toBeVisible();
 fireEvent.click(screen.getByText('零件需求',{exact:true}));expect(screen.getByText('已確認相容')).toBeVisible();
});
it('opens parts on a notification link while preserving the rest of the compact detail',async()=>{
 Element.prototype.scrollIntoView=vi.fn();
 render(<MemberTicketDetail id={4} focusId={8} api={async path=>path.endsWith('/part-requests')?[part]:ticket} onBack={()=>{}}/>);
 expect(await screen.findByText('已確認相容')).toBeVisible();
 await waitFor(()=>expect(screen.getByText('零件需求',{exact:true}).closest('details')).toHaveAttribute('open'));
 expect(screen.getByText('完整問題說明')).not.toBeVisible();
});
it('parts lookup shows a compact index and opens the owning ticket and part',async()=>{
 const onOpen=vi.fn();render(<MemberFeed type="part-requests" api={async()=>({items:[part],total:1,totalPages:1})} onOpen={onOpen}/>);
 const row=await screen.findByRole('button',{name:/SSD/});
 expect(screen.queryByText('很長的需求內容')).not.toBeInTheDocument();
 expect(screen.queryByText('已確認相容')).not.toBeInTheDocument();
 expect(row).toHaveTextContent('FIX-4');expect(row).toHaveTextContent('已回覆');
 fireEvent.click(row);expect(onOpen).toHaveBeenCalledWith(4,8);
});
it('shows when a collapsed cost total is only partially recorded',async()=>{
 render(<MemberTicketDetail id={4} api={async path=>path.endsWith('/part-requests')?[]:{...ticket,repairCostSummary:{recordedRepairs:1,recordedTotal:200,unpricedRepairs:1}}} onBack={()=>{}}/>);
 expect(await screen.findByText('部分費用未登錄')).toBeVisible();
 expect(screen.getByText('部分費用未登錄').closest('details')).not.toHaveAttribute('open');
});
it('reopens both parts panels when a pending submission fails after being collapsed',async()=>{
 let reject;
 const api=vi.fn(async(path,method)=>method==='POST'?await new Promise((_,r)=>{reject=r;}):path.endsWith('/part-requests')?[]:{...ticket,status:'OPEN'});
 render(<MemberTicketDetail id={4} api={api} onBack={()=>{}}/>);
 fireEvent.click(await screen.findByText('零件需求',{exact:true}));
 fireEvent.click(screen.getByText('補充零件需求',{exact:true}));
 fireEvent.change(screen.getByLabelText('零件名稱'),{target:{value:'SSD'}});
 fireEvent.change(screen.getByLabelText('用途與規格'),{target:{value:'升級'}});
 fireEvent.click(screen.getByRole('button',{name:'送出零件需求'}));
 fireEvent.click(screen.getByText('補充零件需求',{exact:true}));fireEvent.click(screen.getByText('零件需求',{exact:true}));
 await act(async()=>reject(new Error('連線中斷')));
 expect(await screen.findByRole('alert')).toBeVisible();
 expect(screen.getByRole('button',{name:'重新載入確認是否已送出'})).toBeVisible();
 expect(screen.getByLabelText('零件名稱')).toHaveValue('SSD');
});
