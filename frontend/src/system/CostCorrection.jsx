import {useRef,useState} from 'react';
import Modal from './Modal';
import RepairCompletionForm from './RepairCompletionForm';
import {money} from './repairMoney';
export default function CostCorrection({ticket,repair,api,onClose,onDone}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const guard=useRef(null),sending=useRef(false);
 const [draft]=useState(()=>({content:'',workHours:repair?.workHours??0,laborCost:repair?.laborCost??'',parts:repair?.parts??[]}));
 function close(){if(busy||sending.current)return;if(!guard.current?.dirty||window.confirm('費用更正尚未儲存，確定放棄這次輸入？'))onClose();}
 async function submit(body){if(sending.current)return false;sending.current=true;setBusy(true);setError('');try{const updated=await api('/tickets/'+ticket.id+'/cost-corrections','POST',{repairId:repair?.id??null,version:ticket.version,reason:body.description,workHours:body.workHours,laborCost:body.laborCost,parts:body.parts});onDone(updated);return true;}catch(e){setError(e.message);return false;}finally{sending.current=false;setBusy(false);}}
 return <Modal title={repair?.totalCost==null?'補登維修費用':'更正維修費用'} onClose={close}><div className="form-fields"><p>{ticket.ticketNo} · {repair?.content||'補登維修費用'}</p><p>原登錄合計：{repair?.totalCost==null?'尚未登錄':money(repair.totalCost)}</p>{error&&<p role="alert" className="error-notice">{error}</p>}<RepairCompletionForm correction guardRef={guard} busy={busy} draft={draft} onSubmit={submit}/></div><footer className="dialog-actions"><button className="button secondary" disabled={busy} onClick={close}>取消更正</button></footer></Modal>;
}
