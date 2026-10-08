import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { axios, deferred, installBrowserGlobals, loadUtility, loadClient, loadModuleWithMocks, response } from './helpers.mjs';

// Execute handlers/effects from their actual source with only the external seams replaced.
async function action(file, name, bindings) {
  const source = await readFile(new URL('../src/' + file, import.meta.url), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) initializer = node.initializer.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(initializer, name + ' must exist');
  const output = ts.transpileModule('const action = ' + initializer, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return new Function(...Object.keys(bindings), output + '; return action;')(...Object.values(bindings));
}
const event = { preventDefault() {} };
const noop = () => {};

async function effect(file, needle, bindings) {
  const source = await readFile(new URL('../src/' + file, import.meta.url), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  function visit(node) {
    if (ts.isCallExpression(node) && /^use(?:Layout)?Effect$/.test(node.expression.getText(ast)) && node.arguments[0]?.getText(ast).includes(needle)) initializer = node.arguments[0].getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(initializer, needle + ' effect must exist');
  const output = ts.transpileModule('const action = ' + initializer, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return new Function(...Object.keys(bindings), output + '; return action;')(...Object.values(bindings));
}

test('novel settings scroll beneath the actual sticky header and receive keyboard focus', async () => {
  const scrolled = [], focused = [];
  const run = await effect('components/reader/NovelReader.tsx', 'panel.focus', {
    showSettings: true, settingsRef: { current: { getBoundingClientRect: () => ({ top: -224 }), focus: options => focused.push(options) } },
    headerRef: { current: { offsetHeight: 96 } }, articleRef: { current: null },
    window: { scrollY: 293, scrollTo: options => scrolled.push(options) }
  });
  run();
  assert.deepEqual(scrolled, [{ top: 0, behavior: 'auto' }]);
  assert.deepEqual(focused, [{ preventScroll: true }]);
});

test('illustrated novels render sorted images after text and completion waits for every loaded illustration', async t => {
  const { window } = installBrowserGlobals(t);
  const { NovelReader } = await loadModuleWithMocks('src/components/reader/NovelReader.tsx', {
    react: { default: React, useState: React.useState, useEffect: noop, useLayoutEffect: noop, useMemo: React.useMemo, useRef: React.useRef, forwardRef: React.forwardRef, createElement: React.createElement },
    'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children), useNavigate: () => noop },
    '../../context/LanguageContext': { useLanguage: () => ({ t: key => key }) },
    '../../hooks/useNovelPageMotion': { useNovelPageMotion: () => ({ motion: null, isSettling: false, dragPage: noop, cancelDrag: noop, turnPage: noop, finishMotion: noop }) },
    '../../hooks/useNovelPageSwipe': { useNovelPageSwipe: () => ({}) },
    './RewardClaimCard': { RewardClaimCard: () => null }, '../comments/ChapterComments': { ChapterComments: () => null }
  });
  const images = [{ id: 2, order_index: 1, image_url: '/second.webp', width: 100, height: 200 }, { id: 1, order_index: 0, image_url: '/first.webp', width: 100, height: 200 }];
  const html = renderToString(React.createElement(NovelReader, { data: { id: 10, webtoon_id: 1, chapter_number: 1, content_text: 'Original chapter text', images }, allChapters: [], onClaimSuccess: noop, onProgress: noop, rewardReady: false }));
  assert.ok(html.indexOf('Original chapter text') < html.indexOf('/first.webp'));
  assert.ok(html.indexOf('/first.webp') < html.indexOf('/second.webp'));
  assert.ok(html.includes('reader.illustrations'));
  const loadedIllustrations = new Set([1]), completed = [], completeRef = { current: false };
  let check, bottom = 1300;
  window.innerHeight = 650;
  const run = await effect('components/reader/NovelReader.tsx', 'IntersectionObserver', {
    isLastPage: true, data: { content_text: 'Original chapter text' }, endRef: { current: { getBoundingClientRect: () => ({ bottom }) } },
    motionActive: { current: false }, completeRef, loadedIllustrations, illustrations: images,
    onProgress: value => completed.push(value), page: 0, activePage: { startWord: 0 }, window,
    IntersectionObserver: class { constructor(callback) { check = callback; } observe() {} disconnect() {} },
    requestAnimationFrame: callback => { callback(); return 1; }, cancelAnimationFrame: noop
  });
  const cleanup = run();
  bottom = 600; check(); assert.deepEqual(completed, [], 'an unloaded image cannot be skipped by scrolling');
  loadedIllustrations.add(2); bottom = 1300; check(); assert.deepEqual(completed, [], 'loading alone does not complete an unseen end');
  bottom = 600; check(); check();
  assert.equal(completed.length, 1); assert.equal(completed[0].completed, true); assert.equal(completed[0].progress_percent, 100);
  cleanup();
});

test('manga reuses pinch-safe gesture tracking and resets tall-page scroll on page turns', async t => {
  const { window } = installBrowserGlobals(t);
  const layouts = [], calls = [];
  let swipeOptions;
  const { MangaReader } = await loadModuleWithMocks('src/components/reader/MangaReader.tsx', {
    react: { default: React, useState: React.useState, useEffect: noop, useLayoutEffect: callback => layouts.push(callback), useCallback: React.useCallback, useRef: React.useRef, forwardRef: React.forwardRef, createElement: React.createElement },
    'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children), useNavigate: () => noop },
    '../../context/LanguageContext': { useLanguage: () => ({ t: key => key }) },
    '../../hooks/useNovelPageSwipe': { useNovelPageSwipe: options => { swipeOptions = options; return {}; } },
    './RewardClaimCard': { RewardClaimCard: () => null }, '../comments/ChapterComments': { ChapterComments: () => null }
  });
  renderToString(React.createElement(MangaReader, { data: { id: 10, webtoon_id: 1, chapter_number: 1, images: [{ id: 1, order_index: 0, image_url: '/first.webp' }, { id: 2, order_index: 1, image_url: '/second.webp' }] }, allChapters: [], onClaimSuccess: noop, onProgress: noop, rewardReady: false }));
  assert.equal(swipeOptions.enabled, true);
  assert.equal(typeof swipeOptions.onTurnPage, 'function');
  window.scrollY = 252; window.scrollTo = (...args) => calls.push(args);
  layouts.forEach(callback => callback());
  assert.deepEqual(calls, [[0, 0]]);
});

test('ordinary profile save is one atomic request and cannot refresh a switched account', async () => {
  const result = deferred(), actorIdentity = { current: 7 }, calls = [], feedback = [];
  let refreshes = 0;
  const handler = await action('pages/ProfilePage.tsx', 'handleUpdateProfile', {
    user: { id: 7, username: 'old', bio: '' }, actorIdentity, newUsername: 'new', bio: 'A retained draft',
    profileSaveLock: { current: false }, changingPassword: false, setSavingProfile: noop,
    setFeedback: value => feedback.push(value), t: key => key,
    usersApi: { updateProfile: payload => { calls.push(payload); return result.promise; } },
    refreshProfile: () => { refreshes++; }, getApiErrorMessage: error => error.message
  });
  const pending = handler(event);
  assert.deepEqual(calls, [{ username: 'new', bio: 'A retained draft' }]);
  actorIdentity.current = 8; result.resolve({}); await pending;
  assert.equal(refreshes, 0);
  assert.ok(!feedback.some(value => value?.type === 'success'));
});

test('profile validation failure preserves both drafts and shows an actionable error', async () => {
  const feedback = [];
  const handler = await action('pages/ProfilePage.tsx', 'handleUpdateProfile', {
    user: { id: 7, username: 'old', bio: '' }, actorIdentity: { current: 7 }, newUsername: 'new', bio: 'draft',
    profileSaveLock: { current: false }, changingPassword: false, setSavingProfile: noop,
    setFeedback: value => feedback.push(value), t: key => key,
    usersApi: { updateProfile: async () => { throw new Error('Username unavailable'); } },
    refreshProfile: noop, getApiErrorMessage: error => error.message
  });
  await handler(event);
  assert.deepEqual(feedback.at(-1), { type: 'error', message: 'Username unavailable' });
});

test('delayed friend and clan mutations cannot alter the next account or its wallet', async () => {
  const friendAnswer = deferred(), actorIdentity = { current: 7 }, writes = [];
  const friend = await action('pages/FriendsPage.tsx', 'handleSendRequest', {
    actorIdentity, actionLock: { current: false }, moreLock: { current: false }, setActionBusy: noop,
    friendsApi: { sendFriendRequest: () => friendAnswer.promise },
    setSearchResults: value => writes.push(value), setFeedbackMessage: value => writes.push(value), loadData: () => writes.push('refresh'),
    t: key => key, getApiErrorMessage: error => error.message
  });
  const pendingFriend = friend(20); actorIdentity.current = 8; friendAnswer.resolve({ data: { status: 'accepted' } }); await pendingFriend;
  assert.deepEqual(writes, []);
  const clanAnswer = deferred(); actorIdentity.current = 7;
  const clan = await action('pages/ClansPage.tsx', 'handleCreateClan', {
    actorIdentity, createLock: { current: false }, isSubmitting: false, creationCost: 200, user: { id: 7 },
    formName: 'Draft clan', formTag: 'test', formDescription: 'Keep on failure', setFormError: noop, setIsSubmitting: noop,
    clansApi: { createClan: () => clanAnswer.promise }, setCreateModalOpen: () => writes.push('close'),
    updateCoinsLocally: value => writes.push(value), refreshProfile: () => writes.push('refresh'), navigate: value => writes.push(value),
    getApiErrorMessage: error => error.message, t: key => key, setCreationCost: noop
  });
  const pendingClan = clan(event); actorIdentity.current = 8; clanAnswer.resolve({ data: { id: 5, remaining_coins: 80 } }); await pendingClan;
  assert.deepEqual(writes, []);
});

test('password change has its own action and ends the session only after acknowledgement', async () => {
  const result = deferred(), calls = [], state = [];
  const handler = await action('pages/ProfilePage.tsx', 'handleChangePassword', {
    user: { id: 7 }, actorIdentity: { current: 7 }, profileSaveLock: { current: false }, changingPassword: false,
    oldPassword: 'old-password', newPassword: 'new-password', setChangingPassword: noop, setFeedback: noop,
    authApi: { updateProfile: payload => { calls.push(payload); return result.promise; } },
    setOldPassword: value => state.push(['old', value]), setNewPassword: value => state.push(['new', value]),
    clearReaderSession: () => state.push(['ended']), setPasswordChanged: value => state.push(['notice', value]),
    getApiErrorMessage: error => error.message, t: key => key
  });
  const pending = handler(event);
  assert.deepEqual(calls, [{ old_password: 'old-password', new_password: 'new-password' }]);
  assert.deepEqual(state, []);
  result.resolve({}); await pending;
  assert.deepEqual(state, [['old', ''], ['new', ''], ['ended'], ['notice', true]]);
});

test('initial mutation dispatch captures credentials before an immediate account switch', async t => {
  const browser = installBrowserGlobals(t);
  const previous = axios.defaults.adapter;
  let sent;
  axios.defaults.adapter = async config => { sent = config; return response(config, {}); };
  t.after(() => { axios.defaults.adapter = previous; });
  const client = await loadClient();
  browser.storage.setItem(client.ACCESS_TOKEN_KEY, 'account-seven');
  browser.storage.setItem(client.REFRESH_TOKEN_KEY, 'refresh-seven');
  const pending = client.apiClient.patch('/users/profile', { bio: 'Old account draft' });
  browser.storage.setItem(client.ACCESS_TOKEN_KEY, 'account-eight');
  browser.storage.setItem(client.REFRESH_TOKEN_KEY, 'refresh-eight');
  await pending;
  assert.equal(sent.headers.get('Authorization'), 'Bearer account-seven');
});

test('local positions reject malformed anchors, ranges and metadata without dropping valid neighbours', async t => {
  const { storage } = installBrowserGlobals(t);
  const { readPositions, validPosition, writePosition } = await loadUtility('src/utils/readingStorage.ts');
  const valid = { webtoon_id: 1, chapter_id: 10, page_index: 2, anchor: 'image:2:0.5', progress_percent: 45, completed: false };
  const invalid = [
    { anchor: 45 }, { anchor: {} }, { anchor: 'word:-1' }, { anchor: 'image:2:1.5' }, { anchor: 'word:99999999999999999' }, { anchor: 'word:1:0.5' },
    { page_index: -1 }, { page_index: 2.5 }, { progress_percent: -1 }, { progress_percent: 101 },
    { completed: 'false' }, { updated_at: 'invalid' }, { reward_eligible_at: {} },
    { webtoon_title: {} }, { webtoon_type: 'audio' }, { webtoon_type: { toString: 'novel' } }, { webtoon: { title: [] } }
  ].map(overrides => ({ ...valid, ...overrides }));
  assert.ok(validPosition(valid));
  invalid.forEach(value => assert.equal(validPosition(value), false));
  storage.setItem('webtoonhub_reading_7', JSON.stringify([...invalid, valid]));
  assert.deepEqual(readPositions(7), [valid]);
  writePosition(invalid[0], 7);
  assert.deepEqual(readPositions(7), [valid]);
});

async function spinFixture(t, send, reduced = true) {
  installBrowserGlobals(t);
  const intentUtils = await loadUtility('src/utils/spinIntent.ts');
  const state = { error: null, win: null, modal: false, balance: 100, sounds: 0, confetti: 0 };
  const refs = { pendingIntentRef: { current: null }, spinLock: { current: false }, listRequest: { current: 1 }, mounted: { current: true }, spinTimer: { current: null }, tickTimer: { current: null }, finishSpin: { current: null } };
  const handler = await action('pages/LuckyWheelPage.tsx', 'handleSpin', {
    ...refs, ...intentUtils, axios, user: { id: 7, lightning_coins: 100 }, isAuthenticated: true, spinning: false,
    wheelDetail: { id: 3, cost_coins: 20, is_free_spin_available: false, items: [{}, {}] }, selectedWheelId: 3, detailLoading: false,
    motionPreference: { current: reduced }, rotation: 0, t: key => key, openAuthModal: noop,
    wheelApi: { spinWheel: send }, setPendingIntent: noop, setSpinning: noop, setErrorToast: value => { state.error = value; },
    updateCoinsLocally: value => { state.balance = value; }, setWinResult: value => { state.win = value; },
    setShowWinModal: value => { state.modal = value; }, setWheelDetail: noop, setWheels: noop, setRotation: noop,
    playTickSound: () => { state.sounds++; }, playWinSound: () => { state.sounds++; }, confetti: () => { state.confetti++; },
    loadHistory: noop, loadWheelDetail: noop, refreshProfile: async () => { state.balance = 94; }, getApiErrorMessage: error => error.message
  });
  return { handler, state, refs, ...intentUtils };
}
const spinResult = { spin_id: 4, new_balance: 88, is_free_spin: false, winning_index: 0, winning_item: { is_jackpot: false, reward_type: 'coins', reward_coins: 8 }, outcome: 'coins', reward_coins: 8 };

test('ambiguous wheel responses and manual retry retain exactly one durable operation key', async t => {
  const sent = [];
  const view = await spinFixture(t, async (id, intent) => {
    sent.push({ id, ...intent });
    if (sent.length === 1) throw new axios.AxiosError('Lost response', 'ECONNABORTED');
    return spinResult;
  });
  await view.handler();
  const remembered = view.readPendingSpin(7);
  assert.equal(remembered.expected_cost, 20);
  assert.equal(view.state.error, 'wheel.pendingSpin');
  assert.equal(view.state.win, null);
  await view.handler();
  assert.deepEqual(sent[1], sent[0]);
  assert.equal(view.state.win, spinResult);
  assert.equal(view.state.balance, 94, 'recovered historical receipts must refresh the current balance');
  assert.equal(view.readPendingSpin(7), null);
});

test('pending wheel requests survive a reload and never belong to another account', async t => {
  const sent = [];
  const view = await spinFixture(t, async (id, intent) => { sent.push(intent); return spinResult; });
  const saved = { owner_id: 7, wheel_id: 3, expected_mode: 'paid', expected_cost: 20, operation_key: crypto.randomUUID(), created_at: new Date().toISOString() };
  assert.equal(view.storePendingSpin(saved), true);
  assert.equal(view.readPendingSpin(8), null);
  await view.handler();
  assert.equal(sent[0].operation_key, saved.operation_key);
  assert.equal(view.state.modal, true);
});

test('wheel does not send a charge when durable storage is unavailable', async t => {
  let calls = 0;
  const view = await spinFixture(t, async () => { calls++; return spinResult; });
  localStorage.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  await view.handler();
  assert.equal(calls, 0);
  assert.equal(view.state.error, 'wheel.pendingStorage');
});

test('in-progress operation conflicts retain the recoverable wheel key', async t => {
  const view = await spinFixture(t, async () => {
    throw new axios.AxiosError('Conflict', 'ERR_BAD_REQUEST', {}, undefined, { status: 409, data: { error: { message: 'Operation is still in progress; retry with the same key' } } });
  });
  await view.handler();
  assert.ok(view.readPendingSpin(7));
  assert.equal(view.state.error, 'wheel.pendingSpin');
});

test('reduced-motion spins show the acknowledged result immediately without animation, sounds or confetti', async t => {
  const view = await spinFixture(t, async () => spinResult);
  await view.handler();
  assert.equal(view.state.win, spinResult);
  assert.equal(view.refs.spinTimer.current, null);
  assert.equal(view.refs.tickTimer.current, null);
  assert.equal(view.state.sounds, 0);
  assert.equal(view.state.confetti, 0);
});

test('a spin acknowledged after switching accounts leaves recovery with its original owner', async t => {
  const answer = deferred();
  const view = await spinFixture(t, () => answer.promise);
  const pending = view.handler();
  view.refs.listRequest.current++;
  answer.resolve(spinResult); await pending;
  assert.equal(view.state.win, null);
  assert.equal(view.state.balance, 100);
  assert.ok(view.readPendingSpin(7));
  assert.equal(view.readPendingSpin(8), null);
});

test('chat catch-up fills more than fifty missing messages despite a newer socket message', async () => {
  let messages = [], requests = [], phase = 'initial';
  const messagesRef = { current: messages };
  const item = id => ({ id, content: 'message-' + id, created_at: '2026-10-07T12:00:00Z' });
  const mergeMessages = await action('pages/ClanDetailPage.tsx', 'mergeMessages', {});
  const catchUp = await action('pages/ClanDetailPage.tsx', 'catchUp', {
    messagesRef, restCursor: undefined, initialized: false, catchUpFlight: null, disposed: false, clanId: 5,
    clansApi: { getClanMessages: async (_clan, limit, before, after) => {
      requests.push(after);
      if (phase === 'initial') return { data: Array.from({ length: 10 }, (_, index) => item(index + 1)), has_more: false };
      const last = Math.min(200, after + limit);
      return { data: Array.from({ length: last - after }, (_, index) => item(after + index + 1)), has_more: last < 200 };
    } },
    setChatLoading: noop, setHasOlder: noop, setChatError: noop, scrollToBottom: noop,
    setMessages: update => { messages = update(messages); messagesRef.current = messages; }, mergeMessages,
    getApiErrorMessage: error => error.message, t: key => key
  });
  await catchUp();
  messages = mergeMessages(messages, [item(200)]); messagesRef.current = messages; phase = 'reconnect';
  await Promise.all([catchUp(), catchUp()]);
  assert.deepEqual(requests, [undefined, 10, 60, 110, 160]);
  assert.deepEqual(messages.map(message => message.id), Array.from({ length: 200 }, (_, index) => index + 1));
});

test('comments reject excessive content before sending and retain failed drafts', async () => {
  const errors = [], cleared = [], sent = [];
  const base = {
    isAuthenticated: true, openAuthModal: noop, mutation: { current: false }, moreFlight: { current: false }, repliesFlight: { current: false },
    setMutationBusy: noop, setIsSubmitting: noop, setError: value => errors.push(value), identity: '10:7', current: { current: '10:7' },
    chapterId: 10, setComments: noop, author: noop, setCommentText: value => cleared.push(value), COMMENT_MAX_LENGTH: 500,
    commentsApi: { createComment: async (_chapter, body) => { sent.push(body); throw new Error('Offline'); } },
    t: key => key, getApiErrorMessage: error => error.message
  };
  const excessive = await action('components/comments/ChapterComments.tsx', 'post', { ...base, commentText: 'x'.repeat(501) });
  await excessive(event); assert.deepEqual(sent, []); assert.equal(errors.at(-1), 'comments.tooLong');
  const valid = await action('components/comments/ChapterComments.tsx', 'post', { ...base, commentText: 'Preserve this draft' });
  await valid(event); assert.equal(errors.at(-1), 'Offline'); assert.deepEqual(cleared, []);
});
