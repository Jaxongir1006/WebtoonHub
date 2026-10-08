import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { deferred } from './helpers.mjs';

const path = new URL('../src/pages/WebtoonDetailPage.tsx', import.meta.url);
const source = await readFile(path, 'utf8');
const ast = ts.createSourceFile(path.pathname, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let hydration;
let acknowledge;
function scan(node) {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useEffect') {
    const callback = node.arguments[0];
    if (callback?.getText(ast).includes('libraryApi.getLibrary()') && callback.getText(ast).includes('progressApi.list()')) hydration = callback.getText(ast);
  }
  if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'onStatusChange' && node.initializer && ts.isJsxExpression(node.initializer)) acknowledge = node.initializer.expression?.getText(ast);
  ts.forEachChild(node, scan);
}
scan(ast);
assert.ok(hydration && acknowledge, 'the real detail hydration and bookmark acknowledgement callbacks must be found');

function callbacks() {
  const library = deferred(); const progress = deferred();
  const states = { bookmark: undefined };
  const bookmarkVersion = { current: 0 };
  const bindings = {
    libraryApi: { getLibrary: () => library.promise },
    progressApi: { list: () => progress.promise },
    bookmarkVersion, setBookmarkStatus: value => { states.bookmark = value; },
    setPersonalError: () => {}, setSavedPosition: () => {},
    webtoon: { id: 4 }, user: { id: 7 }, isAuthenticated: true,
    checkingAccount: false, readPosition: () => undefined
  };
  // Run the original closures with explicit state/API seams. A browser renderer
  // is unnecessary for this deferred-response ordering regression.
  const compile = expression => new Function(...Object.keys(bindings), `return (${expression});`)(...Object.values(bindings));
  return { ...bindings, library, progress, states, hydrate: compile(hydration), acknowledge: compile(acknowledge) };
}

test('delayed personal hydration cannot overwrite an acknowledged bookmark change or removal', async () => {
  for (const status of ['reading', null]) {
    const fixture = callbacks();
    fixture.hydrate();
    fixture.acknowledge(status);
    fixture.library.resolve([{ webtoon: { id: 4 }, reading_status: 'plan_to_read' }]);
    fixture.progress.resolve([]);
    await Promise.allSettled([fixture.library.promise, fixture.progress.promise]);
    await Promise.resolve();
    assert.equal(fixture.states.bookmark, status, 'acknowledged mutation must win over the older GET');
  }

  const fixture = callbacks();
  fixture.hydrate();
  fixture.library.resolve([{ webtoon: { id: 4 }, reading_status: 'completed' }]);
  fixture.progress.resolve([]);
  await Promise.allSettled([fixture.library.promise, fixture.progress.promise]);
  await Promise.resolve();
  assert.equal(fixture.states.bookmark, 'completed', 'initial hydration still applies when there is no later mutation');
});
