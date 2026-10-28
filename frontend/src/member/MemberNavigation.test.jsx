import {render,screen,fireEvent,waitFor,cleanup,within} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import MemberApp from './MemberApp';
import {request} from '../system/api';
vi.mock('../system/api',async original=>({...await original(),request:vi.fn()}));

const tickets=Array.from({length:12},(_,i)=>({id:i+1,ticketNo:`FIX-${i+1}`,title:`冷氣 ${i+1}`,location:'客廳',status:'OPEN',repairs:[],comments:[],attachments:[]}));
const records=[...tickets,{...tickets[0],id:20,title:'等待驗收',status:'RESOLVED'},{...tickets[0],id:21,title:'完成維修',status:'CLOSED'}];
beforeEach(()=>{
 sessionStorage.clear();sessionStorage.setItem('fixflow.session.v1',JSON.stringify({token:'member'}));history.replaceState(null,'','/member.html');
 vi.resetAllMocks();vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 request.mockImplementation(async path=>{
  if(path==='/users/me')return {name:'會員',role:'CUSTOMER'};
  if(path==='/member/summary')return {active:12,awaitingAcceptance:1,closed:1};
  if(path.endsWith('/part-requests'))return [];
  if(/^\/member\/tickets\/\d+$/.test(path))return records.find(t=>t.id===Number(path.split('/').at(-1)));
  const params=new URL(path,'http://localhost').searchParams;
  const matched=records.filter(t=>(!params.get('status')||t.status===params.get('status'))&&(!params.get('query')||t.title.includes(params.get('query')))&&(params.get('active')!=='true'||['OPEN','ASSIGNED','IN_PROGRESS'].includes(t.status)));
  const page=Number(params.get('page')||0);return {items:matched.slice(page*10,page*10+10),total:matched.length,totalPages:Math.ceil(matched.length/10)};
 });
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

it('summary shortcuts select matching lists and clear an unrelated search',async()=>{
 render(<MemberApp/>);await screen.findByRole('heading',{name:'我的報修'});
 fireEvent.change(screen.getByRole('textbox',{name:'搜尋我的工單'}),{target:{value:'找不到'}});
 fireEvent.click(screen.getByRole('button',{name:'搜尋',exact:true}));await screen.findByText('目前沒有符合條件的報修工單。');
 const stats=screen.getByLabelText('報修狀態摘要');
 fireEvent.click(within(stats).getByRole('button',{name:/待驗收/}));
 await screen.findByRole('button',{name:/等待驗收/});expect(screen.getByRole('combobox',{name:'工單狀態'})).toHaveValue('RESOLVED');
 expect(screen.getByRole('textbox',{name:'搜尋我的工單'})).toHaveValue('');
 expect(within(stats).getByRole('button',{name:/待驗收/})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(within(stats).getByRole('button',{name:/已結案/}));await screen.findByRole('button',{name:/完成維修/});
 fireEvent.click(within(stats).getByRole('button',{name:/處理中/}));await screen.findByText(/共 12 筆/);
 expect(screen.getByRole('combobox',{name:'工單狀態'})).toHaveValue('ACTIVE');
 expect(screen.queryByRole('button',{name:/完成維修/})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'清除篩選'}));await screen.findByText(/共 14 筆/);
 expect(screen.getByRole('combobox',{name:'工單狀態'})).toHaveValue('');
});

it('returning from a ticket preserves search, status and current page',async()=>{
 render(<MemberApp/>);await screen.findByRole('heading',{name:'我的報修'});
 fireEvent.change(screen.getByRole('combobox',{name:'工單狀態'}),{target:{value:'OPEN'}});
 fireEvent.change(screen.getByRole('textbox',{name:'搜尋我的工單'}),{target:{value:'冷氣'}});
 fireEvent.click(screen.getByRole('button',{name:'搜尋',exact:true}));await screen.findByText(/共 12 筆/);
 fireEvent.click(screen.getByRole('button',{name:'下一頁'}));await screen.findByText(/第 2 頁/);
 fireEvent.click(screen.getByRole('button',{name:/FIX-11/}));await screen.findByRole('heading',{name:'冷氣 11',exact:true});
 fireEvent.click(screen.getByRole('button',{name:'← 返回我的報修'}));
 await screen.findByText(/第 2 頁/);expect(screen.getByRole('textbox',{name:'搜尋我的工單'})).toHaveValue('冷氣');
 expect(screen.getByRole('combobox',{name:'工單狀態'})).toHaveValue('OPEN');
 expect(screen.getByRole('button',{name:/FIX-11/})).toBeInTheDocument();
});

it('shows a retry when summary loading fails and recovers without logging out',async()=>{
 const normal=request.getMockImplementation();let failed=true;
 request.mockImplementation((path,...args)=>path==='/member/summary'&&failed?Promise.reject(new Error('連線中斷')):normal(path,...args));
 render(<MemberApp/>);await screen.findByText('無法載入報修摘要。');failed=false;
 fireEvent.click(screen.getByRole('button',{name:'重試摘要'}));
 await waitFor(()=>expect(within(screen.getByLabelText('報修狀態摘要')).getByRole('button',{name:/處理中/})).toHaveTextContent('12'));
 expect(screen.queryByText('無法載入報修摘要。')).not.toBeInTheDocument();
});
