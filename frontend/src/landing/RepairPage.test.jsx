import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import RepairPage from './RepairPage';
import {request} from '../system/api';
import {saveHandoff} from '../system/landingHandoff';
vi.mock('../system/api',async original=>({...await original(),request:vi.fn()}));
beforeEach(()=>{sessionStorage.clear();history.replaceState(null,'','/repair.html?service=network');vi.resetAllMocks();request.mockImplementation(async path=>path==='/auth/member-login'?{token:'member'}:path==='/users/me'?{name:'會員',role:'CUSTOMER'}:path==='/member/summary'?{active:0,awaitingAcceptance:0,closed:0}:{items:[],total:0,totalPages:0});});
afterEach(cleanup);
it('logs in on the repair page then shows one combined form with no dashboard duplication',async()=>{
 render(<RepairPage/>);expect(screen.queryByLabelText('問題標題')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Email'),{target:{value:'member@example.com'}});fireEvent.change(screen.getByLabelText('密碼'),{target:{value:'Member12345!'}});fireEvent.click(screen.getByRole('button',{name:'登入',exact:true}));
 await screen.findByRole('heading',{name:'新增報修',exact:true});expect(screen.getAllByLabelText('問題標題')).toHaveLength(1);expect(screen.getByLabelText('問題分類')).toHaveValue('NETWORK');
 expect(screen.getByRole('button',{name:'加入零件需求'})).toBeInTheDocument();expect(screen.getAllByRole('button',{name:'送出報修',exact:true})).toHaveLength(1);
 expect(screen.queryByLabelText('報修狀態摘要')).not.toBeInTheDocument();expect(screen.queryByLabelText('會員導覽')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'＋ 新增報修'})).not.toBeInTheDocument();
});
it('restores a saved report instead of overwriting it with the service link',async()=>{
 sessionStorage.setItem('fixflow.session.v1',JSON.stringify({token:'member'}));
 saveHandoff({title:'冷氣故障',description:'不冷',location:'3F',category:'AIR_CONDITIONING',priority:'LOW'});
 render(<RepairPage/>);await screen.findByLabelText('問題標題');expect(screen.getByLabelText('問題標題')).toHaveValue('冷氣故障');expect(screen.getByLabelText('問題分類')).toHaveValue('AIR_CONDITIONING');
});
it('does not restore report text deliberately cleared by the user',async()=>{
 sessionStorage.setItem('fixflow.session.v1',JSON.stringify({token:'member'}));render(<RepairPage/>);await screen.findByLabelText('問題標題');
 fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'暫存內容'}});fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:''}});cleanup();render(<RepairPage/>);expect(await screen.findByLabelText('問題標題')).toHaveValue('');
});