import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../tickets/constants';
import Icon from './Icon';

function Status({ value }) { return <span className={`status-tag status-${value}`}><span className="status-dot" />{STATUS_LABELS[value]}</span>; }
function Priority({ value }) { return <span className={`priority priority-${value}`}><span aria-hidden="true">{value === 'CRITICAL' ? '↑↑' : value === 'HIGH' ? '↑' : value === 'LOW' ? '↓' : '–'}</span>{PRIORITY_LABELS[value]}</span>; }
function Assignee({ name }) { return name ? <span className="assignee"><span className="avatar">{name.slice(0, 1)}</span>{name}</span> : <span className="unassigned">尚未指派</span>; }
function Category({ value }) { return <span className="category-tag">{CATEGORY_LABELS[value]}</span>; }

export default function TicketList({ tickets, onClearFilters }) {
  if (!tickets.length) return <div className="empty-state"><div className="empty-icon"><Icon name="search" size={28} /></div><h3>找不到符合條件的工單</h3><p>試試其他關鍵字，或清除篩選條件。</p><button className="button secondary" onClick={onClearFilters}>清除篩選</button></div>;
  return <>
    <div className="table-wrap"><table><caption className="sr-only">維修工單列表</caption><thead><tr><th scope="col">工單 / 問題</th><th scope="col">分類</th><th scope="col">位置</th><th scope="col">優先級</th><th scope="col">狀態</th><th scope="col">負責人</th></tr></thead><tbody>
      {tickets.map(ticket => <tr key={ticket.id}><td className="ticket-cell"><span className="ticket-number">{ticket.ticketNo}</span><span className="ticket-title">{ticket.title}</span></td><td><Category value={ticket.category} /></td><td><span className="location"><Icon name="pin" size={15} />{ticket.location}</span></td><td><Priority value={ticket.priority} /></td><td><Status value={ticket.status} /></td><td><Assignee name={ticket.assignedTo} /></td></tr>)}
    </tbody></table></div>
    <div className="ticket-cards">{tickets.map(ticket => <article className="ticket-card" key={ticket.id}><div className="card-top"><span className="ticket-number">{ticket.ticketNo}</span><Status value={ticket.status} /></div><h3>{ticket.title}</h3><div className="card-location"><Icon name="pin" size={15} />{ticket.location}</div><div className="card-bottom"><div><Category value={ticket.category} /><Priority value={ticket.priority} /></div><Assignee name={ticket.assignedTo} /></div></article>)}</div>
  </>;
}
