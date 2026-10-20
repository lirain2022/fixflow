import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import SystemApp from './SystemApp';
import {request,readSession} from './api';
import {saveHandoff,readHandoff} from './landingHandoff';
vi.mock('./api',()=>({request:vi.fn(),readSession:vi.fn(()=>null),saveSession:vi.fn()}));
vi.mock('./WorkspaceHome',()=>({default:()=> <h1>工作首頁</h1>}));
vi.mock('./NotificationBell',()=>({default:()=>null}));
beforeEach(()=>{
 localStorage.clear();sessionStorage.clear();vi.clearAllMocks();readSession.mockReturnValue(null);
 window.history.replaceState(null,'','/system.html?action=new');
 request.mockImplementation(async(path)=>{
  if(path==='/auth/member-login')return {token:'test',user:{id:12,name:'使用者',role:'CUSTOMER'}};
  if(path==='/users/me')return {id:12,name:'使用者',role:'CUSTOMER'};
  if(path.startsWith('/tickets?'))return {items:[],total:0,totalPages:0};
  return [];
 });
});
async function login(){
 fireEvent.change(screen.getByLabelText('Email'),{target:{value:'person@example.com'}});
 fireEvent.change(screen.getByLabelText('密碼'),{target:{value:'password123'}});
 fireEvent.click(screen.getByRole('button',{name:'登入',exact:true}));
 return screen.findByLabelText('問題描述');
}
it('retains the landing request through login and cancellation clears the intent',async()=>{
 saveHandoff('冷氣不冷','AIR_CONDITIONING');render(<SystemApp/>);
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(await login()).toHaveValue('冷氣不冷');
 expect(request.mock.calls.some(([p,m])=>p==='/tickets'&&m==='POST')).toBe(false);
 vi.spyOn(window,'confirm').mockReturnValue(true);
 fireEvent.click(await screen.findByRole('button',{name:'取消',exact:true}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 expect(readHandoff()).toBeNull();expect(window.location.search).toBe('');
});
it('retains the report when an expired session requires signing in again',async()=>{
 saveHandoff('Wi-Fi 斷線','NETWORK');readSession.mockReturnValue('expired');
 request.mockImplementation(async(path,method,body,token)=>{
  if(path==='/users/me'&&token==='new')return {id:12,name:'使用者',role:'CUSTOMER'};
  if(path==='/users/me')throw Object.assign(new Error('expired'),{status:401});
  if(path==='/auth/member-login')return {token:'new',user:{id:12,name:'使用者',role:'CUSTOMER'}};
  return [];
 });
 render(<SystemApp/>);await screen.findByLabelText('Email');
 expect(await login()).toHaveValue('Wi-Fi 斷線');
});
