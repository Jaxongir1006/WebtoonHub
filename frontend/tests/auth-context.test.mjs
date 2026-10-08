import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { axios, deferred, installBrowserGlobals, loadModuleWithMocks } from './helpers.mjs';

const accessKey = 'webtoonhub_access_token';
const refreshKey = 'webtoonhub_refresh_token';
const tokens = owner => ({ data: { access_token: owner + '-access', refresh_token: owner + '-refresh' } });

async function actions(t, authApi) {
  const browser = installBrowserGlobals(t);
  let cleared = 0;
  const module = await loadModuleWithMocks('src/context/AuthContext.tsx', {
    '../api/auth': { authApi: { logout: async () => {}, ...authApi } },
    '../api/client': {
      ACCESS_TOKEN_KEY: accessKey, REFRESH_TOKEN_KEY: refreshKey,
      clearReaderSession: () => { cleared++; browser.storage.clear(); },
      getApiErrorMessage: (error, fallback) => error.message || fallback
    },
    './LanguageContext': { useLanguage: () => ({ t: key => key }) }
  });
  let value;
  function Capture() { value = module.useAuth(); return null; }
  renderToString(React.createElement(module.AuthProvider, null, React.createElement(Capture)));
  return { value, ...browser, cleared: () => cleared };
}

test('a slower older login cannot replace tokens from the newest login', async t => {
  const oldLogin = deferred(); const newLogin = deferred();
  let profiles = 0;
  const { value, storage } = await actions(t, {
    login: ({ email }) => email === 'old@example.com' ? oldLogin.promise : newLogin.promise,
    getProfile: async () => { profiles++; return { id: 2, username: 'new' }; }
  });
  const first = value.login('old@example.com', 'password');
  const second = value.login('new@example.com', 'password');
  newLogin.resolve(tokens('new'));
  assert.equal((await second).success, true);
  oldLogin.resolve(tokens('old'));
  assert.equal((await first).success, false);
  assert.equal(profiles, 1, 'superseded credentials must not begin hydration');
  assert.equal(storage.getItem(accessKey), 'new-access');
  assert.equal(storage.getItem(refreshKey), 'new-refresh');
});

test('a stale profile failure cannot end a newer successful login', async t => {
  const oldProfile = deferred(); const profileStarted = deferred();
  let profileCalls = 0;
  const { value, storage, cleared } = await actions(t, {
    login: async ({ email }) => tokens(email.startsWith('old') ? 'old' : 'new'),
    getProfile: () => {
      profileCalls++;
      if (profileCalls === 1) { profileStarted.resolve(); return oldProfile.promise; }
      return Promise.resolve({ id: 2, username: 'new' });
    }
  });
  const first = value.login('old@example.com', 'password');
  await profileStarted.promise;
  assert.equal((await value.login('new@example.com', 'password')).success, true);
  oldProfile.reject(new axios.AxiosError('Old session rejected', 'ERR_BAD_REQUEST', {}, undefined, { status: 401 }));
  assert.equal((await first).success, false);
  assert.equal(cleared(), 0);
  assert.equal(storage.getItem(accessKey), 'new-access');
  assert.equal(storage.getItem(refreshKey), 'new-refresh');
});

test('late registration completion cannot automatically sign over a newer login', async t => {
  const registered = deferred(); const logins = [];
  const { value, storage } = await actions(t, {
    register: () => registered.promise,
    login: async ({ email }) => { logins.push(email); return tokens('new'); },
    getProfile: async () => ({ id: 2, username: 'new' })
  });
  const registration = value.register('register@example.com', 'reader', 'password');
  assert.equal((await value.login('new@example.com', 'password')).success, true);
  registered.resolve({ success: true });
  assert.equal((await registration).success, false);
  assert.deepEqual(logins, ['new@example.com']);
  assert.equal(storage.getItem(accessKey), 'new-access');
});
