import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { installBrowserGlobals, loadModuleWithMocks } from './helpers.mjs';

const point = (x, y = 200, identifier = 1) => ({ identifier, clientX: x, clientY: y });
const touchList = points => Object.assign(points, { item: index => points[index] || null });
function event(touches, changedTouches = touches, timeStamp = 100, options = {}) {
  return {
    touches: touchList(touches), changedTouches: touchList(changedTouches),
    timeStamp, target: null, defaultPrevented: false, ...options
  };
}

async function captureSwipe(t, options = {}) {
  const browser = installBrowserGlobals(t);
  browser.window.scrollY = 0;
  let selected = false;
  browser.window.getSelection = () => ({ isCollapsed: !selected });
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Element');
  class TestElement {
    constructor(interactive = false) { this.interactive = interactive; }
    closest() { return this.interactive ? this : null; }
  }
  Object.defineProperty(globalThis, 'Element', { configurable: true, writable: true, value: TestElement });
  t.after(() => descriptor ? Object.defineProperty(globalThis, 'Element', descriptor) : delete globalThis.Element);

  const { useNovelPageSwipe } = await loadModuleWithMocks('src/hooks/useNovelPageSwipe.ts', {});
  const turns = [];
  const drags = [];
  const cancellations = [];
  let handlers;
  function Probe() {
    handlers = useNovelPageSwipe({
      onTurnPage: direction => turns.push(direction),
      onDrag: offset => drags.push(offset), onCancel: () => cancellations.push(true),
      pageKey: 'chapter-3:page-1', ...options
    });
    return null;
  }
  // The handlers retain React's real refs. No renderer or DOM simulation is needed
  // to verify gesture classification and cancellation during one mounted page.
  renderToString(React.createElement(Probe));
  return {
    handlers, turns, drags, cancellations, window: browser.window, TestElement,
    selectText: value => { selected = value; }
  };
}

function swipe(handlers, endX, endY = 200, duration = 200, options = {}) {
  handlers.onTouchStart(event([point(180)], undefined, 100, options));
  handlers.onTouchMove(event([point(endX, endY)], undefined, 100 + Math.min(duration, 100), options));
  handlers.onTouchEnd(event([], [point(endX, endY)], 100 + duration, options));
}

test('a clear left swipe advances and a right swipe returns exactly one page', async t => {
  const { handlers, turns } = await captureSwipe(t);
  swipe(handlers, 60);
  swipe(handlers, 300);
  assert.deepEqual(turns, [1, -1]);
  handlers.onTouchEnd(event([], [point(300)], 350));
  assert.deepEqual(turns, [1, -1], 'a repeated end event cannot reuse the completed gesture');
});

test('taps, short movements and ambiguous diagonal drags do not turn pages', async t => {
  const { handlers, turns } = await captureSwipe(t);
  swipe(handlers, 180);
  swipe(handlers, 121);
  swipe(handlers, 100, 260);
  swipe(handlers, 174, 280);
  assert.deepEqual(turns, []);
  swipe(handlers, 120);
  assert.deepEqual(turns, [1], 'the minimum deliberate 60px horizontal swipe is accepted');
});

test('a gesture that begins scrolling stays cancelled after moving sideways', async t => {
  const { handlers, turns } = await captureSwipe(t);
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(176, 220)], undefined, 150));
  handlers.onTouchMove(event([point(60, 225)], undefined, 220));
  handlers.onTouchEnd(event([], [point(60, 225)], 300));
  assert.deepEqual(turns, [], 'the end position must not reclassify a vertical scroll as a page swipe');
  swipe(handlers, 60);
  assert.deepEqual(turns, [1], 'cancellation does not disable later independent gestures');
});

test('actual document scrolling cancels an otherwise horizontal swipe', async t => {
  const { handlers, turns, window } = await captureSwipe(t);
  handlers.onTouchStart(event([point(180)], undefined, 100));
  window.scrollY = 8;
  handlers.onTouchMove(event([point(60)], undefined, 200));
  handlers.onTouchEnd(event([], [point(60)], 300));
  assert.deepEqual(turns, []);
  swipe(handlers, 60);
  assert.deepEqual(turns, [1], 'a new gesture records the new scroll position');
});

