import { useEffect, useRef, useState } from 'react';
import { STATUS_LABELS } from './tickets/constants';
import { createTicketStore, filterTickets } from './tickets/ticketStore';
import TicketList from './components/TicketList';
import CreateTicketDialog from './components/CreateTicketDialog';
import Icon from './components/Icon';

const defaultStore = createTicketStore();
function read(store) { try { return { tickets: store.load(), error: null }; } catch (error) { return { tickets: [], error }; } }

export default function App({ store = defaultStore }) {
  const [{ tickets, error }, setData] = useState(() => read(store));
  const [query, setQuery] = useState(''), [status, setStatus] = useState('ALL');
  const [open, setOpen] = useState(false), [success, setSuccess] = useState('');
  const createButton = useRef(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    // Wait until the modal is removed before focusing background controls.
    if (wasOpen.current && !open) createButton.current?.focus();
    wasOpen.current = open;
  }, [open]);
  const visible = filterTickets(tickets, query, status);
  const clearFilters = () => { setQuery(''); setStatus('ALL'); };
  const closeDialog = () => setOpen(false);
  function created(updated) {
    setData({ tickets: updated, error: null }); clearFilters();
    setSuccess(`工單已建立 · ${updated[0].ticketNo}`); closeDialog();
  }
  function recover() {
    try { setData({ tickets: error.code === 'CORRUPT' ? store.reset() : store.load(), error: null }); }
    catch (next) { setData({ tickets: [], error: next }); }
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">跳到主要內容</a>
    <aside className="sidebar">
      <div className="brand"><span className="brand-symbol"><Icon name="tool" size={25} /></span><div><strong>FixFlow<span>.</span></strong><small>維修工單管理</small></div></div>
      <div className="nav-section-label">工作空間</div>
      <nav aria-label="主要導覽"><a className="nav-item active" href="#main-content" aria-current="page"><Icon name="tickets" />工單管理<span className="nav-count">{tickets.length}</span></a></nav>
      <div className="sidebar-guide"><span className="guide-line" /><p>讓每個問題，<br />都有下一步。</p><span>建立問題 <span aria-hidden="true">→</span> 指派維修 <span aria-hidden="true">→</span> 確認結案</span></div>
      <div className="workspace"><span className="workspace-avatar">F</span><div><strong>FixFlow Demo</strong><small>教學展示環境</small></div><span className="online-dot" /></div>
    </aside>
    <div className="page-shell">
      <header className="topbar"><div className="breadcrumb"><span>工作區</span><Icon name="chevron" size={13} /><strong>工單管理</strong></div><span className="local-pill"><span />本機展示</span></header>
      <main id="main-content" tabIndex={-1}>
        <section className="page-heading"><div><p className="eyebrow">每一筆報修，都有跡可循</p><h1>工單管理</h1><p className="page-description">集中管理維修需求，掌握每一筆工單的處理進度。</p></div><button ref={createButton} className="button primary create-button" disabled={!!error} onClick={() => { setSuccess(''); setOpen(true); }}><Icon name="plus" size={19} />新增工單</button></section>
        <div className="demo-notice"><Icon name="info" size={17} /><span>展示模式：資料儲存在此瀏覽器<span className="notice-detail">，尚未連接後端服務。</span></span></div>
        {success && <div className="success-notice" role="status"><Icon name="check" size={18} />{success}</div>}
        {error ? <section className="load-error" role="alert"><Icon name="info" size={30} /><h2>暫時無法載入工單</h2><p>{error.message}</p><button className="button secondary" onClick={recover}>{error.code === 'CORRUPT' ? '重設展示資料' : '重新讀取'}</button></section> :
          <section className="ticket-panel" aria-labelledby="list-heading">
            <div className="panel-heading"><div><h2 id="list-heading">所有工單 <span className="count-badge">{tickets.length}</span></h2><p>從報修到結案，清楚掌握每個環節。</p></div><span className="panel-meta">{tickets.filter(ticket => ticket.status === 'OPEN').length} 筆等待派工</span></div>
            <div className="toolbar"><div className="search-field"><Icon name="search" size={19} /><input type="search" aria-label="搜尋工單" placeholder="搜尋工單編號、標題或位置…" value={query} onChange={event => setQuery(event.target.value)} /></div><div className="filter-field"><Icon name="filter" size={18} /><label className="sr-only" htmlFor="status-filter">工單狀態</label><select id="status-filter" value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">所有狀態</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
            <TicketList tickets={visible} onClearFilters={clearFilters} />
            <footer className="panel-footer"><span>顯示 <strong>{visible.length}</strong> 筆，共 {tickets.length} 筆工單</span><span className="footer-hint">每筆紀錄，都是解決問題的起點。</span></footer>
          </section>}
        <footer className="page-footer"><span>FixFlow <span aria-hidden="true">/</span> 維修工單管理</span><span>讓維修更有條理。</span></footer>
      </main>
    </div>
    {open && <CreateTicketDialog onCreate={store.create} onCreated={created} onClose={closeDialog} />}
  </div>;
}
