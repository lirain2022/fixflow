import {render,screen,waitFor,cleanup,fireEvent,within} from '@testing-library/react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import MemberApp from './MemberApp';
import {request} from '../system/api';
import {saveHandoff,readHandoff} from '../system/landingHandoff';
vi.mock('../system/api',async original=>({...await original(),request:vi.fn()}));
beforeEach(()=>{sessionStorage.clear();history.replaceState(null,'','/member.html');vi.resetAllMocks();});
afterEach(cleanup);
it('does not reuse or remove an administrator session through a query parameter',async()=>{
 sessionStorage.setItem('fixflow.admin-session.v1',JSON.stringify({token:'admin-token'}));
 history.replaceState(null,'','/member.html?portal=admin');
 request.mockResolvedValue({name:'Admin',role:'ADMIN'});
 render(<MemberApp/>);
 await screen.findByRole('heading',{name:'會員登入',exact:true});
 expect(request).not.toHaveBeenCalled();
 expect(JSON.parse(sessionStorage.getItem('fixflow.admin-session.v1')).token).toBe('admin-token');
});
it('expired login preserves the report draft and clears member data',async()=>{
 sessionStorage.setItem('fixflow.session.v1',JSON.stringify({token:'expired'}));
 saveHandoff({title:'尚未送出',description:'漏水',location:'3F',category:'OTHER',priority:'LOW'});
 request.mockRejectedValue(Object.assign(new Error('登入已過期'),{status:401}));
 render(<MemberApp/>);
 await screen.findByRole('heading',{name:'會員登入',exact:true});
 expect(sessionStorage.getItem('fixflow.session.v1')).toBeNull();
 expect(readHandoff().title).toBe('尚未送出');
 expect(screen.queryByText('你的報修與零件需求，都在這裡。')).not.toBeInTheDocument();
});
it('unknown next destinations stay in the member ticket list',async()=>{
 history.replaceState(null,'','/member.html?next=https://example.com');
 sessionStorage.setItem('fixflow.session.v1',JSON.stringify({token:'member'}));
 request.mockImplementation(async path=>path==='/users/me'?{name:'會員甲',role:'CUSTOMER'}:path==='/member/summary'?{active:0,awaitingAcceptance:0,closed:0}:{items:[],total:0,totalPages:0});
 render(<MemberApp/>);
 await screen.findByRole('heading',{name:'我的報修',exact:true});
 expect(screen.queryByRole('heading',{name:'新增報修',exact:true})).not.toBeInTheDocument();
});
it('refreshes the summary immediately after accepting a repair',async()=>{
 sessionStorage.setItem('fixflow.session.v1',JSON.stringify({token:'member'}));
 vi.spyOn(window,'confirm').mockReturnValue(true);
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 let closed=false;
 const ticket=()=>({id:1,ticketNo:'FIX-1',title:'測試報修',status:closed?'CLOSED':'RESOLVED',repairs:[],comments:[],attachments:[]});
 request.mockImplementation(async path=>{
  if(path==='/users/me')return {name:'會員甲',role:'CUSTOMER'};
  if(path==='/member/summary')return {active:0,awaitingAcceptance:closed?0:1,closed:closed?1:0};
  if(path==='/member/tickets/1/accept'){closed=true;return ticket();}
  if(path==='/member/tickets/1')return ticket();
  if(path.endsWith('/part-requests'))return [];
  return {items:[ticket()],total:1,totalPages:1};
 });
 render(<MemberApp/>);
 fireEvent.click(await screen.findByRole('button',{name:/測試報修/}));
 fireEvent.click(await screen.findByRole('button',{name:'確認驗收',exact:true}));
 await screen.findByText('已結案，你仍可查閱維修紀錄與費用。');
 const summary=screen.getByLabelText('報修狀態摘要');
 await waitFor(()=>expect(within(summary).getByText('已結案').parentElement).toHaveTextContent('1'));
});
