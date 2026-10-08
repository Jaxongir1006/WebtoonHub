import { ReadingProgress } from '../types';

const key = (userId?: number) => `webtoonhub_reading_${userId ?? 'guest'}`;
export function validPosition(value: unknown): value is ReadingProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  const positiveId = (id: unknown) => Number.isSafeInteger(id) && Number(id) > 0;
  const optionalText = (field: string, limit = 2000) => p[field] === undefined || (typeof p[field] === 'string' && p[field].length <= limit);
  const anchor = typeof p.anchor === 'string' ? p.anchor.match(/^(word|image):(\d+)(?::(0(?:\.\d+)?|1(?:\.0+)?))?$/) : null;
  const validAnchor = p.anchor === undefined || p.anchor === null ||
    (anchor && p.anchor!.toString().length <= 200 && Number.isSafeInteger(Number(anchor[2])) && (anchor[1] === 'image' || anchor[3] === undefined));
  return positiveId(p.chapter_id) && positiveId(p.webtoon_id) &&
    Number.isSafeInteger(p.page_index) && Number(p.page_index) >= 0 && Number(p.page_index) <= 100000 &&
    typeof p.progress_percent === 'number' && Number.isFinite(p.progress_percent) && p.progress_percent >= 0 && p.progress_percent <= 100 &&
    typeof p.completed === 'boolean' &&
    !!validAnchor &&
    (p.updated_at === undefined || (typeof p.updated_at === 'string' && Number.isFinite(Date.parse(p.updated_at)))) &&
    (p.reward_eligible_at === undefined || p.reward_eligible_at === null || (typeof p.reward_eligible_at === 'string' && Number.isFinite(Date.parse(p.reward_eligible_at)))) &&
    optionalText('webtoon_title') && optionalText('webtoon_slug') && optionalText('cover_image_url') &&
    (p.webtoon_type === undefined || (typeof p.webtoon_type === 'string' && ['novel', 'manga', 'manhwa'].includes(p.webtoon_type))) &&
    (p.chapter_number === undefined || (typeof p.chapter_number === 'number' && Number.isFinite(p.chapter_number) && p.chapter_number > 0)) &&
    (p.webtoon === undefined || (p.webtoon !== null && typeof p.webtoon === 'object' && !Array.isArray(p.webtoon) && typeof (p.webtoon as Record<string, unknown>).title === 'string'));
}
export function readPositions(userId?: number): ReadingProgress[] {
  try {
    const value = JSON.parse(localStorage.getItem(key(userId)) || '[]');
    if (!Array.isArray(value)) return [];
    const unique = new Map<number, ReadingProgress>();
    for (const position of value) if (validPosition(position) && !unique.has(position.webtoon_id)) unique.set(position.webtoon_id, position);
    return [...unique.values()].slice(0, 100);
  } catch { return []; }
}
export function readPosition(webtoonId: number, userId?: number): ReadingProgress | undefined {
  return readPositions(userId).find(p => p.webtoon_id === webtoonId);
}
export function writePosition(position: ReadingProgress, userId?: number): void {
  if (!validPosition(position)) return;
  try {
    const positions = readPositions(userId).filter(p => p.webtoon_id !== position.webtoon_id);
    localStorage.setItem(key(userId), JSON.stringify([position, ...positions].slice(0, 100)));
    window.dispatchEvent(new Event('webtoonhub:reading-progress'));
  } catch { /* Reading remains usable when browser storage is full or disabled. */ }
}
