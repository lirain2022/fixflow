import {useState} from 'react';
import Modal from './Modal';
import {CATEGORY_LABELS} from '../tickets/constants';

export default function AssetForm({asset,api,onDone,onClose}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event){
    event.preventDefault();const form=event.currentTarget;const values=Object.fromEntries(new FormData(form));
    const body={...values,code:values.code.trim(),enabled:values.enabled==='on',warrantyUntil:values.warrantyUntil||null,version:asset?.version??null};
    setBusy(true);setError('');
    try{onDone(await api(asset?`/assets/${asset.id}`:'/assets',asset?'PUT':'POST',body));}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <Modal title={asset?'編輯設備':'新增設備'} onClose={()=>!busy&&onClose()}><form onSubmit={submit}><div className="form-fields">
    <p className="required-note">型號與保固日期可留空，其餘資料必填。</p>
    <label className="field">設備編號<input name="code" required maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9_\-]*" defaultValue={asset?.code} placeholder="例如：AC-3F-001"/></label><p className="muted">限英文字母、數字、底線與連字號，系統統一為大寫。</p>
    <label className="field">設備名稱<input name="name" required maxLength={120} defaultValue={asset?.name} placeholder="例如：三樓會議室冷氣"/></label>
    <label className="field">設備位置<input name="location" required maxLength={200} defaultValue={asset?.location}/></label>
    <div className="form-row"><label className="field">設備分類<select aria-label="設備分類" name="category" defaultValue={asset?.category||'OTHER'}>{Object.entries(CATEGORY_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="field">型號（選填）<input name="model" maxLength={120} defaultValue={asset?.model}/></label></div>
    <label className="field">保固到期日（選填）<input name="warrantyUntil" type="date" defaultValue={asset?.warrantyUntil||''}/></label>
    <label className="asset-enabled"><input name="enabled" type="checkbox" defaultChecked={asset?.enabled??true}/>啟用設備</label><p className="muted">停用後無法建立新的關聯報修，但仍保留維修履歷。有未結案工單時不能停用。</p>
    {error&&<p role="alert" className="error-notice">{error}</p>}
    </div><footer className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>取消</button><button className="button primary" disabled={busy}>{busy?'儲存中…':'儲存設備'}</button></footer></form></Modal>;
}
