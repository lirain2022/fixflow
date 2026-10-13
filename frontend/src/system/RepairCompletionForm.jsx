import {useRef,useState} from 'react';
import {estimateRepair,money} from './repairMoney';

export default function RepairCompletionForm({busy,onSubmit,onSave,draft}){
  const [description,setDescription]=useState(draft?.content||''),[workHours,setWorkHours]=useState(draft?String(draft.workHours):''),[laborCost,setLaborCost]=useState(String(draft?.laborCost??0)),[parts,setParts]=useState(()=>draft?.parts?.map((p,i)=>({...p,key:i+1,quantity:String(p.quantity),unitPrice:String(p.unitPrice)}))||[]),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const nextId=useRef((draft?.parts?.length||0)+1),sending=useRef(false);const totals=estimateRepair(laborCost,parts);
  function update(key,field,value){setParts(rows=>rows.map(row=>row.key===key?{...row,[field]:value}:row));}
  async function submit(event,saving=false){
    event.preventDefault();if(busy||sending.current)return;setError('');setNotice('');
    const hours=saving&&!workHours?'0':workHours;
    if((!saving&&!description.trim())||!/^\d+(\.\d{1,2})?$/.test(hours)||Number(hours)>1000||!totals||parts.some(p=>!p.name.trim())){setError('請填寫維修紀錄、有效工時與費用；零件需填名稱、數量及單價。');return;}
    sending.current=true;
    try{const result=await (saving?onSave:onSubmit)({description:description.trim(),workHours:hours,laborCost,parts:parts.map(({name,quantity,unitPrice})=>({name:name.trim(),quantity:Number(quantity),unitPrice}))});if(saving&&result)setNotice('費用草稿已儲存，工單仍在維修中。');}catch(e){setError(e.message);}finally{sending.current=false;}
  }
  return <form className="repair-completion" onSubmit={submit}><fieldset disabled={busy} className="ticket-edit-fields">
    <label className="field">維修紀錄<textarea aria-label="維修紀錄" name="description" required maxLength={4000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="問題原因、處理方式與測試結果"/></label>
    <div className="form-row"><label className="field">實際工時（小時）<input type="number" required min="0" max="1000" step="0.01" value={workHours} onChange={e=>setWorkHours(e.target.value)} placeholder="例如 1.5"/></label><label className="field">人工費（NT$）<input type="number" required min="0" max="9999999.99" step="0.01" value={laborCost} onChange={e=>setLaborCost(e.target.value)}/></label></div>
    <p className="muted">人工費請填本次總額，無費用填 0。工時獨立記錄，不會乘上人工費。</p>
    <div className="repair-parts-heading"><h4>使用零件 <span>{parts.length}/50</span></h4><button type="button" className="button secondary" disabled={parts.length>=50} onClick={()=>setParts(rows=>[...rows,{key:nextId.current++,name:'',quantity:'1',unitPrice:'0'}])}>新增零件</button></div>
    {!parts.length&&<p className="muted">本次未使用零件可直接送出。</p>}
    {parts.map((part,index)=><fieldset className="repair-part-editor" key={part.key}><legend>零件 {index+1}</legend><label className="field">名稱<input aria-label={`零件 ${index+1} 名稱`} required maxLength={120} value={part.name} onChange={e=>update(part.key,'name',e.target.value)}/></label><div className="form-row"><label className="field">數量<input aria-label={`零件 ${index+1} 數量`} type="number" required min="1" max="999" step="1" value={part.quantity} onChange={e=>update(part.key,'quantity',e.target.value)}/></label><label className="field">單價（NT$）<input aria-label={`零件 ${index+1} 單價（NT$）`} type="number" required min="0" max="999999.99" step="0.01" value={part.unitPrice} onChange={e=>update(part.key,'unitPrice',e.target.value)}/></label></div><button type="button" className="text-button" aria-label={`移除零件 ${index+1}`} onClick={()=>setParts(rows=>rows.filter(p=>p.key!==part.key))}>移除此零件</button></fieldset>)}
    <dl className="repair-cost-grid"><div><dt>人工費</dt><dd>{totals?money(totals.labor/100):'—'}</dd></div><div><dt>零件費</dt><dd>{totals?money(totals.parts/100):'—'}</dd></div><div><dt>本次合計</dt><dd><output aria-label="預估總費用">{totals?money(totals.total/100):'請確認費用欄位'}</output></dd></div></dl>
    <p className="muted">送出後成為本次維修紀錄，請確認工時、零件與費用正確。</p>
    {error&&<p className="error-notice" role="alert">{error}</p>}{notice&&<p role="status" className="success-notice">{notice}</p>}<div className="action-row">{onSave&&<button className="button secondary" type="button" onClick={event=>submit(event,true)} disabled={busy}>儲存費用草稿</button>}<button className="button primary" disabled={busy}>{busy?'送出中…':'提交維修完成'}</button></div>
  </fieldset></form>;
}
