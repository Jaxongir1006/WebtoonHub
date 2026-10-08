import test from 'node:test';
import assert from 'node:assert/strict';
import { axios, deferred, installBrowserGlobals, loadClient, response, unauthorized } from './helpers.mjs';

async function fixture(t, adapter) {
  const browser = installBrowserGlobals(t);
  const previousAdapter = axios.defaults.adapter;
  axios.defaults.adapter = adapter;
  t.after(() => { axios.defaults.adapter = previousAdapter; });
  const client = await loadClient();
  return { ...browser, ...client };
}

test('guest requests remove stale default Authorization and send locale/device headers', async t => {
  let sent;
  const client = await fixture(t, async config => { sent = config; return response(config, { ok: true }); });
  client.apiClient.defaults.headers.common.Authorization = 'Bearer stale-token';
  client.storage.setItem('webtoonhub_lang', 'ru');
  await client.apiClient.get('/public');
  assert.equal(sent.headers.get('Authorization'), undefined);
  assert.equal(sent.headers.get('Accept-Language'), 'ru');
  assert.equal(sent.headers.get('X-Device-Type'), 'Mobile');
  assert.equal(sent.timeout, 15000);
});

test('concurrent401 requests share one refresh, rotate tokens and replay with the new token', async t => {
  const refreshStarted = deferred(), refreshAnswer = deferred();
  let refreshCount = 0, oldRequests = 0, replays = 0;
  const client = await fixture(t, async config => {
    if (config.url === '/auth/refresh') {
      refreshCount++;
      assert.equal(JSON.parse(config.data).refresh_token, 'old-refresh');
      refreshStarted.resolve();
      await refreshAnswer.promise;
      return response(config, { data: { access_token: 'new-access', refresh_token: 'new-refresh' } });
    }
    if (config.headers.get('Authorization') === 'Bearer old-access') { oldRequests++; throw unauthorized(config); }
    assert.equal(config.headers.get('Authorization'), 'Bearer new-access');
    replays++;
    return response(config, { ok: true });
  });
  client.storage.setItem(client.ACCESS_TOKEN_KEY, 'old-access');
  client.storage.setItem(client.REFRESH_TOKEN_KEY, 'old-refresh');
  const requests = Promise.all([1, 2, 3].map(id => client.apiClient.get('/protected/' + id)));
  await refreshStarted.promise;
  refreshAnswer.resolve();
  const results = await requests;
  assert.equal(results.length, 3);
  assert.equal(oldRequests, 3);
  assert.equal(replays, 3);
  assert.equal(refreshCount, 1);
  assert.equal(client.storage.getItem(client.ACCESS_TOKEN_KEY), 'new-access');
  assert.equal(client.storage.getItem(client.REFRESH_TOKEN_KEY), 'new-refresh');
});

test('a refresh transport timeout clears expired credentials and signals session end', async t => {
  let refreshConfig, protectedCalls = 0;
  const client = await fixture(t, async config => {
    if (config.url === '/auth/refresh') {
      refreshConfig = config;
      throw new axios.AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED', config);
    }
    protectedCalls++;
    throw unauthorized(config);
  });
  client.storage.setItem(client.ACCESS_TOKEN_KEY, 'expired-access');
  client.storage.setItem(client.REFRESH_TOKEN_KEY, 'expired-refresh');
  client.apiClient.defaults.headers.common.Authorization = 'Bearer expired-access';
  let ended = 0;
  client.window.addEventListener('webtoonhub:auth-ended', () => ended++);
  await assert.rejects(client.apiClient.get('/protected'), error => error.code === 'ECONNABORTED');
  assert.equal(refreshConfig.timeout, 15000, 'the private refresh client must also have a bounded timeout');
  assert.equal(protectedCalls, 1);
  assert.equal(client.storage.getItem(client.ACCESS_TOKEN_KEY), null);
  assert.equal(client.storage.getItem(client.REFRESH_TOKEN_KEY), null);
  assert.equal(client.apiClient.defaults.headers.common.Authorization, undefined);
  assert.equal(ended, 1);
});

