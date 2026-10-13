import {useState} from 'react';
import Modal from './Modal';
import {CATEGORY_LABELS,PRIORITY_LABELS} from '../tickets/constants';
import AssetPicker from './AssetPicker';
import {ticketEditReason} from './ticketEditing';
import useTicketDraft from './useTicketDraft';

export default function TicketForm({ticket,initialAsset,user,api,onDone,onClose}){
  const [source,setSource]=useState(ticket);
  const drafts=useTicketDraft(ticket,user,initialAsset);const {draft,setDraft,dirty,pending,notice,savedAt}=drafts;
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false);
  const reason=source&&user?ticketEditReason(source,user):'';
  function close(){if(!busy&&(!dirty||window.confirm('尚有未儲存的變更。關閉前請確認草稿暫存狀態；確定要離開嗎？')))onClose();}
  function update(key,value){setDraft(previous=>({...previous,[key]:value}));}
  function selectAsset(asset){setDraft(previous=>({...previous,asset,...(asset?{location:asset.location,category:asset.category}:{})}));}
  async function submit(event){
    event.preventDefault();if(reason||pending||conflict||busy)return;setBusy(true);setError('');setConflict(false);
    const {asset,...values}=draft;const body={...values,assetId:asset?.id||null,version:drafts.version};
    try{const saved=await api(source?`/tickets/${source.id}`:'/tickets',source?'PUT':'POST',body);drafts.clear();onDone(saved);}
    catch(e){setError(e.message);setConflict(e.status===409);}finally{setBusy(false);}
  }
  async function reload(){
    if(!window.confirm('重新載入會取代你尚未儲存的輸入。要載入最新工單資料嗎？'))return;
    setBusy(true);setError('');
    try{const latest=await api(`/tickets/${source.id}`);setSource(latest);drafts.reset(latest);setConflict(false);}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <Modal title={source?'編輯工單':'新增報修工單'} onClose={close}><form onSubmit={submit}><div className="form-fields">
    {pending&&<section className="draft-notice" aria-label="未送出草稿"><p>找到此帳號在這個瀏覽器的未送出草稿（{new Date(pending.savedAt).toLocaleString('zh-TW')}）。請選擇恢復或捨棄。</p><div className="action-row"><button type="button" className="button secondary" onClick={()=>{if(drafts.restore()){setConflict(true);setError('工單已更新，恢復的草稿尚未儲存。請先保留需要的內容，再載入最新工單。');}}}>恢復草稿</button><button type="button" className="text-button" onClick={drafts.discard}>捨棄草稿</button></div></section>}
    {!pending&&dirty&&savedAt&&!notice&&<p className="muted" role="status">草稿已暫存於此瀏覽器 · {new Date(savedAt).toLocaleTimeString('zh-TW')}。尚未送出，保留 7 天。</p>}
    {notice&&<p className="error-notice" role="status">{notice}</p>}
    {reason&&<p className="error-notice" role="alert">{reason}，請返回列表查看最新處理進度。</p>}
    <fieldset className="ticket-edit-fields" disabled={busy||!!reason||!!pending}>
      <p className="required-note">設備可不指定，其餘欄位皆為必填。</p><AssetPicker api={api} selected={draft.asset} onSelect={selectAsset} disabled={busy||!!reason}/>
      <label className="field">問題標題<input name="title" required maxLength={120} value={draft.title} onChange={e=>update('title',e.target.value)} placeholder="例如：三樓會議室冷氣漏水"/></label>
      <label className="field">問題描述<textarea name="description" required maxLength={4000} value={draft.description} onChange={e=>update('description',e.target.value)} placeholder="說明發生情況、時間及影響…"/></label>
      <label className="field">報修位置<input name="location" required maxLength={200} value={draft.location} onChange={e=>update('location',e.target.value)} placeholder="例如：總部 3F 會議室"/></label>
      <div className="form-row"><label className="field">問題分類<select aria-label="問題分類" name="category" value={draft.category} onChange={e=>update('category',e.target.value)}>{Object.entries(CATEGORY_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="field">優先級<select aria-label="優先級" name="priority" value={draft.priority} onChange={e=>update('priority',e.target.value)}>{Object.entries(PRIORITY_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
    </fieldset>
    <p className="muted">建立後可在詳細資訊上傳照片。SLA 依優先級自建立時間起計算。</p>
    {error&&<p role="alert" className="error-notice">{error}</p>}
    {conflict&&<div className="edit-conflict"><p>目前輸入仍保留在表單，尚未寫入工單。請先複製要保留的內容，再載入最新版本。</p><button type="button" className="button secondary" disabled={busy} onClick={reload}>重新載入最新工單</button></div>}
    </div><footer className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={close}>取消</button><button className="button primary" disabled={busy||!!reason||conflict||!!pending}>{busy?'儲存中…':source?'儲存變更':'送出報修'}</button></footer></form></Modal>;
}
