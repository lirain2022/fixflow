import { describe, expect, it } from 'vitest';
import { createTicketStore, validateTicketInput, filterTickets } from './ticketStore';
import { memoryStorage, validInput, savedTicket } from '../test/helpers';

const KEY = 'fixflow.tickets.v1';
const options = { now: () => new Date('2026-09-21T09:00:00Z'), uuid: () => 'new-id' };
describe('ticket storage', () => {
  it('seeds only a missing key and retains an intentionally empty list', () => {
    const storage = memoryStorage();
    expect(createTicketStore(storage).load()).toHaveLength(6);
    storage.setItem(KEY, '[]');
    expect(createTicketStore(storage).load()).toEqual([]);
  });
  it('creates an OPEN ticket, trims input, and persists it', () => {
    const storage = memoryStorage({ [KEY]: '[]' });
    const rows = createTicketStore(storage, options).create({ ...validInput, title: ' 冷氣漏水 ' });
    expect(rows[0]).toMatchObject({ ...validInput, id: 'new-id', ticketNo: 'FIX-2026-000001', status: 'OPEN', assignedTo: null });
    expect(createTicketStore(storage).load()).toEqual(rows);
  });
  it('uses current-year maximum across unsorted data and reloads before each create', () => {
    const storage = memoryStorage({ [KEY]: JSON.stringify([savedTicket, { ...savedTicket, id: 'old', ticketNo: 'FIX-2025-000099' }]) });
    let id = 0;
    const store = createTicketStore(storage, { ...options, uuid: () => `id-${++id}` });
    expect(store.create(validInput)[0].ticketNo).toBe('FIX-2026-000010');
    expect(store.create(validInput)[0].ticketNo).toBe('FIX-2026-000011');
  });
  it.each(['{broken', 'null', '{}', '[null]', JSON.stringify([{ ...savedTicket, priority: 'BAD' }]), JSON.stringify([savedTicket, savedTicket]), JSON.stringify([{ ...savedTicket, createdAt: 'no-date' }])])('does not overwrite damaged data: %s', raw => {
    const storage = memoryStorage({ [KEY]: raw });
    expect(() => createTicketStore(storage).load()).toThrow();
    expect(storage.getItem(KEY)).toBe(raw);
  });
  it('resets damaged data only when explicitly requested', () => {
    const storage = memoryStorage({ [KEY]: 'broken' });
    const store = createTicketStore(storage);
    expect(store.reset()).toHaveLength(6);
    expect(store.load()).toHaveLength(6);
  });
  it('preserves data and surfaces write errors', () => {
    const storage = memoryStorage({ [KEY]: '[]' });
    const store = createTicketStore({ ...storage, setItem: () => { throw new Error('QuotaExceeded'); } }, options);
    expect(() => store.create(validInput)).toThrow(/儲存/);
    expect(storage.getItem(KEY)).toBe('[]');
  });
  it('surfaces blocked reads', () => {
    expect(() => createTicketStore({ getItem: () => { throw new Error('Denied'); } }).load()).toThrow(/讀取/);
  });
  it('rejects invalid create input without writing', () => {
    const storage = memoryStorage({ [KEY]: '[]' });
    expect(() => createTicketStore(storage).create({ ...validInput, title: ' ' })).toThrow();
    expect(storage.getItem(KEY)).toBe('[]');
  });
  it('rejects exhausted six-digit numbering without overwriting', () => {
    const raw = JSON.stringify([{ ...savedTicket, ticketNo: 'FIX-2026-999999' }]);
    const storage = memoryStorage({ [KEY]: raw });
    expect(() => createTicketStore(storage, options).create(validInput)).toThrow(/編號/);
    expect(storage.getItem(KEY)).toBe(raw);
  });
});
describe('input validation', () => {
  it.each([['title', 100], ['description', 2000], ['location', 100]])('checks %s length boundary', (field, limit) => {
    expect(validateTicketInput({ ...validInput, [field]: '字'.repeat(limit) })).toEqual({});
    expect(validateTicketInput({ ...validInput, [field]: '字'.repeat(limit + 1) })[field]).toBeTruthy();
    expect(validateTicketInput({ ...validInput, [field]: '  ' })[field]).toBeTruthy();
  });
  it.each(['priority', 'category'])('rejects invalid %s including prototype keys', field => {
    for (const value of ['UNKNOWN', '', 'toString', '__proto__']) expect(validateTicketInput({ ...validInput, [field]: value })[field]).toBeTruthy();
  });
});
it('combines search by number/title/location and status without changing the original data', () => {
  const rows = [savedTicket, { ...savedTicket, id: 'done', ticketNo: 'FIX-2026-000010', status: 'CLOSED' }];
  expect(filterTickets(rows, ' 三樓 ', 'OPEN')).toEqual([savedTicket]);
  expect(filterTickets(rows, 'fix-2026-000010', 'ALL')).toEqual([rows[1]]);
  expect(filterTickets(rows, '冷氣', 'CLOSED')).toEqual([rows[1]]);
  expect(filterTickets(rows, '不存在', 'ALL')).toEqual([]);
  expect(rows).toHaveLength(2);
});
