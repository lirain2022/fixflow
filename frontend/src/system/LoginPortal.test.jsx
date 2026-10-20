import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import AuthScreen from './AuthScreen';
import {request,readSession,saveSession} from './api';
vi.mock('./api',async original=>({...await original(),request:vi.fn()}));
beforeEach(()=>{sessionStorage.clear();vi.clearAllMocks();window.history.replaceState(null,'','/system.html');});
it('keeps member and administrator sessions separate',()=>{
 saveSession('member-token');
 window.history.replaceState(null,'','/system.html?portal=admin');expect(readSession()).toBeNull();
 saveSession('admin-token');expect(readSession()).toBe('admin-token');
 window.history.replaceState(null,'','/system.html');expect(readSession()).toBe('member-token');
});
it('administrator login has no self-registration and uses the admin endpoint',async()=>{
 const done=vi.fn();request.mockResolvedValue({token:'admin',user:{role:'ADMIN'}});
 render(<AuthScreen portal="admin" onLogin={done}/>);
 expect(screen.getByRole('heading',{name:'管理員登入'})).toBeVisible();
 expect(screen.queryByRole('button',{name:/建立報修帳號/})).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Email'),{target:{value:'admin@example.com'}});
 fireEvent.change(screen.getByLabelText('密碼'),{target:{value:'test-password'}});
 fireEvent.click(screen.getByRole('button',{name:'登入',exact:true}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith('/auth/admin-login','POST',{email:'admin@example.com',password:'test-password'}));
});
it('member login preserves registration and uses the member endpoint',async()=>{
 request.mockRejectedValue(new Error('後端尚未啟動'));
 render(<AuthScreen portal="member" onLogin={()=>{}}/>);
 expect(screen.getByRole('heading',{name:'會員登入'})).toBeVisible();
 fireEvent.change(screen.getByLabelText('Email'),{target:{value:'member@example.com'}});
 fireEvent.change(screen.getByLabelText('密碼'),{target:{value:'test-password'}});
 fireEvent.click(screen.getByRole('button',{name:'登入',exact:true}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith('/auth/member-login','POST',expect.any(Object)));
 expect(await screen.findByRole('alert')).toHaveTextContent('後端尚未啟動');
});
