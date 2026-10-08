import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUtility } from './helpers.mjs';

const { parseApiDate, getTashkentDateString, getTimeUntilTashkentMidnight, formatRelativeTime, formatDate } = await loadUtility('src/utils/date.ts');

test('naive API timestamps are UTC and explicit offsets retain their meaning', () => {
  assert.equal(parseApiDate('2026-10-03T18:59:59').toISOString(), '2026-10-03T18:59:59.000Z');
  assert.equal(parseApiDate('2026-10-03T23:59:59+05:00').toISOString(), '2026-10-03T18:59:59.000Z');
  assert.equal(parseApiDate('2026-10-03T18:59:59Z').toISOString(), '2026-10-03T18:59:59.000Z');
  assert.equal(getTashkentDateString('invalid'), '');
  assert.equal(formatDate('invalid', 'en'), '');
});

test('daily reward date and countdown change at Tashkent midnight, not host midnight', () => {
  const before = new Date('2026-10-03T18:59:59Z');
  const midnight = new Date('2026-10-03T19:00:00Z');
  const after = new Date('2026-10-03T19:00:01Z');
  assert.equal(getTashkentDateString(before), '2026-10-03');
  assert.equal(getTashkentDateString(midnight), '2026-10-04');
  assert.equal(getTashkentDateString(after), '2026-10-04');
  assert.deepEqual(getTimeUntilTashkentMidnight(before), { hours: 0, minutes: 0, seconds: 1, totalSeconds: 1 });
  assert.deepEqual(getTimeUntilTashkentMidnight(midnight), { hours: 24, minutes: 0, seconds: 0, totalSeconds: 86400 });
  assert.deepEqual(getTimeUntilTashkentMidnight(after), { hours: 23, minutes: 59, seconds: 59, totalSeconds: 86399 });
});

test('Tashkent date crosses month/year and pre-epoch dates correctly', () => {
  assert.equal(getTashkentDateString('2026-12-31T19:00:00Z'), '2027-01-01');
  assert.equal(getTashkentDateString('2028-02-28T19:00:00Z'), '2028-02-29');
  assert.equal(getTashkentDateString('1969-12-31T18:59:59Z'), '1969-12-31');
  assert.equal(getTimeUntilTashkentMidnight(new Date('1969-12-31T18:59:59Z')).totalSeconds, 1);
});

test('relative labels use selected language and consistent UTC API dates', t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-03T12:00:00Z') });
  assert.equal(formatRelativeTime('2026-10-03T11:58:00', 'en'), '2m ago');
  assert.equal(formatRelativeTime('2026-10-03T11:58:00', 'ru'), '2 мин. назад');
  assert.equal(formatRelativeTime('2026-10-03T11:58:00', 'uz'), '2 daqiqa oldin');
  assert.equal(formatRelativeTime('2026-10-02T12:00:00Z', 'en'), 'yesterday');
  assert.equal(formatRelativeTime('', 'en'), '');
});
