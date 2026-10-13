import { useEffect, useRef, useState } from 'react';
import { CATEGORY_LABELS, PRIORITY_LABELS } from '../tickets/constants';
import { validateTicketInput } from '../tickets/ticketStore';
import Icon from './Icon';

const defaults = { title: '', description: '', category: '', priority: 'MEDIUM', location: '' };

export default function CreateTicketDialog({ onCreate, onCreated, onClose }) {
  const dialogRef = useRef(null), formRef = useRef(null);
  const [values, setValues] = useState(defaults);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    formRef.current.elements.title.focus();
    return () => dialog.close();
  }, []);
  function update(event) {
    const { name, value } = event.target;
    setValues(previous => ({ ...previous, [name]: value }));
    setErrors(previous => ({ ...previous, [name]: undefined }));
    setSaveError('');
  }
  function submit(event) {
    event.preventDefault();
    const invalid = validateTicketInput(values);
    setErrors(invalid); setSaveError('');
    if (Object.keys(invalid).length) {
      formRef.current.elements[Object.keys(invalid)[0]].focus();
      return;
    }
    try { onCreated(onCreate(values)); }
    catch (error) { setSaveError(error.message || '儲存失敗，請重試。'); }
  }
  function attributes(name) {
    return { id: name, name, value: values[name], onChange: update, required: true,
      'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `${name}-error` : undefined };
  }
  function errorFor(name) { return errors[name] && <span className="field-error" id={`${name}-error`}>{errors[name]}</span>; }
  function keepFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return <dialog className="ticket-dialog" ref={dialogRef} aria-labelledby="dialog-title" aria-describedby="dialog-description" onKeyDown={keepFocus} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="dialog-heading"><div className="dialog-icon"><Icon name="tickets" size={23} /></div><button type="button" className="icon-button" aria-label="關閉新增工單" onClick={onClose}><Icon name="close" /></button><div><p className="eyebrow">建立一筆新的報修</p><h2 id="dialog-title">新增工單</h2><p id="dialog-description">描述遇到的問題，讓維修從這裡開始。</p></div></header>
    <form ref={formRef} noValidate onSubmit={submit}>
      <div className="form-fields">
        <p className="required-note">所有欄位皆為必填</p>
        <div className="field"><label htmlFor="title">標題</label><input {...attributes('title')} maxLength={100} placeholder="例如：三樓會議室冷氣漏水" />{errorFor('title')}</div>
        <div className="field"><div className="label-row"><label htmlFor="description">問題描述</label><span>{values.description.length} / 2000</span></div><textarea {...attributes('description')} maxLength={2000} rows={4} placeholder="發生了什麼問題？何時開始？請盡可能描述清楚。" />{errorFor('description')}</div>
        <div className="form-row"><div className="field"><label htmlFor="category">分類</label><select {...attributes('category')}><option value="">請選擇問題分類</option>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errorFor('category')}</div><div className="field"><label htmlFor="priority">優先級</label><select {...attributes('priority')}>{Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errorFor('priority')}</div></div>
        <div className="field"><label htmlFor="location">位置</label><input {...attributes('location')} maxLength={100} placeholder="例如：3F・會議室 A" />{errorFor('location')}</div>
        <p className="form-note"><Icon name="info" size={16} />建立後將標示為「待派工」，尚未指派負責人。</p>
        {saveError && <div className="error-notice" role="alert">{saveError}</div>}
      </div>
      <footer className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>取消</button><button type="submit" className="button primary"><Icon name="plus" size={18} />建立工單</button></footer>
    </form>
  </dialog>;
}