test('logout while refresh is pending cannot resurrect the old session', async t => {
  const started = deferred(), answer = deferred(), cleanupStarted = deferred(), cleanupAnswer = deferred();
  let protectedCalls = 0, cleanupConfig;
  const client = await fixture(t, async config => {
    if (config.url === '/auth/refresh') {
      started.resolve(); await answer.promise;
      return response(config, { data: { access_token: 'late-access', refresh_token: 'late-refresh' } });
    }
    if (config.url === '/auth/logout') {
      cleanupConfig = config; cleanupStarted.resolve();
      await cleanupAnswer.promise;
      return response(config, { data: null });
    }
    protectedCalls++; throw unauthorized(config);
  });
  client.storage.setItem(client.ACCESS_TOKEN_KEY, 'old-access');
  client.storage.setItem(client.REFRESH_TOKEN_KEY, 'old-refresh');
  let ended = 0;
  client.window.addEventListener('webtoonhub:auth-ended', () => ended++);
  const rejected = assert.rejects(client.apiClient.get('/protected'), error => axios.isCancel(error));
  await started.promise;
  client.clearReaderSession();
  answer.resolve();
  // The canceled request settles while revocation is still pending.
  await rejected;
  await cleanupStarted.promise;
  assert.equal(protectedCalls, 1);
  assert.equal(client.storage.getItem(client.ACCESS_TOKEN_KEY), null);
  assert.equal(client.storage.getItem(client.REFRESH_TOKEN_KEY), null);
  assert.equal(cleanupConfig.headers.get('Authorization'), 'Bearer late-access');
  assert.equal(JSON.parse(cleanupConfig.data).refresh_token, 'late-refresh');
  assert.equal(cleanupConfig.timeout, 15000, 'abandoned-session revocation must be bounded');
  assert.equal(ended, 1, 'revocation must not trigger another local session change');
  cleanupAnswer.resolve();
});

test('a late refresh response cannot overwrite or clear a newly signed-in account', async t => {
  const started = deferred(), answer = deferred();
  let cleanupConfig, protectedCalls = 0;
  const client = await fixture(t, async config => {
    if (config.url === '/auth/refresh') {
      started.resolve(); await answer.promise;
      return response(config, { data: { access_token: 'old-owner-access', refresh_token: 'old-owner-refresh' } });
    }
    if (config.url === '/auth/logout') {
      cleanupConfig = config;
      throw new axios.AxiosError('Revocation timed out', 'ECONNABORTED', config);
    }
    protectedCalls++;
    throw unauthorized(config);
  });
  client.storage.setItem(client.ACCESS_TOKEN_KEY, 'old-access');
  client.storage.setItem(client.REFRESH_TOKEN_KEY, 'old-refresh');
  const rejected = assert.rejects(client.apiClient.get('/protected'), error => axios.isCancel(error));
  await started.promise;
  client.storage.setItem(client.ACCESS_TOKEN_KEY, 'other-owner-access');
  client.storage.setItem(client.REFRESH_TOKEN_KEY, 'other-owner-refresh');
  client.apiClient.defaults.headers.common.Authorization = 'Bearer other-owner-access';
  let ended = 0;
  client.window.addEventListener('webtoonhub:auth-ended', () => ended++);
  answer.resolve();
  await rejected;
  await Promise.resolve();
  assert.equal(protectedCalls, 1);
  assert.equal(cleanupConfig.headers.get('Authorization'), 'Bearer old-owner-access');
  assert.equal(JSON.parse(cleanupConfig.data).refresh_token, 'old-owner-refresh');
  assert.equal(cleanupConfig.timeout, 15000);
  assert.equal(client.storage.getItem(client.ACCESS_TOKEN_KEY), 'other-owner-access');
  assert.equal(client.storage.getItem(client.REFRESH_TOKEN_KEY), 'other-owner-refresh');
  assert.equal(client.apiClient.defaults.headers.common.Authorization, 'Bearer other-owner-access');
  assert.equal(ended, 0, 'failed old-session cleanup must not end the newer account');
});

test('an aborted request is not replayed after successful shared refresh', async t => {
  const started = deferred(), answer = deferred();
  let protectedCalls = 0;
  const client = await fixture(t, async config => {
    if (config.url === '/auth/refresh') {
      started.resolve(); await answer.promise;
      return response(config, { data: { access_token: 'new-access', refresh_token: 'new-refresh' } });
    }
    protectedCalls++; throw unauthorized(config);
  });
  client.storage.setItem(client.ACCESS_TOKEN_KEY, 'old-access');
  client.storage.setItem(client.REFRESH_TOKEN_KEY, 'old-refresh');
  const controller = new AbortController();
  const rejected = assert.rejects(client.apiClient.get('/protected', { signal: controller.signal }), error => axios.isCancel(error));
  await started.promise;
  controller.abort(); answer.resolve();
  await rejected;
  assert.equal(protectedCalls, 1);
  assert.equal(client.storage.getItem(client.ACCESS_TOKEN_KEY), 'new-access');
});

