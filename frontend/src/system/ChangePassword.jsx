import {useState} from 'react';
import Modal from './Modal';

export default function ChangePassword({api,onDone,onClose}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event){
    event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));setError('');
    if(data.newPassword!==data.confirmPassword){setError('兩次輸入的新密碼不一致');return;}
    setBusy(true);
    try{await api('/users/me/password','POST',{currentPassword:data.currentPassword,newPassword:data.newPassword});onDone();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <Modal title="修改密碼" onClose={()=>!busy&&onClose()}><form onSubmit={submit}><div className="form-fields">
    <p className="muted">更新成功後，所有舊登入都會失效，請使用新密碼重新登入。</p>
    <label className="field">目前密碼<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={72} disabled={busy}/></label>
    <label className="field">新密碼<input name="newPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={72} disabled={busy}/></label>
    <label className="field">再次輸入新密碼<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={72} disabled={busy}/></label>
    <p className="muted">至少 10 個字元，且不可與目前密碼相同。中文等多位元組字元合計不可超過 72 bytes。</p>
    {error&&<p className="error-notice" role="alert">{error}</p>}
    </div><footer className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>取消</button><button className="button primary" disabled={busy}>{busy?'更新中…':'確認修改密碼'}</button></footer></form></Modal>;
}
