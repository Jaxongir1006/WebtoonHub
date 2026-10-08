import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { deferred, installBrowserGlobals, loadModuleWithMocks, loadUtility } from './helpers.mjs';

const cards = await loadUtility('src/utils/cards.ts');
const animated = { id: 7, name: 'Hero card', item_type: 'card', rarity: 'legendary', character_name: 'Hero', series_title: 'A series', asset_url: '/content/cards/hero.gif', asset_preview_url: '/content/cards/hero-preview.webp', asset_animated: true, price_coins: 20, is_owned: false };

test('card media never treats an animated source as the initial grid poster', () => {
  assert.deepEqual(cards.cardMediaSources(animated), { poster: animated.asset_preview_url, animation: animated.asset_url });
  assert.equal(cards.cardMediaSources({ ...animated, asset_preview_url: null }).poster, null);
  assert.equal(cards.cardMediaSources({ ...animated, asset_preview_url: animated.asset_url }).poster, null);
  assert.deepEqual(cards.cardMediaSources({ ...animated, asset_animated: false, asset_preview_url: null, asset_url: '/content/cards/still.png' }), { poster: '/content/cards/still.png', animation: null });
});

test('cards only accept raster URLs and never HTML, SVG, script or video artwork', () => {
  for (const asset_url of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', '/content/cards/file.svg', '/content/cards/file.html', '/content/cards/movie.mp4']) assert.equal(cards.cardMediaSources({ asset_url }).poster, null);
  assert.equal(cards.cardMediaSources({ asset_url: 'https://media.example/card.jpg?token=value' }).poster, 'https://media.example/card.jpg?token=value');
});

test('card animation respects motion preference, explicit pause and user-requested play', () => {
  assert.equal(cards.shouldPlayCardAnimation(true, null, false, false, false, false), false, 'a grid card must start still');
  assert.equal(cards.shouldPlayCardAnimation(true, null, false, true, false, false), true, 'hover requests the animated source');
  assert.equal(cards.shouldPlayCardAnimation(true, null, false, false, true, false), true, 'keyboard focus requests the animated source');
  assert.equal(cards.shouldPlayCardAnimation(true, null, true, true, true, true), false, 'reduced motion suppresses automatic grid and featured animations');
  assert.equal(cards.shouldPlayCardAnimation(true, true, true, false, false, false), true, 'an explicit Play action may override the preference');
  assert.equal(cards.shouldPlayCardAnimation(true, false, false, true, true, true), false, 'explicit Pause must win over all automatic triggers');
  assert.equal(cards.shouldPlayCardAnimation(false, true, false, true, true, true), false, 'still artwork must never get animation controls');
});

test('entering Play before clicking cannot turn the first explicit Play action into Pause', async () => {
  const source = await readFile(new URL('../src/components/cards/CardMedia.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('CardMedia.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let hoverHandler, clickHandler;
  function findHandlers(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'requestHover') hoverHandler = node.initializer.getText(ast);
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'onClick' && ts.isJsxExpression(node.initializer)) clickHandler = node.initializer.expression.getText(ast);
    ts.forEachChild(node, findHandlers);
  }
  findHandlers(ast);
  assert.ok(hoverHandler && clickHandler, 'Exercise the actual media hover and click handlers');
  let hovered = false, manual = null;
  const control = { closest: selector => selector === '[data-card-animation-control]' ? {} : null };
  const artwork = { closest: () => null };
  const playing = () => cards.shouldPlayCardAnimation(true, manual, false, hovered, false, false);
  const compile = (handler, bindings) => {
    const output = ts.transpileModule('const action = ' + handler, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    return new Function(...Object.keys(bindings), output + ';return action;')(...Object.values(bindings));
  };
  const enter = compile(hoverHandler, { cardHoverRequested: cards.cardHoverRequested, window: { matchMedia: () => ({ matches: true }) }, setHovered: value => { hovered = value; } });
  enter({ target: control });
  assert.equal(playing(), false, 'Entering the manual button must leave Play as Play');
  compile(clickHandler, { playing: playing(), setManual: value => { manual = value; } })();
  assert.equal(playing(), true, 'The first click must start animation and expose Pause');
  compile(clickHandler, { playing: playing(), setManual: value => { manual = value; } })();
  assert.equal(playing(), false, 'The next click must pause');
  manual = null;
  enter({ target: control }); enter({ target: artwork });
  assert.equal(playing(), true, 'Moving from the control onto artwork must still enable automatic hover playback');
  enter({ target: control });
  assert.equal(playing(), true, 'Returning to the control must preserve an already-playing preview so Pause still pauses');
  compile(clickHandler, { playing: playing(), setManual: value => { manual = value; } })();
  assert.equal(playing(), false);
});

test('collection rarity counts include legendary cards and ignore profile decorations', () => {
  assert.deepEqual(cards.countCardRarities([{ item_type: 'card', rarity: 'legendary' }, { item_type: 'card', rarity: 'legendary' }, { item_type: 'card', rarity: 'epic' }, { item_type: 'card', rarity: 'rare' }, { item_type: 'card', rarity: 'common' }, { item_type: 'frame', rarity: 'legendary' }]), { common: 1, rare: 1, epic: 1, legendary: 2 });
});

test('featured selection permits three unique owned-card choices and supports deselection', () => {
  const selected = [1, 2, 3];
  assert.equal(cards.toggleFeaturedCard(selected, 4), selected, 'the full selection must not silently replace a featured card');
  assert.deepEqual(cards.toggleFeaturedCard(selected, 2), [1, 3]);
  assert.deepEqual(cards.toggleFeaturedCard([1, 3], 4), [1, 3, 4]);
});

test('shop artwork initially renders only its static preview and has an accessible Play control', async t => {
  installBrowserGlobals(t);
  window.matchMedia = () => ({ matches: false });
  const { CardMedia } = await loadModuleWithMocks('src/components/cards/CardMedia.tsx', { '../../context/LanguageContext': { useLanguage: () => ({ t: (key, params) => key + (params?.name || '') }) } });
  const html = renderToString(React.createElement(CardMedia, { item: animated }));
  assert.match(html, /src="\/content\/cards\/hero-preview.webp"/);
  assert.doesNotMatch(html, /src="\/content\/cards\/hero.gif"/);
  assert.match(html, /aria-label="cards.playAnimationHero card"/);
  assert.match(html, /aria-pressed="false"/);
  const still = renderToString(React.createElement(CardMedia, { item: { ...animated, asset_animated: false, asset_url: '/content/cards/still.webp', asset_preview_url: null } }));
  assert.doesNotMatch(still, /<button/);
});

test('featured card animation remains still when reduced motion is enabled', async t => {
  installBrowserGlobals(t);
  window.matchMedia = () => ({ matches: true });
  const { CardMedia } = await loadModuleWithMocks('src/components/cards/CardMedia.tsx', { '../../context/LanguageContext': { useLanguage: () => ({ t: key => key }) } });
  const html = renderToString(React.createElement(CardMedia, { item: animated, featured: true }));
  assert.match(html, /src="\/content\/cards\/hero-preview.webp"/);
  assert.doesNotMatch(html, /src="\/content\/cards\/hero.gif"/);
});

test('owned shop cards expose collection navigation without an Equip action', async t => {
  installBrowserGlobals(t);
  const { ShopItemCard } = await loadModuleWithMocks('src/components/shop/ShopItemCard.tsx', {
    '../../context/LanguageContext': { useLanguage: () => ({ t: key => key }) },
    '../../context/AuthContext': { useAuth: () => ({ user: { lightning_coins: 100 }, isAuthenticated: true }) },
    'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { ...props, href: to }, children) }
  });
  const html = renderToString(React.createElement(ShopItemCard, { item: { ...animated, is_owned: true }, isEquipped: false }));
  assert.match(html, /href="\/inventory\?type=card"/);
  assert.match(html, /cards.rarity.legendary/);
  assert.doesNotMatch(html, /shop.equip|shop.unequip/);
});

test('public collection summaries render every rarity and only the featured gallery', async t => {
  installBrowserGlobals(t);
  const { CardCollectionPanel } = await loadModuleWithMocks('src/components/cards/CardCollectionPanel.tsx', {
    '../../context/LanguageContext': { useLanguage: () => ({ t: key => key }) },
    '../../api/shop': { shopApi: { getMyCollection() { throw new Error('A public summary must not request the owner inventory'); } } },
    '../../api/client': { getApiErrorMessage: () => '' },
    'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { ...props, href: to }, children) }
  });
  const html = renderToString(React.createElement(CardCollectionPanel, { summary: { total_cards: 9, rarity_counts: { common: 4, rare: 2, epic: 1, legendary: 2 }, featured_cards: [animated] } }));
  for (const rarity of ['common', 'rare', 'epic', 'legendary']) assert.match(html, new RegExp('cards.rarity.' + rarity));
  assert.match(html, /Hero card/);
  assert.doesNotMatch(html, /cards.manage|cards.save|cards.gallery/);
});

test('all card labels and rarity names are translated in English, Uzbek and Russian', async () => {
  const { cardTranslations } = await loadUtility('src/i18n/cards.ts');
  const keys = Object.keys(cardTranslations.en).sort();
  for (const locale of ['en', 'uz', 'ru']) {
    assert.deepEqual(Object.keys(cardTranslations[locale]).sort(), keys);
    for (const key of keys) assert.ok(cardTranslations[locale][key], locale + ': ' + key);
  }
});

test('profile decorations stay clearly separate when a reader owns cards but no cosmetics', async () => {
  const source = await readFile(new URL('../src/pages/ProfilePage.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('ProfilePage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let filter;
  function findFilter(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'filteredInventoryItems') filter = node.initializer.getText(ast);
    ts.forEachChild(node, findFilter);
  }
  findFilter(ast);
  const actualFilter = new Function('inventoryItems', 'inventoryFilter', 'return ' + filter);
  assert.deepEqual(actualFilter([{ id: 7, item_type: 'card' }], 'all'), [], 'the decorations-only count remains empty for a card-only collection');
  const { cardTranslations } = await loadUtility('src/i18n/cards.ts');
  for (const key of ['cards.decorationsTitle', 'cards.allDecorations', 'cards.decorationsEmpty', 'cards.decorationsEmptyDetail']) {
    assert.ok(source.includes("t('" + key + "')"), 'the actual profile decorations surface must use ' + key);
    for (const locale of ['en', 'uz', 'ru']) assert.ok(cardTranslations[locale][key], locale + ': ' + key);
  }
  const inventory = await readFile(new URL('../src/pages/InventoryPage.tsx', import.meta.url), 'utf8');
  assert.ok(inventory.includes("t('inventory.tabAll')") && inventory.includes('{items.length}'), 'the full inventory continues to include cards in its all-items count');
});

test('card purchase feedback uses the chosen locale rather than a raw backend message', async () => {
  const source = await readFile(new URL('../src/pages/ShopPage.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('ShopPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let purchase;
  function findPurchase(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleBuy') purchase = node.initializer.getText(ast); ts.forEachChild(node, findPurchase); }
  findPurchase(ast);
  assert.ok(purchase, 'Execute the real shop purchase handler');
  const { cardTranslations } = await loadUtility('src/i18n/cards.ts');
  const { currentAudit } = await loadUtility('src/i18n/currentAudit.ts');
  for (const locale of ['en', 'uz', 'ru']) {
    let toast; let sentPrice;
    const bindings = {
      items: [animated], actionLock: { current: false }, actorIdentity: { current: 7 }, setActionBusy() {}, setItems() {}, updateCoinsLocally() {},
      shopApi: { buyItem: async (id, price) => { sentPrice = price; return { message: 'Buyum muvaffaqiyatli xarid qilindi...', data: { remaining_coins: 80, item_name: animated.name, price_paid: 20 } }; } },
      showToast: (type, message) => { toast = { type, message }; }, t: (key, values = {}) => (cardTranslations[locale][key] || currentAudit[locale][key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? '')),
      fetchItems: async () => {}, refreshProfile: async () => {}, getApiErrorMessage: () => ''
    };
    const output = ts.transpileModule('const action = ' + purchase, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    const handler = new Function(...Object.keys(bindings), output + ';return action;')(...Object.values(bindings));
    assert.equal(await handler(animated.id), true);
    assert.equal(sentPrice, animated.price_coins, 'the accepted offer must be sent before charging');
    const receipt = currentAudit[locale]['shop.receipt'].replace('{name}', animated.name).replace('{price}', '20');
    assert.deepEqual(toast, { type: 'success', message: cardTranslations[locale]['cards.collectSuccess'] + ' ' + receipt });
  }
});

const panelSource = await readFile(new URL('../src/components/cards/CardCollectionPanel.tsx', import.meta.url), 'utf8');
const panelAst = ts.createSourceFile('CardCollectionPanel.tsx', panelSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const actions = {};
function findActions(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(panelAst) === 'load') actions.load = node.initializer.arguments[0].getText(panelAst);
  if (ts.isVariableDeclaration(node) && node.name.getText(panelAst) === 'save') actions.save = node.initializer.getText(panelAst);
  ts.forEachChild(node, findActions);
}
findActions(panelAst);
function panelActions() {
  const loadResponse = deferred(), saveResponse = deferred(), state = { collection: null, loading: false, error: null, message: null, selected: null };
  let refreshes = 0;
  const bindings = {
    ownerId: 7, identity: { current: 7 }, requestId: { current: 0 }, activeRequest: { current: null }, savingLock: { current: false }, selected: [1, 2],
    shopApi: { getMyCollection: () => loadResponse.promise, updateFeaturedCards: () => saveResponse.promise },
    t: key => key, getApiErrorMessage: error => error.message,
    setCollection: value => { state.collection = typeof value === 'function' ? value(state.collection) : value; },
    setSelected: value => { state.selected = value; }, setLoading: value => { state.loading = value; }, setError: value => { state.error = value; },
    setLoadFailed: () => {}, setSaving: () => {}, setMessage: value => { state.message = value; }, setEditing: () => {}, onSaved: async () => { refreshes++; }
  };
  const compile = source => {
    const output = ts.transpileModule('const action = ' + source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    return new Function(...Object.keys(bindings), output + ';return action;')(...Object.values(bindings));
  };
  return { bindings, loadResponse, saveResponse, state, refreshes: () => refreshes, load: compile(actions.load), save: compile(actions.save) };
}

test('collection hydration from a former account cannot replace the new owner gallery', async () => {
  const fixture = panelActions(), result = fixture.load();
  fixture.bindings.identity.current = 8;
  fixture.loadResponse.resolve({ total_cards: 1, featured_cards: [animated], cards: [animated] });
  await result;
  assert.equal(fixture.state.collection, null);
  assert.equal(fixture.state.selected, null);
});

test('a featured update acknowledged for a former account cannot change state or refresh the new profile', async () => {
  const fixture = panelActions(), result = fixture.save();
  fixture.bindings.identity.current = 8;
  fixture.saveResponse.resolve({ total_cards: 1, featured_cards: [animated] });
  await result;
  assert.equal(fixture.state.message, null);
  assert.equal(fixture.state.selected, null);
  assert.equal(fixture.refreshes(), 0);
});

test('failed featured updates retain the current selection for a manual retry', async () => {
  const fixture = panelActions(), result = fixture.save();
  fixture.saveResponse.reject(new Error('Connection interrupted'));
  await result;
  assert.equal(fixture.state.error, 'Connection interrupted');
  assert.equal(fixture.state.selected, null, 'the failed request must not replace the existing selection');
  assert.equal(fixture.bindings.savingLock.current, false);
});
