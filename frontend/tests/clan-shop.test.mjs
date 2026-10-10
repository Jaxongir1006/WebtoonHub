import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { deferred } from './helpers.mjs';

const source = await readFile(new URL('../src/components/clans/ClanShopPanel.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ClanShopPanel.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = {};
function find(node) {
  if (ts.isVariableDeclaration(node) && ['handleMutation', 'loadCatalog', 'loadInventory'].includes(node.name.getText(ast))) handlers[node.name.getText(ast)] = node.initializer.getText(ast);
  ts.forEachChild(node, find);
}
find(ast);

const decoration = { id: 7, name: 'Clan sky', item_type: 'background', price_coins: 25, asset_url: '/sky.webp', is_owned: false };
function fixture(overrides = {}) {
  const state = { balance: 100, error: null, success: null, purchase: decoration, busy: false, catalog: null, inventory: null, catalogError: null, inventoryError: null, catalogLoading: false, inventoryLoading: false, catalogReloads: 0, inventoryReloads: 0, profileRefreshes: 0, appearanceRefreshes: 0 };
  const refs = { identity: { current: '1:2:leader' }, mounted: { current: true }, actionLock: { current: false }, mutationRequest: { current: 0 }, catalogRequest: { current: 0 }, inventoryRequest: { current: 0 } };
  const bindings = {
    ...refs, clan: { id: 1 }, canManage: true, balance: 100, catalogLoading: false, catalogError: null, inventoryLoading: false, inventoryError: null,
    isCurrent: scope => refs.mounted.current && refs.identity.current === scope, t: key => key, getApiErrorMessage: error => error.message,
    setBusy: value => { state.busy = value; }, setActionError: value => { state.error = value; }, setSuccess: value => { state.success = value; },
    setPurchase: value => { state.purchase = value; }, updateCoinsLocally: value => { state.balance = value; },
    setCatalog: value => { state.catalog = value; }, setInventory: value => { state.inventory = value; },
    setCatalogError: value => { state.catalogError = value; }, setInventoryError: value => { state.inventoryError = value; },
    setCatalogLoading: value => { state.catalogLoading = value; }, setInventoryLoading: value => { state.inventoryLoading = value; },
    loadCatalog: async () => { state.catalogReloads++; }, loadInventory: async () => { state.inventoryReloads++; },
    refreshProfile: async () => { state.profileRefreshes++; }, onAppearanceChange: async () => { state.appearanceRefreshes++; },
    clansApi: { buyDecoration: async () => ({ data: { item_name: decoration.name, new_balance: 75 } }), equipDecoration: async () => {}, unequipDecoration: async () => {}, getShop: async () => ({ data: [decoration] }), getInventory: async () => ({ data: [] }) },
    ...overrides,
  };
  const compile = name => {
    const output = ts.transpileModule('const action = ' + handlers[name], { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    return new Function(...Object.keys(bindings), output + ';return action;')(...Object.values(bindings));
  };
  return { state, refs, bindings, mutate: compile('handleMutation'), loadCatalog: compile('loadCatalog'), loadInventory: compile('loadInventory') };
}

test('clan purchases send the displayed price and refresh the acting wallet and clan ownership', async () => {
  const sent = [];
  const view = fixture({ clansApi: { buyDecoration: async (...args) => { sent.push(args); return { data: { item_name: decoration.name, new_balance: 75 } }; } } });
  await view.mutate('buy', decoration);
  assert.deepEqual(sent, [[1, 7, 25]]);
  assert.equal(view.state.balance, 75); assert.equal(view.state.purchase, null);
  assert.equal(view.state.success, 'clanShop.bought');
  assert.equal(view.state.profileRefreshes, 1); assert.equal(view.state.catalogReloads, 1); assert.equal(view.state.inventoryReloads, 1); assert.equal(view.state.appearanceRefreshes, 1);
});

test('a double click sends only one clan purchase while its receipt is pending', async () => {
  const answer = deferred(); let calls = 0;
  const view = fixture({ clansApi: { buyDecoration: () => { calls++; return answer.promise; } } });
  const pending = view.mutate('buy', decoration);
  await view.mutate('buy', decoration);
  assert.equal(calls, 1);
  answer.resolve({ data: { item_name: decoration.name, new_balance: 75 } }); await pending;
  assert.equal(view.state.busy, false); assert.equal(view.refs.actionLock.current, false);
});

test('ordinary clan members and unaffordable purchases never dispatch cosmetic changes', async () => {
  let calls = 0;
  const clansApi = { buyDecoration: async () => { calls++; }, equipDecoration: async () => { calls++; }, unequipDecoration: async () => { calls++; } };
  const member = fixture({ canManage: false, clansApi });
  for (const kind of ['buy', 'equip', 'unequip']) await member.mutate(kind, decoration);
  const poor = fixture({ balance: 24, clansApi }); await poor.mutate('buy', decoration);
  assert.equal(calls, 0);
});

test('a clan purchase receipt for a former account cannot affect the next wallet or clan view', async () => {
  const answer = deferred();
  const view = fixture({ clansApi: { buyDecoration: () => answer.promise } });
  const pending = view.mutate('buy', decoration);
  view.refs.identity.current = '1:3:leader';
  answer.resolve({ data: { item_name: decoration.name, new_balance: 75 } }); await pending;
  assert.equal(view.state.balance, 100); assert.equal(view.state.success, null); assert.equal(view.state.purchase, decoration);
  assert.equal(view.state.profileRefreshes, 0); assert.equal(view.state.catalogReloads, 0); assert.equal(view.state.appearanceRefreshes, 0);
});

test('a changed clan shop price closes stale confirmation and reloads ownership while retaining the error', async () => {
  const view = fixture({ clansApi: { buyDecoration: async () => { throw new Error('Price changed; review the new offer'); } } });
  await view.mutate('buy', decoration);
  assert.equal(view.state.purchase, null, 'the old accepted price must not remain retryable');
  assert.equal(view.state.error, 'Price changed; review the new offer');
  assert.equal(view.state.balance, 100); assert.equal(view.state.success, null);
  assert.equal(view.state.catalogReloads, 1); assert.equal(view.state.inventoryReloads, 1); assert.equal(view.state.profileRefreshes, 1); assert.equal(view.state.busy, false);
  assert.equal(view.state.appearanceRefreshes, 1);
});

test('a rejected clan mutation refreshes server membership without clearing its action error', async () => {
  const view = fixture({ clansApi: { equipDecoration: async () => { throw new Error('Only clan leaders may equip decorations'); } } });
  await view.mutate('equip', decoration);
  assert.equal(view.state.error, 'Only clan leaders may equip decorations');
  assert.equal(view.state.success, null); assert.equal(view.state.appearanceRefreshes, 1);
  assert.equal(view.state.inventoryReloads, 1); assert.equal(view.state.catalogReloads, 1); assert.equal(view.state.busy, false);
});

test('a rejection recovery cannot refresh the next account clan after an actor switch', async () => {
  const recovery = deferred();
  const view = fixture({ clansApi: { equipDecoration: async () => { throw new Error('Permission changed'); } }, loadCatalog: () => recovery.promise });
  const pending = view.mutate('equip', decoration);
  await new Promise(resolve => setImmediate(resolve));
  view.refs.identity.current = '1:3:member';
  recovery.resolve(); await pending;
  assert.equal(view.state.appearanceRefreshes, 0); assert.equal(view.state.success, null);
});

test('clan shop and inventory hydration reject a previous clan or account without clearing the new loading state', async () => {
  for (const [handler, result, property] of [['loadCatalog', { data: [decoration] }, 'catalog'], ['loadInventory', { data: [decoration] }, 'inventory']]) {
    const answer = deferred();
    const view = fixture({ clansApi: { getShop: () => answer.promise, getInventory: () => answer.promise } });
    const pending = view[handler](); view.refs.identity.current = '9:4:member';
    answer.resolve(result); await pending;
    assert.equal(view.state[property], null);
    assert.equal(view.state[`${property}Loading`], true);
  }
});

test('a newer catalog retry wins and an inventory error remains independent from the catalog', async () => {
  const first = deferred(); let calls = 0;
  const view = fixture({ clansApi: { getShop: () => ++calls === 1 ? first.promise : Promise.resolve({ data: [decoration] }), getInventory: async () => { throw new Error('Inventory unavailable'); } } });
  const previous = view.loadCatalog(); await view.loadCatalog();
  first.resolve({ data: [{ ...decoration, price_coins: 1 }] }); await previous;
  await view.loadInventory();
  assert.equal(view.state.catalog[0].price_coins, 25); assert.equal(view.state.catalogError, null);
  assert.equal(view.state.inventoryError, 'Inventory unavailable'); assert.equal(view.state.inventoryLoading, false);
});

test('changing clan or account releases old settings locks and an old logo receipt cannot block the new editor', async () => {
  const pageSource = await readFile(new URL('../src/pages/ClanDetailPage.tsx', import.meta.url), 'utf8');
  const pageAst = ts.createSourceFile('ClanDetailPage.tsx', pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let scopeEffect, uploadHandler;
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(pageAst) === 'useEffect' && node.arguments[1]?.getText(pageAst).includes('authLoading')) scopeEffect = node.arguments[0].getText(pageAst);
    if (ts.isVariableDeclaration(node) && node.name.getText(pageAst) === 'handleUploadClanAvatar') uploadHandler = node.initializer.getText(pageAst);
    ts.forEachChild(node, visit);
  };
  visit(pageAst);
  const pendingReceipt = deferred();
  const state = { uploading: false, saving: true, error: 'Previous editor error', success: 'Previous editor success', avatar: null, refreshes: 0 };
  const identity = { current: '1:2' };
  const bindings = {
    entityIdentity: identity, clan: { id: 1 }, clanId: 1, uploadingFile: false, savingSettings: false, authLoading: false, loadRequest: { current: 0 },
    clansApi: { uploadClanAvatar: () => pendingReceipt.promise },
    setUploadingFile: value => { state.uploading = value; }, setSavingSettings: value => { state.saving = value; },
    setSettingsError: value => { state.error = value; }, setSettingsSuccess: value => { state.success = value; },
    setEditAvatar: value => { state.avatar = value; }, loadClanData: async () => { state.refreshes++; },
    setClan: () => {}, setMembers: () => {}, setActionSuccess: () => {}, setIsSettingsModalOpen: () => {}, setIsLoading: () => {}, setActiveTab: () => {},
    t: key => key, getApiErrorMessage: error => error.message,
  };
  const compile = handler => {
    const output = ts.transpileModule('const action = ' + handler, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    return new Function(...Object.keys(bindings), output + ';return action;')(...Object.values(bindings));
  };
  const pending = compile(uploadHandler)({ target: { files: [{ name: 'logo.png' }], value: 'logo.png' } });
  assert.equal(state.uploading, true);
  identity.current = '9:3';
  compile(scopeEffect)();
  assert.equal(state.uploading, false); assert.equal(state.saving, false);
  assert.equal(state.error, null); assert.equal(state.success, null);
  state.uploading = true; // The new editor can begin its own upload now.
  pendingReceipt.resolve({ data: { avatar_url: '/old-clan-logo.webp' } }); await pending;
  assert.equal(state.avatar, null); assert.equal(state.success, null);
  assert.equal(state.uploading, true, 'the previous request cannot release the new editor upload lock');
  assert.equal(state.refreshes, 1, 'only the new scope effect may refresh clan data');
});
