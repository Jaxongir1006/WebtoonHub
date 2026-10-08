import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserGlobals, loadModuleWithMocks } from './helpers.mjs';

const sameDeps = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));

/** Run the real hook with deterministic React state/effect and browser frame seams. */
async function mountMotion(t, initial = {}) {
  const { window } = installBrowserGlobals(t);
  const frames = new Map();
  const timers = new Map();
  let nextId = 1;
  let clock = 0;
  window.requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.setTimeout = (callback, delay) => { const id = nextId++; timers.set(id, { callback, due: clock + delay }); return id; };
  window.clearTimeout = id => timers.delete(id);
  const media = new EventTarget();
  media.matches = initial.reducedMotion ?? false;
  window.matchMedia = () => media;

  const slots = [];
  let cursor = 0;
  let dirty = false;
  const effects = [];
  function useEffect(callback, deps) {
    const index = cursor++;
    const slot = slots[index] ||= {};
    if (!sameDeps(slot.deps, deps)) {
      slot.deps = deps;
      effects.push(() => { slot.cleanup?.(); slot.cleanup = callback(); });
    }
  }
  const react = {
    useRef(value) { const index = cursor++; return slots[index] ||= { current: value }; },
    useState(value) {
      const index = cursor++;
      const slot = slots[index] ||= { value: typeof value === 'function' ? value() : value };
      return [slot.value, next => {
        const value = typeof next === 'function' ? next(slot.value) : next;
        if (!Object.is(slot.value, value)) { slot.value = value; dirty = true; }
      }];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      const slot = slots[index] ||= {};
      if (!sameDeps(slot.deps, deps)) { slot.deps = deps; slot.callback = callback; }
      return slot.callback;
    },
    useEffect, useLayoutEffect: useEffect
  };
  const { useNovelPageMotion } = await loadModuleWithMocks('src/hooks/useNovelPageMotion.ts', { react });
  const commits = [];
  const stage = { offsetHeight: 1400, getBoundingClientRect: () => ({ width: 400, top: -220 }) };
  let options = {
    page: 1, pageCount: 4, contextKey: 'chapter-3:base:serif',
    stageRef: { current: stage }, onCommit: index => commits.push(index), ...initial
  };
  let result;
  let unmounted = false;
  function render() {
    if (unmounted) return;
    let attempts = 0;
    do {
      assert.ok(attempts++ < 20, 'the hook must settle without an effect-render loop');
      dirty = false;
      cursor = 0;
      result = useNovelPageMotion(options);
      effects.splice(0).forEach(effect => effect());
    } while (dirty);
  }
  function act(action) { action(); if (dirty) render(); }
  function unmount() {
    if (unmounted) return;
    unmounted = true;
    slots.forEach(slot => slot?.cleanup?.());
  }
  t.after(() => {
    // Browser-global restoration was registered before this component cleanup.
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: window });
    try { unmount(); }
    finally { descriptor ? Object.defineProperty(globalThis, 'window', descriptor) : delete globalThis.window; }
  });
  render();
  return {
    get api() { return result; }, commits, frames, timers, stage,
    act,
    update(changes) { options = { ...options, ...changes }; render(); },
    frame() { act(() => { const pending = [...frames]; frames.clear(); pending.forEach(([, callback]) => callback(clock)); }); },
    tick(duration) {
      const target = clock + duration;
      act(() => {
        let next;
        while ((next = [...timers].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0])) {
          clock = next[1].due; timers.delete(next[0]); next[1].callback();
        }
        clock = target;
      });
    },
    reducedMotion(value) { act(() => { media.matches = value; media.dispatchEvent(new Event('change')); }); },
    unmount
  };
}

test('a forward paper turn follows the finger and commits only after settling, exactly once', async t => {
  const view = await mountMotion(t);
  view.act(() => view.api.dragPage(-120));
  assert.deepEqual(view.api.motion, {
    from: 1, to: 2, direction: 1, offset: -120, width: 400, top: 300, height: 1400, phase: 'dragging'
  });
  assert.equal(view.api.isSettling, false);
  view.act(() => view.api.turnPage(1));
  assert.equal(view.api.motion.phase, 'preparing');
  assert.equal(view.api.motion.offset, -120);
  assert.equal(view.api.isSettling, true);
  view.frame();
  assert.equal(view.api.motion.phase, 'preparing', 'the start position paints before the transition');
  view.frame();
  assert.equal(view.api.motion.phase, 'turning');
  assert.equal(view.api.motion.offset, -400);
  assert.deepEqual(view.commits, [], 'previewing text never saves the next reading position');
  view.act(() => { view.api.turnPage(1); view.api.turnPage(-1); view.api.dragPage(100); });
  assert.equal(view.api.motion.to, 2);
  view.act(() => view.api.finishMotion());
  assert.equal(view.api.motion, null);
  view.act(() => { view.api.finishMotion(); view.api.turnPage(1); });
  view.tick(1000);
  assert.deepEqual(view.commits, [2], 'transition events, timers and queued input cannot duplicate the commit');
  view.update({ page: 2 });
  view.act(() => view.api.turnPage(-1));
  assert.equal(view.api.motion.to, 1, 'the lock clears when the committed page renders');
});