test('a late old-account mutation401 never refreshes or replays under a new account', async t => {
  const mutationStarted = deferred(), oldResponse = deferred();
  let mutations = 0, refreshes = 0, logouts = 0;
  const client = await fixture(t, async config => {
    if (config.url === '/auth/refresh') { refreshes++; return response(config, { data: { access_token: 'unexpected-access', refresh_token: 'unexpected-refresh' } }); }
    if (config.url === '/auth/logout') { logouts++; return response(config, { data: null }); }
    mutations++;
    assert.equal(config.headers.get('Authorization'), 'Bearer old-access');
    assert.deepEqual(JSON.parse(config.data), { item_id: 9 });
    mutationStarted.resolve();
    await oldResponse.promise;
    throw unauthorized(config);
  });
  client.storage.setItem(client.ACCESS_TOKEN_KEY, 'old-access');
  client.storage.setItem(client.REFRESH_TOKEN_KEY, 'old-refresh');
  const rejected = assert.rejects(client.apiClient.post('/shop/purchase', { item_id: 9 }), error => axios.isCancel(error));
  await mutationStarted.promise;
  client.storage.setItem(client.ACCESS_TOKEN_KEY, 'new-owner-access');
  client.storage.setItem(client.REFRESH_TOKEN_KEY, 'new-owner-refresh');
  client.apiClient.defaults.headers.common.Authorization = 'Bearer new-owner-access';
  let ended = 0;
  client.window.addEventListener('webtoonhub:auth-ended', () => ended++);
  oldResponse.resolve();
  await rejected;
  assert.equal(mutations, 1);
  assert.equal(refreshes, 0);
  assert.equal(logouts, 0);
  assert.equal(ended, 0);
  assert.equal(client.storage.getItem(client.ACCESS_TOKEN_KEY), 'new-owner-access');
  assert.equal(client.storage.getItem(client.REFRESH_TOKEN_KEY), 'new-owner-refresh');
  assert.equal(client.apiClient.defaults.headers.common.Authorization, 'Bearer new-owner-access');
});

test('an account change between refresh completion and queued retry dispatch cancels the old mutation', async t => {
  let mutations = 0, refreshes = 0, logouts = 0;
  const client = await fixture(t, async config => {
    if (config.url === '/auth/refresh') {
      refreshes++;
      return response(config, { data: { access_token: 'rotated-access', refresh_token: 'rotated-refresh' } });
    }
    if (config.url === '/auth/logout') { logouts++; return response(config, { data: null }); }
    mutations++;
    assert.equal(config.headers.get('Authorization'), 'Bearer old-access');
    throw unauthorized(config);
  });
  client.storage.setItem(client.ACCESS_TOKEN_KEY, 'old-access');
  client.storage.setItem(client.REFRESH_TOKEN_KEY, 'old-refresh');
  const getItem = client.storage.getItem;
  let switchQueued = false;
  client.storage.getItem = key => {
    const value = getItem(key);
    if (key === client.ACCESS_TOKEN_KEY && value === 'rotated-access' && !switchQueued) {
      switchQueued = true;
      queueMicrotask(() => {
        client.storage.setItem(client.ACCESS_TOKEN_KEY, 'new-owner-access');
        client.storage.setItem(client.REFRESH_TOKEN_KEY, 'new-owner-refresh');
      });
    }
    return value;
  };
  await assert.rejects(client.apiClient.post('/shop/purchase', { item_id: 9 }), error => axios.isCancel(error));
  assert.equal(mutations, 1, 'the queued retry must check its owner again at dispatch');
  assert.equal(refreshes, 1);
  assert.equal(logouts, 0);
  assert.equal(client.storage.getItem(client.ACCESS_TOKEN_KEY), 'new-owner-access');
  assert.equal(client.storage.getItem(client.REFRESH_TOKEN_KEY), 'new-owner-refresh');
});
