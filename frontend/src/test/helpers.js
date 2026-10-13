export function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
export const validInput = { title: '冷氣漏水', description: '開啟後滴水', category: 'AIR_CONDITIONING', priority: 'MEDIUM', location: '三樓會議室' };
export const savedTicket = { ...validInput, id: 'existing', ticketNo: 'FIX-2026-000009', status: 'OPEN', assignedTo: null, createdAt: '2026-09-21T09:00:00.000Z' };
