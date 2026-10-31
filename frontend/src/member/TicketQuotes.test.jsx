import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import TicketQuotes from './TicketQuotes';
const q={id:5,version:0,laborCost:'100.10',partsCost:'200.20',total:'300.30',description:'更換 SSD',status:'PENDING',createdAt:'2026-10-29T00:00:00Z'};
const data=latest=>({eligible:true,active:true,latest,history:latest?[latest]:[]});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('admin sends a single exact estimate with the expected previous revision',async()=>{
 const api=vi.fn(async(path,method)=>method==='POST'?data(q):data(null));render(<TicketQuotes ticketId={1} api={api} admin/>);
 fireEvent.click(await screen.findByRole('button',{name:'建立報價'}));
 fireEvent.change(screen.getByLabelText('預估人工費（NT$）'),{target:{value:'100.10'}});fireEvent.change(screen.getByLabelText('預估零件費（NT$）'),{target:{value:'200.20'}});fireEvent.change(screen.getByLabelText('報價說明'),{target:{value:'更換 SSD'}});
 expect(screen.getByText('預估合計 NT$ 300.30')).toBeVisible();
 const submit=screen.getByRole('button',{name:'送出報價'});fireEvent.click(submit);fireEvent.click(submit);
 await waitFor(()=>expect(api.mock.calls.filter(c=>c[1]==='POST')).toEqual([['/tickets/1/quotes','POST',{previousQuoteId:null,laborCost:'100.10',partsCost:'200.20',description:'更換 SSD'}]]));
});
it('member sees pending amount immediately and accepts that exact revision',async()=>{
 vi.spyOn(window,'confirm').mockReturnValue(true);const api=vi.fn(async(path,method)=>method==='POST'?data({...q,status:'ACCEPTED',version:1}):data(q));render(<TicketQuotes ticketId={1} api={api}/>);
 const accept=await screen.findByRole('button',{name:'同意此報價'});expect(accept).toBeVisible();fireEvent.click(accept);
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/member/tickets/1/quotes/respond','POST',{quoteId:5,version:0,decision:'ACCEPTED',message:''}));
 await waitFor(()=>expect(screen.queryByRole('button',{name:'同意此報價'})).not.toBeInTheDocument());
});
it('member can request clarification without approving the quote',async()=>{
 const api=vi.fn(async(path,method)=>method==='POST'?data({...q,status:'CHANGES_REQUESTED',response:'可否保留舊零件？'}):data(q));render(<TicketQuotes ticketId={1} api={api}/>);
 fireEvent.click(await screen.findByRole('button',{name:'對報價有疑問'}));fireEvent.change(screen.getByLabelText('報價問題'),{target:{value:'可否保留舊零件？'}});fireEvent.click(screen.getByRole('button',{name:'送出問題'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/member/tickets/1/quotes/respond','POST',{quoteId:5,version:0,decision:'CHANGES_REQUESTED',message:'可否保留舊零件？'}));
 expect(await screen.findByText('可否保留舊零件？')).toBeVisible();
});
it('unknown submission preserves entered values and requires a refresh before retry',async()=>{
 const api=vi.fn(async(path,method)=>{if(method==='POST')throw new Error('連線中斷');return data(null);});render(<TicketQuotes ticketId={1} api={api} admin/>);
 fireEvent.click(await screen.findByRole('button',{name:'建立報價'}));fireEvent.change(screen.getByLabelText('預估人工費（NT$）'),{target:{value:'125'}});fireEvent.change(screen.getByLabelText('報價說明'),{target:{value:'檢查設備'}});fireEvent.click(screen.getByRole('button',{name:'送出報價'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('連線中斷');expect(screen.getByLabelText('預估人工費（NT$）')).toHaveValue(125);expect(screen.getByRole('button',{name:'送出報價'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'重新載入報價'}));await waitFor(()=>expect(screen.getByRole('button',{name:'送出報價'})).toBeEnabled());
});
it('refreshes quote availability after rework without closing the ticket',async()=>{
 let active=false;const api=vi.fn(async()=>({...data(q),active}));
 const {rerender}=render(<TicketQuotes ticketId={1} ticketStatus="RESOLVED" api={api} admin/>);
 await waitFor(()=>expect(screen.getByText(/待確認 ·/)).toBeInTheDocument());fireEvent.click(screen.getByText('維修報價',{exact:true}));
 expect(screen.queryByRole('button',{name:'重新報價',exact:true})).not.toBeInTheDocument();
 active=true;rerender(<TicketQuotes ticketId={1} ticketStatus="ASSIGNED" api={api} admin/>);
 expect(await screen.findByRole('button',{name:'重新報價',exact:true})).toBeVisible();
 active=false;rerender(<TicketQuotes ticketId={1} ticketStatus="CANCELLED" api={api} admin/>);
 await waitFor(()=>expect(screen.queryByRole('button',{name:'重新報價',exact:true})).not.toBeInTheDocument());
});
