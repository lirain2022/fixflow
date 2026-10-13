import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import ChangePassword from './ChangePassword';

it('requires matching passwords and submits only current and new password',async()=>{
  const api=vi.fn().mockResolvedValue(null),onDone=vi.fn();
  render(<ChangePassword api={api} onDone={onDone} onClose={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('目前密碼'),{target:{value:'Current123!'}});fireEvent.change(screen.getByLabelText('新密碼',{exact:true}),{target:{value:'Updated456!'}});fireEvent.change(screen.getByLabelText('再次輸入新密碼'),{target:{value:'Mismatch789!'}});
  fireEvent.click(screen.getByRole('button',{name:'確認修改密碼'}));expect(await screen.findByRole('alert')).toHaveTextContent('不一致');expect(api).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('再次輸入新密碼'),{target:{value:'Updated456!'}});fireEvent.click(screen.getByRole('button',{name:'確認修改密碼'}));
  await waitFor(()=>expect(onDone).toHaveBeenCalled());expect(api).toHaveBeenCalledWith('/users/me/password','POST',{currentPassword:'Current123!',newPassword:'Updated456!'});
});