test('text selection already present or appearing during a gesture blocks page turns', async t => {
  const { handlers, turns, selectText } = await captureSwipe(t);
  selectText(true);
  swipe(handlers, 60);
  selectText(false);
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(60)], undefined, 200));
  selectText(true);
  handlers.onTouchEnd(event([], [point(60)], 300));
  selectText(false);
  handlers.onTouchStart(event([point(180)], undefined, 100));
  selectText(true);
  handlers.onTouchMove(event([point(60)], undefined, 200));
  selectText(false);
  handlers.onTouchEnd(event([], [point(60)], 300));
  assert.deepEqual(turns, []);
  selectText(false);
  swipe(handlers, 60);
  assert.deepEqual(turns, [1]);
});

test('a long press cannot become a page swipe when the finger finally moves', async t => {
  const { handlers, turns } = await captureSwipe(t);
  swipe(handlers, 60, 200, 751);
  assert.deepEqual(turns, []);
  swipe(handlers, 60, 200, 400);
  assert.deepEqual(turns, [1]);
});

test('pinch gestures and a second finger added midgesture never turn pages', async t => {
  const { handlers, turns } = await captureSwipe(t);
  handlers.onTouchStart(event([point(180), point(240, 200, 2)], undefined, 100));
  handlers.onTouchEnd(event([], [point(60)], 300));
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(120), point(240, 200, 2)], undefined, 180));
  handlers.onTouchMove(event([point(60)], undefined, 240));
  handlers.onTouchEnd(event([], [point(60)], 300));
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchEnd(event([point(240, 200, 2)], [point(60)], 300));
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(60)], undefined, 200));
  handlers.onTouchEnd(event([], [point(60), point(240, 200, 2)], 300));
  assert.deepEqual(turns, [], 'a multitouch gesture remains cancelled even when only one finger remains');
});

test('panning an already zoomed page or zooming during a gesture does not navigate', async t => {
  const { handlers, turns, window } = await captureSwipe(t);
  window.visualViewport = { scale: 1.5 };
  swipe(handlers, 60);
  window.visualViewport.scale = 1;
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(60)], undefined, 200));
  window.visualViewport.scale = 1.5;
  handlers.onTouchEnd(event([], [point(60)], 300));
  window.visualViewport.scale = 1;
  handlers.onTouchStart(event([point(180)], undefined, 100));
  window.visualViewport.scale = 1.5;
  handlers.onTouchMove(event([point(60)], undefined, 200));
  window.visualViewport.scale = 1;
  handlers.onTouchEnd(event([], [point(60)], 300));
  assert.deepEqual(turns, [], 'pinch cancellation persists even if the user returns to normal scale before lifting');
  swipe(handlers, 60);
  assert.deepEqual(turns, [1]);
});

test('only the tracked touch identifier may complete a gesture', async t => {
  const { handlers, turns } = await captureSwipe(t);
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(60, 200, 2)], undefined, 200));
  handlers.onTouchEnd(event([], [point(60, 200, 2)], 300));
  assert.deepEqual(turns, []);
  swipe(handlers, 60);
  assert.deepEqual(turns, [1]);
});

test('touch cancellation clears pending navigation without breaking the next gesture', async t => {
  const { handlers, turns } = await captureSwipe(t);
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(60)], undefined, 200));
  handlers.onTouchCancel(event([], [point(60)], 250));
  handlers.onTouchEnd(event([], [point(60)], 300));
  assert.deepEqual(turns, []);
  swipe(handlers, 300);
  assert.deepEqual(turns, [-1]);
});

test('prevented events, interactive targets and disabled gestures preserve their original action', async t => {
  const { handlers, turns, TestElement } = await captureSwipe(t);
  swipe(handlers, 60, 200, 200, { defaultPrevented: true });
  swipe(handlers, 60, 200, 200, { target: new TestElement(true) });
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(60)], undefined, 200, { defaultPrevented: true }));
  handlers.onTouchEnd(event([], [point(60)], 300));
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(60)], undefined, 200));
  handlers.onTouchEnd(event([], [point(60)], 300, { defaultPrevented: true }));
  assert.deepEqual(turns, []);
  swipe(handlers, 60);
  assert.deepEqual(turns, [1]);
  const disabled = await captureSwipe(t, { enabled: false });
  swipe(disabled.handlers, 60);
  assert.deepEqual(disabled.turns, []);
});