test('backward motion travels right and an absent transition event has a bounded fallback', async t => {
  const view = await mountMotion(t);
  view.act(() => view.api.dragPage(900));
  assert.equal(view.api.motion.offset, 400, 'dragging cannot exceed the measured paper width');
  view.act(() => view.api.turnPage(-1));
  view.frame(); view.frame();
  assert.equal(view.api.motion.direction, -1);
  assert.equal(view.api.motion.offset, 400);
  view.tick(399);
  assert.deepEqual(view.commits, []);
  view.tick(1);
  assert.deepEqual(view.commits, [0]);
  assert.equal(view.api.motion, null);
  assert.equal(view.timers.size, 0);
});

test('first and last page boundaries never move paper or commit another page', async t => {
  const view = await mountMotion(t, { page: 0 });
  view.act(() => { view.api.dragPage(120); view.api.turnPage(-1); });
  assert.equal(view.api.motion, null);
  assert.equal(view.frames.size, 0);
  view.update({ page: 3 });
  view.act(() => { view.api.dragPage(-120); view.api.turnPage(1); });
  assert.equal(view.api.motion, null);
  assert.deepEqual(view.commits, []);
});

test('a cancelled drag returns the paper without changing the reading position', async t => {
  const view = await mountMotion(t);
  view.act(() => view.api.dragPage(-100));
  view.act(() => view.api.cancelDrag());
  assert.equal(view.api.motion.phase, 'returning');
  assert.equal(view.api.motion.offset, 0);
  assert.equal(view.api.isSettling, true);
  view.act(() => { view.api.cancelDrag(); view.api.turnPage(1); });
  view.tick(260);
  assert.equal(view.api.motion, null);
  assert.deepEqual(view.commits, []);
  view.act(() => view.api.dragPage(80));
  assert.equal(view.api.motion.direction, -1, 'the next independent gesture still works');
});

test('chapter, pagination and settings changes discard pending turns and all scheduled work', async t => {
  for (const change of [{ contextKey: 'chapter-4:base:serif' }, { pageCount: 5 }, { page: 2 }, { disabled: true }]) {
    const view = await mountMotion(t);
    view.act(() => view.api.turnPage(1));
    view.frame();
    assert.equal(view.frames.size, 1);
    view.update(change);
    assert.equal(view.api.motion, null);
    assert.equal(view.frames.size, 0);
    assert.equal(view.timers.size, 0);
    view.frame(); view.tick(1000);
    assert.deepEqual(view.commits, []);
  }
});

test('a context change during the transition cannot commit an old target', async t => {
  const view = await mountMotion(t);
  view.act(() => view.api.turnPage(1));
  view.frame(); view.frame();
  assert.equal(view.timers.size, 1);
  view.update({ contextKey: 'chapter-3:xl:serif', pageCount: 7 });
  view.act(() => view.api.finishMotion());
  view.tick(1000);
  assert.deepEqual(view.commits, []);
  assert.equal(view.api.motion, null);
});

test('reduced motion skips previews and animation, and live preference changes cancel a pending turn', async t => {
  const view = await mountMotion(t, { reducedMotion: true });
  view.act(() => view.api.dragPage(-100));
  assert.equal(view.api.motion, null);
  view.act(() => { view.api.turnPage(1); view.api.turnPage(1); });
  assert.deepEqual(view.commits, [2]);
  assert.equal(view.frames.size, 0);
  view.update({ page: 2 });
  view.reducedMotion(false);
  view.act(() => view.api.turnPage(-1));
  view.frame(); view.frame();
  assert.equal(view.api.motion.phase, 'turning');
  view.reducedMotion(true);
  assert.equal(view.api.motion, null);
  assert.equal(view.timers.size, 0);
  view.tick(1000);
  assert.deepEqual(view.commits, [2]);
});

test('disabled readers and unavailable paper measurements stay safe, and unmount cancels pending work', async t => {
  const disabled = await mountMotion(t, { disabled: true });
  disabled.act(() => { disabled.api.dragPage(-120); disabled.api.turnPage(1); });
  assert.equal(disabled.api.motion, null);
  assert.deepEqual(disabled.commits, []);
  const hidden = await mountMotion(t, { stageRef: { current: null } });
  hidden.act(() => hidden.api.turnPage(1));
  assert.deepEqual(hidden.commits, [2], 'page buttons still work without a measurable animation stage');
  const view = await mountMotion(t);
  view.act(() => view.api.turnPage(1));
  view.frame(); view.frame();
  view.unmount();
  assert.equal(view.frames.size, 0);
  assert.equal(view.timers.size, 0);
  view.tick(1000);
  assert.deepEqual(view.commits, []);
});
