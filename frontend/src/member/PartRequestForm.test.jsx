import {render,screen,fireEvent,waitFor} from '@testing-library/react';import {it,expect,vi} from 'vitest';import PartRequestForm from './PartRequestForm';
it('keeps the draft but prevents submission when the ticket has already entered acceptance',async()=>{
 const api=vi.fn().mockRejectedValue(Object.assign(new Error('此工單已進入驗收或已結束，無法新增零件需求'),{status:409}));
 render(<PartRequestForm ticketId={7} api={api} onSaved={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText('零件名稱'),{target:{value:'SSD'}});
 fireEvent.change(screen.getByLabelText('用途與規格'),{target:{value:'升級'}});
 fireEvent.click(screen.getByRole('button',{name:'送出零件需求'}));
 await screen.findByRole('alert');
 expect(screen.getByLabelText('零件名稱')).toHaveValue('SSD');
 expect(screen.getByRole('button',{name:'送出零件需求'})).toBeDisabled();
});
it('failed reconciliation keeps an uncertain submission blocked and shows the reload error',async()=>{
 render(<PartRequestForm ticketId={7} api={vi.fn().mockRejectedValue(new Error('連線中斷'))} onSaved={vi.fn()} onReload={vi.fn().mockRejectedValue(new Error('仍然無法連線'))}/>);
 fireEvent.change(screen.getByLabelText('零件名稱'),{target:{value:'SSD'}});
 fireEvent.change(screen.getByLabelText('用途與規格'),{target:{value:'升級'}});
 fireEvent.click(screen.getByRole('button',{name:'送出零件需求'}));
 fireEvent.click(await screen.findByRole('button',{name:'重新載入確認是否已送出'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('仍然無法連線');
 expect(screen.getByRole('button',{name:'送出零件需求'})).toBeDisabled();
});
it('submits a part request without cost fields and retains failed input',async()=>{const api=vi.fn().mockRejectedValue(new Error('需求未送出'));render(<PartRequestForm ticketId={7} api={api} onSaved={vi.fn()}/>);fireEvent.change(screen.getByLabelText('零件名稱'),{target:{value:'SSD'}});fireEvent.change(screen.getByLabelText('用途與規格'),{target:{value:'增加儲存空間'}});fireEvent.click(screen.getByRole('button',{name:'送出零件需求'}));await waitFor(()=>expect(api).toHaveBeenCalledWith('/member/tickets/7/part-requests','POST',{name:'SSD',quantity:1,purpose:'增加儲存空間',referenceUrl:''}));expect(await screen.findByRole('alert')).toHaveTextContent('需求未送出');expect(screen.getByLabelText('零件名稱')).toHaveValue('SSD');});
