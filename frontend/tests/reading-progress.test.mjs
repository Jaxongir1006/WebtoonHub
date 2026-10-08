import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { deferred, installBrowserGlobals, loadModuleWithMocks } from './helpers.mjs';

test('an early completion acknowledgement never overwrites a newer position awaiting debounce', async t => {
  const { storage } = installBrowserGlobals(t);
  storage.setItem('webtoonhub_access_token', 'reader-token');
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: new Date('2026-10-03T12:00:00Z') });
  const completion = deferred();
  const calls = [];
  let serverCompleted = false;
  const { useReadingProgress } = await loadModuleWithMocks('src/hooks/useReadingProgress.ts', {
    '../context/AuthContext': { useAuth: () => ({ user: { id: 7 }, isLoading: false }) },
    '../api/progress': { progressApi: {
      save: async (_work, position) => {
        calls.push(position);
        if (calls.length === 1) return completion.promise;
        if (position.completed && Date.now() >= new Date('2026-10-03T12:00:10Z').getTime()) serverCompleted = true;
        return { ...position, completed: serverCompleted };
      }
    } }
  });
  let progress;
  function Probe() {
    progress = useReadingProgress({ id: 12, webtoon_id: 4, webtoon_title: 'Test book', chapter_number: 1 }, false);
    return null;
  }
  // Server rendering runs the real callback/ref logic without a browser renderer.
  // This case concerns callbacks while one component is alive, not DOM effects.
  renderToString(React.createElement(Probe));
  progress.report({ page_index: 9, anchor: 'image:9', progress_percent: 100, completed: true });
  const firstFlight = progress.flush();
  await Promise.resolve();
  assert.equal(calls.length, 1);

  progress.report({ page_index: 8, anchor: 'image:8', progress_percent: 90, completed: false });
  completion.resolve({ ...calls[0], completed: false, reward_eligible_at: new Date(Date.now() + 10000).toISOString() });
  await firstFlight;
  t.mock.timers.tick(800);
  for (let index = 0; index < 5; index++) await Promise.resolve();

  assert.equal(calls.length, 2, 'the newer reading position must still be saved by its debounce');
  assert.equal(calls[1].page_index, 8);
  assert.equal(calls[1].completed, false);
  t.mock.timers.tick(11000);
  for (let index = 0; index < 5; index++) await Promise.resolve();
  assert.equal(calls.at(-1).page_index, 8, 'a stale completion timer cannot put the reader back at the chapter end');
  assert.equal(calls.length, 4, 'the completion receipt is acknowledged and the latest actual position is restored');
});

async function captureProgress(t, save) {
  const { storage } = installBrowserGlobals(t);
  storage.setItem('webtoonhub_access_token', 'reader-token');
  const { useReadingProgress } = await loadModuleWithMocks('src/hooks/useReadingProgress.ts', {
    '../context/AuthContext': { useAuth: () => ({ user: { id: 7 }, isLoading: false }) },
    '../api/progress': { progressApi: { save } }
  });
  let progress;
  function Probe() { progress = useReadingProgress({ id: 12, webtoon_id: 4 }, false); return null; }
  renderToString(React.createElement(Probe));
  return progress;
}

test('a failed position remains available for explicit retry without another scroll', async t => {
  const calls = [];
  const progress = await captureProgress(t, async (_work, position) => {
    calls.push(position);
    if (calls.length === 1) throw new Error('Temporary server failure');
    return { ...position, completed: false };
  });
  progress.report({ page_index: 4, anchor: 'image:4', progress_percent: 50, completed: false });
  await progress.flush();
  assert.equal(calls.length, 1);
  await progress.flush();
  assert.equal(calls.length, 2, 'explicit retry must resend the retained position');
  assert.equal(calls[1].page_index, 4);
  assert.equal(calls[1].anchor, 'image:4');
});

test('a refused completion receipt has one timed retry and then waits for explicit retry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: new Date('2026-10-03T12:00:00Z') });
  const calls = [];
  const progress = await captureProgress(t, async (_work, position) => {
    calls.push(position);
    return { ...position, completed: false, reward_eligible_at: '2026-10-03T12:00:00.100Z' };
  });
  progress.report({ page_index: 9, anchor: 'image:9', progress_percent: 100, completed: true });
  await progress.flush();
  t.mock.timers.tick(1000);
  for (let index = 0; index < 5; index++) await Promise.resolve();
  assert.equal(calls.length, 2);
  t.mock.timers.tick(60000);
  for (let index = 0; index < 5; index++) await Promise.resolve();
  assert.equal(calls.length, 2, 'a server refusal must not cause an automatic request storm');
  await progress.flush();
  assert.equal(calls.length, 3);
});
