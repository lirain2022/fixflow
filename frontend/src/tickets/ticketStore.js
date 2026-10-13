import { STATUS_LABELS, PRIORITY_LABELS, CATEGORY_LABELS } from './constants';
import { seedTickets } from './seedTickets';

export const STORAGE_KEY = 'fixflow.tickets.v1';
const fields = { title: ['標題', 100], description: ['問題描述', 2000], location: ['位置', 100] };
const owns = (dictionary, value) => typeof value === 'string' && Object.hasOwn(dictionary, value);

export function validateTicketInput(input = {}) {
  const errors = {};
  for (const [field, [label, max]] of Object.entries(fields)) {
    const value = typeof input?.[field] === 'string' ? input[field].trim() : '';
    if (!value) errors[field] = `請填寫${label}`;
    else if (value.length > max) errors[field] = `${label}最多 ${max} 字`;
  }
  if (!owns(CATEGORY_LABELS, input?.category)) errors.category = '請選擇有效的分類';
  if (!owns(PRIORITY_LABELS, input?.priority)) errors.priority = '請選擇有效的優先級';
  return errors;
}

function storageError(message, code) {
  return Object.assign(new Error(message), { code });
}

function validTickets(value) {
  if (!Array.isArray(value)) return false;
  const ids = new Set(), numbers = new Set();
  return value.every(ticket => {
    if (!ticket || typeof ticket !== 'object' || Array.isArray(ticket)) return false;
    if (Object.keys(validateTicketInput(ticket)).length || !owns(STATUS_LABELS, ticket.status)) return false;
    if (typeof ticket.id !== 'string' || !ticket.id.trim() || ids.has(ticket.id)) return false;
    if (typeof ticket.ticketNo !== 'string' || !/^FIX-\d{4}-\d{6}$/.test(ticket.ticketNo) || numbers.has(ticket.ticketNo)) return false;
    if (typeof ticket.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(ticket.createdAt) || !Number.isFinite(Date.parse(ticket.createdAt))) return false;
    if (ticket.assignedTo !== null && (typeof ticket.assignedTo !== 'string' || !ticket.assignedTo.trim())) return false;
    ids.add(ticket.id); numbers.add(ticket.ticketNo);
    return true;
  });
}

// 在方法呼叫時才存取 localStorage，讓瀏覽器封鎖儲存的錯誤能被 UI 接住。
const browserStorage = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

export function createTicketStore(storage = browserStorage, { now = () => new Date(), uuid = () => crypto.randomUUID() } = {}) {
  function save(tickets) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(tickets)); }
    catch { throw storageError('無法儲存資料，請確認瀏覽器允許本機儲存並有足夠空間。你的輸入仍保留。', 'WRITE'); }
    return tickets;
  }
  function load() {
    let raw;
    try { raw = storage.getItem(STORAGE_KEY); }
    catch { throw storageError('無法讀取資料，請允許此網站使用瀏覽器本機儲存後重試。', 'READ'); }
    if (raw === null) return save(seedTickets());
    let tickets;
    try { tickets = JSON.parse(raw); } catch { /* Report corruption below; do not overwrite. */ }
    if (!validTickets(tickets)) throw storageError('瀏覽器內的工單資料格式損毀，原始資料已保留。重設會以示範工單取代這份展示資料。', 'CORRUPT');
    return tickets;
  }
  function create(input) {
    const errors = validateTicketInput(input);
    if (Object.keys(errors).length) throw storageError(Object.values(errors)[0], 'VALIDATION');
    const tickets = load();
    const date = now(), year = date.getFullYear();
    const prefix = `FIX-${year}-`;
    const maximum = tickets.reduce((max, ticket) => ticket.ticketNo.startsWith(prefix) ? Math.max(max, Number(ticket.ticketNo.slice(prefix.length))) : max, 0);
    if (maximum >= 999999) throw storageError('本年度展示工單編號已用盡，無法新增。', 'NUMBER');
    const id = uuid();
    if (tickets.some(ticket => ticket.id === id)) throw storageError('工單識別碼重複，請再試一次。', 'ID');
    const ticket = {
      id, ticketNo: `${prefix}${String(maximum + 1).padStart(6, '0')}`,
      title: input.title.trim(), description: input.description.trim(), location: input.location.trim(),
      category: input.category, priority: input.priority, status: 'OPEN', assignedTo: null, createdAt: date.toISOString(),
    };
    return save([ticket, ...tickets]);
  }
  return { load, create, reset: () => save(seedTickets()) };
}

export function filterTickets(tickets, query, status) {
  const term = query.trim().toLocaleLowerCase();
  return tickets.filter(ticket => (status === 'ALL' || ticket.status === status)
    && [ticket.ticketNo, ticket.title, ticket.location].some(value => value.toLocaleLowerCase().includes(term)));
}
