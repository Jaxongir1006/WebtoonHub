import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { deferred, loadModuleWithMocks } from './helpers.mjs';

test('a daily claim acknowledged across midnight refreshes the new day while retaining its balance', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-03T18:59:59Z') });
  const claim = deferred(); const balances = []; let statusRequests = 0;
  const module = await loadModuleWithMocks('src/context/DailyBonusContext.tsx', {
    '../api/rewards': { rewardsApi: {
      claimDailyCheckin: () => claim.promise,
      getDailyStatus: async () => { statusRequests++; return { data: { claimed_today: false, reward_amount: 10 } }; }
    } },
    './AuthContext': { useAuth: () => ({ user: { id: 7 }, isAuthenticated: true, updateCoinsLocally: amount => balances.push(amount), openAuthModal: () => {} }) },
    './LanguageContext': { useLanguage: () => ({ t: key => key }) },
    '../api/client': { getApiErrorMessage: (error, fallback) => error.message || fallback }
  });
  let bonus;
  function Capture() { bonus = module.useDailyBonus(); return null; }
  renderToString(React.createElement(module.DailyBonusProvider, null, React.createElement(Capture)));
  const result = bonus.claimBonus();
  t.mock.timers.tick(2000);
  claim.resolve({ data: { reward_amount: 10, total_lightning_coins: 110, claimed_at: '2026-10-03T23:59:59+05:00' } });
  assert.equal((await result).success, true);
  assert.deepEqual(balances, [110]);
  assert.equal(statusRequests, 1, 'the previous day receipt must not mark the fresh day already claimed');
});
