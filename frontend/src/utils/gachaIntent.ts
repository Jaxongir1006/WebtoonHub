import type { GachaRollResult } from '../api/gacha';

export interface PendingGacha {
  owner_id: number; pool_id: number; operation_key: string;
  expected_cost: number; expected_version: number; created_at: string;
}
const key = (owner: number) => `webtoonhub_pending_gacha_${owner}`;
export function readPendingGacha(owner: number): PendingGacha | null {
  try {
    const value = JSON.parse(localStorage.getItem(key(owner)) || 'null');
    return value && value.owner_id === owner && Number.isSafeInteger(value.pool_id) && value.pool_id > 0 &&
      typeof value.operation_key === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value.operation_key) &&
      Number.isSafeInteger(value.expected_cost) && value.expected_cost >= 0 && Number.isSafeInteger(value.expected_version) && value.expected_version > 0 &&
      typeof value.created_at === 'string' && Number.isFinite(Date.parse(value.created_at)) ? value : null;
  } catch { return null; }
}
export function storePendingGacha(intent: PendingGacha): boolean {
  try {
    localStorage.setItem(key(intent.owner_id), JSON.stringify(intent));
    return readPendingGacha(intent.owner_id)?.operation_key === intent.operation_key;
  } catch { return false; }
}
export function clearPendingGacha(intent: PendingGacha) {
  try { if (readPendingGacha(intent.owner_id)?.operation_key === intent.operation_key) localStorage.removeItem(key(intent.owner_id)); }
  catch { /* Retrying an acknowledged result remains safe. */ }
}
// Animation can only reveal the card in the server's winning slot.
export function validGachaResult(value: GachaRollResult, poolId: number): boolean {
  return !!value && value.pool_id === poolId && Number.isSafeInteger(value.roll_id) && value.roll_id > 0 &&
    Array.isArray(value.animation_cards) && value.animation_cards.length > 0 && value.animation_cards.length <= 100 &&
    Number.isSafeInteger(value.winning_index) && value.winning_index >= 0 && value.winning_index < value.animation_cards.length &&
    !!value.winning_card && value.winning_card.item_type === 'card' &&
    value.animation_cards[value.winning_index]?.id === value.winning_card.id &&
    value.animation_cards.every(card => card && card.item_type === 'card' && Number.isSafeInteger(card.id)) &&
    Number.isSafeInteger(value.new_balance) && value.new_balance >= 0 && Number.isSafeInteger(value.cost_paid) && value.cost_paid >= 0 &&
    typeof value.is_duplicate === 'boolean' && Number.isSafeInteger(value.refund_coins) && value.refund_coins >= 0;
}
export function gachaStripOffset(viewportWidth: number, winningIndex: number, cardWidth = 136, gap = 12) {
  return viewportWidth / 2 - (winningIndex * (cardWidth + gap) + cardWidth / 2);
}
export function formatGachaProbability(value: number, locale: string) {
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });
  if (value > 0 && value < 0.0000005) return '<' + formatter.format(0.000001) + '%';
  return formatter.format(value) + '%';
}
