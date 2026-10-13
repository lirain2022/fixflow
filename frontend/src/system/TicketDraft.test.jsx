import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import TicketForm from './TicketForm';
const user={id:81,role:'CUSTOMER'};
const ticket={id:91,version:2,title:'Original',description:'Problem',location:'Room',category:'OTHER',priority:'LOW',status:'OPEN',createdBy:{id:81}};
const api=vi.fn(async(path,method,body)=>path.startsWith('/assets')?{items:[],total:0}:{...ticket,...body,version:3});
const mount=(props={})=>render(<TicketForm ticket={ticket} user={user} api={api} onDone={()=>{}} onClose={()=>{}} {...props}/>);
beforeEach(()=>{localStorage.clear();api.mockClear();});
afterEach(()=>vi.restoreAllMocks());
it('requires confirmation for Cancel, close icon, Escape, and refresh only while dirty',()=>{
  const close=vi.fn(),confirm=vi.spyOn(window,'confirm').mockReturnValue(false);mount({onClose:close});
  fireEvent.click(screen.getByRole('button',{name:'取消',exact:true}));expect(close).toHaveBeenCalledTimes(1);expect(confirm).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'Unsaved title'}});
  fireEvent.click(screen.getByRole('button',{name:'取消',exact:true}));fireEvent.click(screen.getByRole('button',{name:'關閉視窗'}));fireEvent(screen.getByRole('dialog'),new Event('cancel',{bubbles:true,cancelable:true}));
  expect(confirm).toHaveBeenCalledTimes(3);expect(close).toHaveBeenCalledTimes(1);
  const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);
  confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'取消',exact:true}));expect(close).toHaveBeenCalledTimes(2);
});
it('offers recovery without overwriting saved fields and isolates drafts by user and ticket',async()=>{
  let view=mount();fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'My draft'}});await screen.findByText(/草稿已暫存/);view.unmount();
  view=mount({user:{id:82,role:'ADMIN'}});expect(screen.queryByRole('button',{name:'恢復草稿'})).not.toBeInTheDocument();view.unmount();
  view=mount({ticket:{...ticket,id:92}});expect(screen.queryByRole('button',{name:'恢復草稿'})).not.toBeInTheDocument();view.unmount();
  mount();expect(screen.getByLabelText('問題標題')).toHaveValue('Original');fireEvent.click(screen.getByRole('button',{name:'恢復草稿'}));expect(screen.getByLabelText('問題標題')).toHaveValue('My draft');
});
it('keeps the old server version when restoring and requires reload if the server changed',async()=>{
  let view=mount();fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'Old unsaved'}});await screen.findByText(/草稿已暫存/);view.unmount();
  mount({ticket:{...ticket,version:7,title:'New server title'}});fireEvent.click(screen.getByRole('button',{name:'恢復草稿'}));expect(screen.getByLabelText('問題標題')).toHaveValue('Old unsaved');expect(screen.getByRole('button',{name:'儲存變更'})).toBeDisabled();expect(screen.getByRole('button',{name:'重新載入最新工單'})).toBeVisible();expect(api.mock.calls.some(c=>c[1]==='PUT')).toBe(false);
});
it('clears recovered drafts on successful save and allows explicit discard',async()=>{
  let view=mount();fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'Recover me'}});await screen.findByText(/草稿已暫存/);view.unmount();
  const done=vi.fn();view=mount({onDone:done});fireEvent.click(screen.getByRole('button',{name:'恢復草稿'}));fireEvent.click(screen.getByRole('button',{name:'儲存變更'}));await waitFor(()=>expect(done).toHaveBeenCalled());view.unmount();
  view=mount();expect(screen.queryByRole('button',{name:'恢復草稿'})).not.toBeInTheDocument();fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'Discard me'}});await screen.findByText(/草稿已暫存/);view.unmount();
  mount();fireEvent.click(screen.getByRole('button',{name:'捨棄草稿'}));expect(screen.getByLabelText('問題標題')).toHaveValue('Original');expect(screen.queryByRole('button',{name:'恢復草稿'})).not.toBeInTheDocument();
});
it('reports unavailable browser storage without preventing editing or server saves',async()=>{
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota');});const done=vi.fn();mount({onDone:done});fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'Still editable'}});
  expect(await screen.findByText(/無法暫存草稿/)).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'儲存變更'}));await waitFor(()=>expect(done).toHaveBeenCalled());
});

it('removes reverted input and ignores expired or malformed drafts',async()=>{
  let view=mount();fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'Temporary'}});await screen.findByText(/草稿已暫存/);
  fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'Original'}});expect(localStorage.length).toBe(0);
  const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(false);
  fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'Too old'}});await screen.findByText(/草稿已暫存/);const key=localStorage.key(0),stored=JSON.parse(localStorage.getItem(key));view.unmount();
  localStorage.setItem(key,JSON.stringify({...stored,savedAt:Date.now()-8*24*60*60*1000}));view=mount();expect(screen.queryByRole('button',{name:'恢復草稿'})).not.toBeInTheDocument();expect(localStorage.getItem(key)).toBeNull();view.unmount();
  localStorage.setItem(key,'broken-json');mount();expect(screen.getByLabelText('問題標題')).toHaveValue('Original');expect(localStorage.getItem(key)).toBeNull();
});

it('does not overwrite or delete a draft changed in another tab',async()=>{
  mount();fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'This tab'}});await screen.findByText(/草稿已暫存/);
  const key=localStorage.key(0),stored=JSON.parse(localStorage.getItem(key));const other=JSON.stringify({...stored,fields:{...stored.fields,title:'Other tab'}});localStorage.setItem(key,other);
  fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'Keep my text'}});expect(await screen.findByText(/另一個分頁已更新草稿/)).toBeVisible();expect(localStorage.getItem(key)).toBe(other);
  fireEvent.click(screen.getByRole('button',{name:'儲存變更'}));await waitFor(()=>expect(api.mock.calls.some(c=>c[1]==='PUT')).toBe(true));expect(localStorage.getItem(key)).toBe(other);
});

it('immediately warns when another tab removes the draft, before any further typing',async()=>{
  mount();fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'Keep this locally'}});await screen.findByText(/草稿已暫存/);
  const key=localStorage.key(0);localStorage.removeItem(key);fireEvent(window,new StorageEvent('storage',{key,newValue:null,storageArea:localStorage}));
  expect(await screen.findByText(/另一個分頁已更新草稿/)).toBeVisible();expect(screen.queryByText(/草稿已暫存/)).not.toBeInTheDocument();expect(screen.getByLabelText('問題標題')).toHaveValue('Keep this locally');
});
