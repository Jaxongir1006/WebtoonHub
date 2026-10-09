import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ts from 'typescript';
import axios from 'axios';
import { deferred, installBrowserGlobals, loadModuleWithMocks, loadUtility } from './helpers.mjs';

const noop = () => {};
const card = { id: 8, name: 'Hero', item_type: 'card', price_coins: 0, rarity: 'legendary', asset_url: '/content/cards/hero.webp', is_owned: false };
const otherCard = { ...card, id: 9, name: 'Another hero', rarity: 'common' };
const receipt = { roll_id: 11, pool_id: 3, winning_card: card, animation_cards: [otherCard, card, otherCard], winning_index: 1, new_balance: 80, cost_paid: 20, is_duplicate: false, refund_coins: 0 };
const source = await readFile(new URL('../src/components/cards/CharacterGachaPanel.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('CharacterGachaPanel.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handleRoll;
const catalogActions = {};
function findHandler(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleRoll') handleRoll = node.initializer.getText(ast);
  if (ts.isVariableDeclaration(node) && ['loadPools', 'loadDetail'].includes(node.name.getText(ast))) catalogActions[node.name.getText(ast)] = node.initializer.getText(ast);
  ts.forEachChild(node, findHandler);
}
findHandler(ast);

async function fixture(t, send, reduced = true, overrides = {}) {
  installBrowserGlobals(t);
  const utils = await loadUtility('src/utils/gachaIntent.ts');
  const state = { error: null, win: null, balance: 100, modal: false, strip: [], index: null, sounds: 0, phase: 'idle', stopped: 0, refreshed: 0, reloaded: 0 };
  const refs = { pendingRef: { current: null }, rollLock: { current: false }, generation: { current: 1 }, identity: { current: 7 }, mounted: { current: true }, finishRoll: { current: null }, frames: { current: [] }, timer: { current: null }, soundTimer: { current: null } };
  const scheduledFrames = [], scheduledTimers = [];
  const bindings = {
    ...refs, ...utils, axios, user: { id: 7, lightning_coins: 100 }, isAuthenticated: true,
    pool: { id: 3, cost_coins: 20, version: 2, is_active: true, cards: [card], rarity_rates: [{ probability_percent: 100 }] }, selectedId: 3, detailLoading: false, loading: false,
    motionPreference: { current: reduced }, openAuthModal: noop, t: key => key, setPending: noop,
    setPhase: value => { state.phase = value; }, setError: value => { state.error = value; }, setShowResult: value => { state.modal = value; },
    setStrip: value => { state.strip = value; }, setRunning: noop, enableAudio: noop, gachaApi: { roll: send },
    updateCoinsLocally: value => { state.balance = value; }, stopAnimation: () => { state.stopped++; },
    setResult: value => { state.win = value; }, playTone: () => { state.sounds++; },
    loadPools: async () => { state.reloaded++; }, loadHistory: noop, refreshProfile: async () => { state.refreshed++; state.balance = 96; },
    setTargetIndex: value => { state.index = value; }, getApiErrorMessage: failure => failure.message,
    requestAnimationFrame: callback => { scheduledFrames.push(callback); return scheduledFrames.length; },
    setTimeout: (callback, delay) => { scheduledTimers.push({ callback, delay }); return scheduledTimers.length; },
    ...overrides
  };
  const output = ts.transpileModule('const action = ' + handleRoll, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const handler = new Function(...Object.keys(bindings), output + ';return action;')(...Object.values(bindings));
  return { handler, state, refs, bindings, scheduledFrames, scheduledTimers, ...utils };
}

function catalogFixture(listPools, getPool = async () => ({ id: 3, cards: [card] })) {
  const state = { error: null, loadError: null, loading: false, detailLoading: false, loadFailed: false, pools: null, pool: null };
  const refs = { mounted: { current: true }, generation: { current: 1 }, listRequest: { current: 0 }, detailRequest: { current: 0 }, pendingRef: { current: null }, selectedRef: { current: null } };
  const bindings = {
    ...refs, gachaApi: { listPools, getPool }, t: key => key, getApiErrorMessage: failure => failure.message,
    setLoading: value => { state.loading = value; }, setDetailLoading: value => { state.detailLoading = value; },
    setLoadFailed: value => { state.loadFailed = value; }, setLoadError: value => { state.loadError = value; },
    setError: value => { state.error = value; }, setPools: value => { state.pools = value; },
    setPool: value => { state.pool = value; }, setSelectedId: noop
  };
  const compile = name => {
    const output = ts.transpileModule('const action = ' + catalogActions[name], { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    return new Function(...Object.keys(bindings), output + ';return action;')(...Object.values(bindings));
  };
  const loadDetail = compile('loadDetail'); bindings.loadDetail = loadDetail;
  return { state, refs, loadDetail, loadPools: compile('loadPools') };
}

test('successful empty-catalog retry clears its old unavailable-page alert', async () => {
  let calls = 0;
  const retry = deferred();
  const view = catalogFixture(async () => {
    if (++calls === 1) throw new Error('This page is unavailable.');
    return retry.promise;
  });
  await view.loadPools();
  assert.equal(view.state.loadError, 'This page is unavailable.'); assert.equal(view.state.loadFailed, true);
  assert.equal(view.state.error, null, 'catalog errors must not enter roll/action state');
  const loading = view.loadPools();
  assert.equal(view.state.loadError, null, 'retry removes the previous catalog alert while it loads');
  retry.resolve([]); await loading;
  assert.deepEqual(view.state.pools, []); assert.equal(view.state.loadError, null); assert.equal(view.state.loadFailed, false);
});

test('detail retries clear old catalog errors without erasing a roll action notice', async () => {
  let calls = 0;
  const view = catalogFixture(async () => [{ id: 3 }], async () => {
    if (++calls === 1) throw new Error('Pool unavailable');
    return { id: 3, cards: [card] };
  });
  view.state.error = 'gacha.changed';
  await view.loadDetail(3); assert.equal(view.state.loadError, 'Pool unavailable');
  await view.loadDetail(3);
  assert.equal(view.state.loadError, null); assert.equal(view.state.pool.id, 3); assert.equal(view.state.error, 'gacha.changed');
});

test('a pricing conflict notice survives the successful catalog refresh it triggers', async t => {
  const catalog = catalogFixture(async () => [{ id: 3 }]);
  const view = await fixture(t, async () => {
    throw new axios.AxiosError('Changed', 'ERR_BAD_REQUEST', {}, undefined, { status: 409, data: { error: { message: 'Pool changed' } } });
  }, true, { loadPools: catalog.loadPools, setError: value => { catalog.state.error = value; } });
  await view.handler();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(catalog.state.error, 'gacha.changed'); assert.equal(catalog.state.loadError, null);
  assert.equal(catalog.state.pool.id, 3); assert.equal(view.readPendingGacha(7), null);
});

test('gacha response recovery retains one durable operation with accepted cost and odds version', async t => {
  const sent = [];
  const view = await fixture(t, async (id, intent) => {
    sent.push({ id, ...intent });
    if (sent.length === 1) throw new axios.AxiosError('Lost response', 'ECONNABORTED');
    return receipt;
  });
  await view.handler();
  assert.equal(view.readPendingGacha(7).expected_version, 2);
  assert.equal(view.state.error, 'gacha.pending');
  view.bindings.pool.cost_coins = 30; view.bindings.pool.version = 3;
  await view.handler();
  assert.deepEqual(sent[1], sent[0], 'recovery must send the original accepted cost and version');
  assert.equal(view.state.win, receipt);
  assert.equal(view.readPendingGacha(7), null);
  assert.equal(view.state.balance, 96, 'recovered receipts must refresh the current balance');
});

test('recovery works after reload even if its pool is inactive, unaffordable or unconfigured', async t => {
  let sent;
  const view = await fixture(t, async (id, intent) => { sent = { id, ...intent }; return receipt; });
  const saved = { owner_id: 7, pool_id: 3, operation_key: crypto.randomUUID(), expected_cost: 20, expected_version: 2, created_at: new Date().toISOString() };
  assert.equal(view.storePendingGacha(saved), true);
  assert.equal(view.readPendingGacha(8), null);
  view.bindings.pool.is_active = false; view.bindings.pool.cards = []; view.bindings.user.lightning_coins = 0;
  await view.handler();
  assert.equal(sent.operation_key, saved.operation_key);
  assert.equal(view.state.win, receipt);
});

test('gacha does not charge without durable browser storage', async t => {
  let calls = 0;
  const view = await fixture(t, async () => { calls++; return receipt; });
  localStorage.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  await view.handler();
  assert.equal(calls, 0); assert.equal(view.state.error, 'gacha.storage');
});

test('double clicks send one roll while a request is pending', async t => {
  const answer = deferred(); let calls = 0;
  const view = await fixture(t, () => { calls++; return answer.promise; });
  const pending = view.handler(); await view.handler();
  assert.equal(calls, 1); answer.resolve(receipt); await pending;
});

test('a receipt for a former account cannot reveal a card or alter the new account balance', async t => {
  const answer = deferred();
  const view = await fixture(t, () => answer.promise);
  const pending = view.handler(); view.refs.identity.current = 8;
  answer.resolve(receipt); await pending;
  assert.equal(view.state.win, null); assert.equal(view.state.balance, 100); assert.equal(view.state.refreshed, 0);
  assert.ok(view.readPendingGacha(7), 'original owner can recover their committed result');
  assert.equal(view.readPendingGacha(8), null);
});

test('reduced motion reveals the server winner immediately without sounds or roulette timers', async t => {
  const view = await fixture(t, async () => receipt);
  await view.handler();
  assert.equal(view.state.win, receipt); assert.equal(view.state.index, receipt.winning_index);
  assert.equal(view.state.sounds, 0); assert.equal(view.scheduledFrames.length, 0); assert.equal(view.scheduledTimers.length, 0);
});

test('roulette uses the actual server strip and slot, then reveals that exact server card', async t => {
  const view = await fixture(t, async () => receipt, false);
  await view.handler();
  assert.equal(view.state.win, null); assert.deepEqual(view.state.strip, receipt.animation_cards); assert.equal(view.state.index, 1);
  view.scheduledFrames[0](); view.scheduledFrames[1]();
  const finish = view.scheduledTimers.find(timer => timer.delay === 5300);
  assert.ok(finish); finish.callback();
  assert.equal(view.state.win.winning_card.id, card.id);
  assert.equal(view.readPendingGacha(7), null);
});

test('a malformed winning slot leaves the intent recoverable and never reveals an adjacent card', async t => {
  const view = await fixture(t, async () => ({ ...receipt, winning_index: 0 }));
  await view.handler();
  assert.equal(view.state.win, null); assert.equal(view.state.balance, 100); assert.ok(view.readPendingGacha(7));
  assert.equal(view.state.error, 'gacha.pending');
  assert.equal(view.validGachaResult({ ...receipt, winning_index: 500 }, 3), false);
});

test('an odds or price conflict requires reviewing the refreshed offer and clears its rejected intent', async t => {
  const view = await fixture(t, async () => { throw new axios.AxiosError('Changed', 'ERR_BAD_REQUEST', {}, undefined, { status: 409, data: { error: { message: 'Pool changed' } } }); });
  await view.handler();
  assert.equal(view.readPendingGacha(7), null); assert.equal(view.state.error, 'gacha.changed'); assert.equal(view.state.reloaded, 1);
});

test('in-progress conflicts retain the gacha receipt key', async t => {
  const view = await fixture(t, async () => { throw new axios.AxiosError('Pending', 'ERR_BAD_REQUEST', {}, undefined, { status: 409, data: { error: { message: 'Operation is in progress; retry with the same key' } } }); });
  await view.handler(); assert.ok(view.readPendingGacha(7)); assert.equal(view.state.error, 'gacha.pending');
});

test('duplicate result retains its refund receipt and does not invent a second card', async t => {
  const duplicate = { ...receipt, is_duplicate: true, refund_coins: 20, new_balance: 100 };
  const view = await fixture(t, async () => duplicate);
  await view.handler();
  assert.equal(view.state.win, duplicate); assert.equal(view.state.win.refund_coins, 20); assert.equal(view.state.win.is_duplicate, true);
});

test('roulette target is centered across mobile and desktop viewports without hardcoding a slot', async () => {
  const { gachaStripOffset } = await loadUtility('src/utils/gachaIntent.ts');
  for (const width of [280, 600, 1080]) for (const index of [0, 1, 35, 39]) {
    assert.equal(gachaStripOffset(width, index) + index * 148 + 68, width / 2);
  }
});

test('positive rare probabilities are never rounded to a false zero chance', async () => {
  const { formatGachaProbability } = await loadUtility('src/utils/gachaIntent.ts');
  assert.equal(formatGachaProbability(0, 'en-US'), '0%');
  assert.equal(formatGachaProbability(1e-10, 'en-US'), '<0.000001%');
  assert.equal(formatGachaProbability(12.345678, 'en-US'), '12.345678%');
});

test('unowned character cards expose Gacha navigation and never a price or purchase action', async t => {
  installBrowserGlobals(t);
  const { ShopItemCard } = await loadModuleWithMocks('src/components/shop/ShopItemCard.tsx', {
    '../../context/LanguageContext': { useLanguage: () => ({ t: key => key }) },
    '../../context/AuthContext': { useAuth: () => ({ user: { lightning_coins: 100 }, isAuthenticated: true }) },
    'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { ...props, href: to }, children) }
  });
  const html = renderToString(React.createElement(ShopItemCard, { item: card, isEquipped: false }));
  assert.match(html, /href="\/wheel\?category=gacha"/); assert.match(html, /gacha.exclusiveCard/);
  assert.doesNotMatch(html, /cards.buy|shop.buy|common.coins|shop.equip/);
});

test('a stale shop card cannot send a purchase even if it reaches the click handler', async () => {
  const shopSource = await readFile(new URL('../src/pages/ShopPage.tsx', import.meta.url), 'utf8');
  const shopAst = ts.createSourceFile('ShopPage.tsx', shopSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let buy;
  function findBuy(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(shopAst) === 'handleBuy') buy = node.initializer.getText(shopAst);
    ts.forEachChild(node, findBuy);
  }
  findBuy(shopAst);
  let calls = 0;
  const bindings = { items: [card], actorIdentity: { current: 7 }, actionLock: { current: false }, shopApi: { buyItem: () => { calls++; } } };
  const output = ts.transpileModule('const action = ' + buy, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const action = new Function(...Object.keys(bindings), output + ';return action;')(...Object.values(bindings));
  assert.equal(await action(card.id), false); assert.equal(calls, 0); assert.equal(bindings.actionLock.current, false);
});

test('all gacha labels and revised acquisition rules exist in English, Uzbek and Russian', async () => {
  const { gachaTranslations } = await loadUtility('src/i18n/gacha.ts');
  const keys = Object.keys(gachaTranslations.en).sort();
  for (const locale of ['en', 'uz', 'ru']) {
    assert.deepEqual(Object.keys(gachaTranslations[locale]).sort(), keys);
    for (const key of keys) assert.ok(gachaTranslations[locale][key]);
  }
});
