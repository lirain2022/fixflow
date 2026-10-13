import {useEffect,useRef} from 'react';
export default function Modal({title,onClose,children,drawer=false}){
  const ref=useRef(null);const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{const element=ref.current,trigger=document.activeElement;element.showModal();return()=>{element.close();trigger?.focus();};},[]);
  return <dialog ref={ref} className={`ticket-dialog ${drawer?'system-drawer':''}`} aria-labelledby="modal-title" onCancel={event=>{event.preventDefault();close.current();}}><header className="dialog-heading"><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" aria-label="關閉視窗" onClick={onClose}>✕</button></header>{children}</dialog>;
}
