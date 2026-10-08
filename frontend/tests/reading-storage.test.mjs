import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUtility, installBrowserGlobals } from './helpers.mjs';

const { readPosition, readPositions, writePosition } = await loadUtility('src/utils/readingStorage.ts');
const position = (webtoon = 1, chapter = 10) => ({ webtoon_id: webtoon, chapter_id: chapter, page_index: 2, anchor: 'word:240', progress_percent: 50, completed: false, updated_at: '2026-10-03T12:00:00Z' });

test('guest and different account positions never leak across owners', t => {
  installBrowserGlobals(t);
  writePosition(position(1, 11));
  writePosition(position(1, 21), 7);
  writePosition(position(1, 31), 8);
  assert.equal(readPosition(1)?.chapter_id, 11);
  assert.equal(readPosition(1, 7)?.chapter_id, 21);
  assert.equal(readPosition(1, 8)?.chapter_id, 31);
  assert.deepEqual(readPositions(9), []);
});

test('corrupt and non-array storage does not crash reader restoration', t => {
  const { storage } = installBrowserGlobals(t);
  for (const value of ['{broken', 'null', '{}', '42', '"wrong"']) {
    storage.setItem('webtoonhub_reading_7', value);
    assert.deepEqual(readPositions(7), []);
  }
  storage.setItem('webtoonhub_reading_7', JSON.stringify([null, {}, { chapter_id: '4', webtoon_id: 5 }, position(2, 20)]));
  assert.deepEqual(readPositions(7), [position(2, 20)]);
});

test('positions are bounded to the latest100 distinct works and update moves a work to front', t => {
  installBrowserGlobals(t);
  for (let id = 1; id <= 105; id++) writePosition(position(id, id * 10), 7);
  assert.equal(readPositions(7).length, 100);
  assert.equal(readPosition(1, 7), undefined);
  assert.equal(readPositions(7)[0].webtoon_id, 105);
  writePosition(position(50, 501), 7);
  const items = readPositions(7);
  assert.equal(items.length, 100);
  assert.equal(items[0].chapter_id, 501);
  assert.equal(items.filter(item => item.webtoon_id === 50).length, 1);
});

test('storage failures remain optional and successful writes notify library views', t => {
  const { storage, window } = installBrowserGlobals(t);
  let notifications = 0;
  window.addEventListener('webtoonhub:reading-progress', () => notifications++);
  writePosition(position(), 7);
  assert.equal(notifications, 1);
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  assert.doesNotThrow(() => writePosition(position(2), 7));
  assert.equal(notifications, 1, 'failed persistence must not claim a stored update');
  storage.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  assert.deepEqual(readPositions(7), []);
});