test('horizontal movement reports signed drag offsets and committed turns skip cancellation', async t => {
  const { handlers, drags, turns, cancellations } = await captureSwipe(t);
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(160)], undefined, 150));
  handlers.onTouchMove(event([point(100)], undefined, 200));
  handlers.onTouchEnd(event([], [point(60)], 300));
  handlers.onTouchStart(event([point(180)], undefined, 400));
  handlers.onTouchMove(event([point(200)], undefined, 450));
  handlers.onTouchMove(event([point(260)], undefined, 500));
  handlers.onTouchEnd(event([], [point(300)], 600));
  assert.deepEqual(drags, [-20, -80, 20, 80]);
  assert.deepEqual(turns, [1, -1]);
  assert.deepEqual(cancellations, [], 'committed turns must not spring the visual page back');
});

test('taps and initially vertical scrolling never create a page drag preview', async t => {
  const { handlers, drags, cancellations } = await captureSwipe(t);
  swipe(handlers, 180);
  swipe(handlers, 172);
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(179, 225)], undefined, 150));
  handlers.onTouchMove(event([point(60, 230)], undefined, 200));
  handlers.onTouchEnd(event([], [point(60, 230)], 300));
  assert.deepEqual(drags, [], 'the page stays flat while the reader taps or scrolls');
  assert.equal(cancellations.length, 3, 'each uncommitted active gesture resets once');
});

test('selection, pinch, native cancellation and short endings reset a drag exactly once', async t => {
  const { handlers, drags, turns, cancellations, selectText } = await captureSwipe(t);
  const beginDrag = () => {
    handlers.onTouchStart(event([point(180)], undefined, 100));
    handlers.onTouchMove(event([point(100)], undefined, 200));
  };
  const finishCancelled = () => {
    handlers.onTouchEnd(event([], [point(60)], 300));
    handlers.onTouchCancel(event([], [point(60)], 350));
  };
  beginDrag();
  selectText(true);
  handlers.onTouchMove(event([point(60)], undefined, 250));
  selectText(false);
  finishCancelled();
  assert.equal(cancellations.length, 1);
  beginDrag();
  handlers.onTouchStart(event([point(100), point(220, 200, 2)], undefined, 250));
  handlers.onTouchMove(event([point(60)], undefined, 275));
  finishCancelled();
  assert.equal(cancellations.length, 2);
  beginDrag();
  handlers.onTouchCancel(event([], [point(100)], 250));
  finishCancelled();
  assert.equal(cancellations.length, 3);
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(160)], undefined, 200));
  handlers.onTouchEnd(event([], [point(160)], 300));
  finishCancelled();
  assert.equal(cancellations.length, 4);
  assert.deepEqual(turns, []);
  assert.deepEqual(drags, [-80, -80, -80, -20]);
});

test('inactive or disabled touch events cannot cancel a page turn animation', async t => {
  const { handlers, cancellations } = await captureSwipe(t);
  handlers.onTouchCancel(event([], [], 50));
  swipe(handlers, 60);
  handlers.onTouchCancel(event([], [], 350));
  handlers.onTouchEnd(event([], [point(60)], 375));
  handlers.onTouchStart(event([point(180)], undefined, 400, { defaultPrevented: true }));
  handlers.onTouchCancel(event([], [], 450));
  assert.deepEqual(cancellations, [], 'only an active gesture is allowed to cancel its own preview');
  const disabled = await captureSwipe(t, { enabled: false });
  swipe(disabled.handlers, 60);
  disabled.handlers.onTouchCancel(event([], [], 350));
  disabled.handlers.onTouchStart(event([point(180)], undefined, 400));
  disabled.handlers.onTouchCancel(event([], [], 450));
  assert.deepEqual(disabled.drags, []);
  assert.deepEqual(disabled.cancellations, []);
});

test('returning the finger toward its starting position flattens the preview immediately', async t => {
  const { handlers, drags, cancellations, turns } = await captureSwipe(t);
  handlers.onTouchStart(event([point(180)], undefined, 100));
  handlers.onTouchMove(event([point(100)], undefined, 150));
  handlers.onTouchMove(event([point(178)], undefined, 200));
  assert.deepEqual(drags, [-80, 0], 'a withdrawn swipe must not leave the visual page tilted until release');
  handlers.onTouchMove(event([point(260)], undefined, 250));
  handlers.onTouchEnd(event([], [point(300)], 300));
  assert.deepEqual(drags, [-80, 0, 80], 'the same finger can then start pulling in the opposite direction');
  assert.deepEqual(turns, [-1]);
  assert.deepEqual(cancellations, []);
});
