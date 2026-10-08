export interface PendingSpin {
  owner_id: number;
  wheel_id: number;
  operation_key: string;
  expected_mode: 'free' | 'paid';
  expected_cost: number;
  created_at: string;
}
const key = (owner: number) => `webtoonhub_pending_spin_${owner}`;
export function readPendingSpin(owner: number): PendingSpin | null {
  try {
    const value = JSON.parse(localStorage.getItem(key(owner)) || 'null');
    return value && value.owner_id === owner && Number.isSafeInteger(value.wheel_id) && value.wheel_id > 0 &&
      typeof value.operation_key === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value.operation_key) &&
      ['free', 'paid'].includes(value.expected_mode) && Number.isSafeInteger(value.expected_cost) && value.expected_cost >= 0 &&
      typeof value.created_at === 'string' && Number.isFinite(Date.parse(value.created_at)) ? value : null;
  } catch { return null; }
}
export function storePendingSpin(intent: PendingSpin): boolean {
  try {
    localStorage.setItem(key(intent.owner_id), JSON.stringify(intent));
    return readPendingSpin(intent.owner_id)?.operation_key === intent.operation_key;
  } catch { return false; }
}
export function clearPendingSpin(intent: PendingSpin) {
  try { if (readPendingSpin(intent.owner_id)?.operation_key === intent.operation_key) localStorage.removeItem(key(intent.owner_id)); }
  catch { /* An acknowledged receipt can be recovered again safely. */ }
}
