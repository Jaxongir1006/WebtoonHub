"""Character draws exercise real HTTP contracts and durable economy invariants."""
import asyncio
import unittest
from unittest.mock import patch
from sqlalchemy import func, select
import test_audit_regressions as audit
import test_character_cards as cards
from app.core.idempotency import OperationReceipt
from app.modules.gacha.models import GachaPool, GachaRoll
from app.modules.gacha.service import weighted_pick
import app.modules.gacha.service as gacha_service
from app.modules.rewards.models import CoinTransaction
from app.modules.rewards.service import RewardService
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.wheel.models import Wheel, WheelItem


class GachaTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = audit.AuditRegressionTests.asyncSetUp
    asyncTearDown = audit.AuditRegressionTests.asyncTearDown
    auth = audit.AuditRegressionTests.auth
    staff_auth = audit.AuditRegressionTests.staff_auth
    upload = cards.CharacterCardTests.upload
    create_card = cards.CharacterCardTests.create_card
    create_pool = cards.CharacterCardTests.create_pool
    draw = cards.CharacterCardTests.draw

    async def test_actual_tier_and_card_odds_and_zero_weight_tiers(self):
        cards = [await self.create_card(rarity, name=name) for rarity, name in [('common', 'C'), ('rare', 'R1'), ('rare', 'R2'), ('epic', 'E')]]
        response = await self.client.post('/api/v1/staff/gacha/pools', json={
            'title': 'Weighted draws', 'cost_coins': 100, 'is_active': True,
            'rarity_weights': {'common': 1, 'rare': 1, 'epic': 0, 'legendary': 99},
            'cards': [{'item_id': card['id'], 'weight': weight} for card, weight in zip(cards, [1, 1, 3, 1])]}, headers=self.staff_auth())
        self.assertEqual(response.status_code, 201, response.text)
        pool = response.json()['data']
        detail = (await self.client.get('/api/v1/gacha/pools/' + str(pool['id']))).json()['data']
        self.assertEqual({card['name']: card['probability_percent'] for card in detail['cards']}, {'C': 50, 'R1': 12.5, 'R2': 37.5})
        self.assertEqual({rate['rarity']: rate['probability_percent'] for rate in detail['rarity_rates']}, {'common': 50, 'rare': 50, 'epic': 0, 'legendary': 0})
        # First choice reaches rare, second reaches its weight-three card.
        with patch('app.modules.gacha.service.secrets.randbelow', side_effect=[1, 1]):
            rolled = await self.draw(pool)
        self.assertEqual(rolled.status_code, 200, rolled.text)
        won = rolled.json()['data']
        self.assertEqual(won['winning_card']['name'], 'R2')
        self.assertEqual(len(won['animation_cards']), 40)
        self.assertEqual(won['animation_cards'][won['winning_index']], won['winning_card'])

    async def test_rng_integer_weight_boundaries(self):
        for ticket, expected in [(0, 'a'), (1, 'b'), (3, 'b'), (4, 'c')]:
            with patch('app.modules.gacha.service.secrets.randbelow', return_value=ticket):
                self.assertEqual(weighted_pick(['a', 'b', 'c'], [1, 3, 1]), expected)

    async def test_tiny_positive_card_odds_are_never_reported_as_zero(self):
        common = await self.create_card('common', 'Common')
        rare = await self.create_card('rare', 'Rare')
        tiny = await self.create_card('rare', 'Tiny')
        response = await self.client.post('/api/v1/staff/gacha/pools', json={
            'title': 'Tiny chance', 'is_active': True, 'cost_coins': 100,
            'rarity_weights': {'common': 1000000, 'rare': 1, 'epic': 0, 'legendary': 0},
            'cards': [{'item_id': common['id'], 'weight': 1}, {'item_id': rare['id'], 'weight': 1000000},
                {'item_id': tiny['id'], 'weight': 1}]}, headers=self.staff_auth())
        self.assertEqual(response.status_code, 201, response.text)
        probability = next(card['probability_percent'] for card in response.json()['data']['cards'] if card['id'] == tiny['id'])
        self.assertGreater(probability, 0)
        self.assertLess(probability, 0.000001)

    async def test_new_membership_and_card_availability_edit_invalidate_pool_version(self):
        card = await self.create_card()
        original = gacha_service.pool_response
        configured = asyncio.Event(); release = asyncio.Event()
        async def before_commit(*args, **kwargs):
            response = await original(*args, **kwargs)
            configured.set()
            await asyncio.wait_for(release.wait(), 5)
            return response
        with patch.object(gacha_service, 'pool_response', side_effect=before_commit):
            configuring = asyncio.create_task(self.create_pool(card))
            await asyncio.wait_for(configured.wait(), 5)
            editing = asyncio.create_task(self.client.patch('/api/v1/staff/shop/items/' + str(card['id']),
                json={'is_available': False}, headers=self.staff_auth()))
            await asyncio.sleep(.05)
            self.assertFalse(editing.done(), 'Card edit must wait for uncommitted pool membership')
            release.set()
            pool, edited = await asyncio.gather(configuring, editing)
        self.assertEqual(edited.status_code, 200, edited.text)
        async with self.sessions() as db:
            updated = await db.get(GachaPool, pool['id'])
            self.assertEqual(updated.version, pool['version'] + 1)
        self.assertEqual((await self.draw(pool)).status_code, 409)

    async def test_same_operation_key_concurrent_replay_survives_pool_archive(self):
        card = await self.create_card()
        pool = await self.create_pool(card, cost=100)
        key = str(audit.uuid.uuid4())
        responses = await asyncio.gather(self.draw(pool, key), self.draw(pool, key))
        self.assertEqual([response.status_code for response in responses], [200, 200])
        self.assertEqual(responses[0].json(), responses[1].json())
        async with self.sessions() as db:
            self.assertEqual((await db.get(audit.User, self.reader.id)).lightning_coins, 900)
            for model in [GachaRoll, UserInventory, CoinTransaction, OperationReceipt]:
                self.assertEqual(await db.scalar(select(func.count()).select_from(model)), 1)
        archived = await self.client.delete('/api/v1/staff/gacha/pools/' + str(pool['id']), headers=self.staff_auth())
        self.assertEqual(archived.status_code, 200)
        with patch('app.modules.gacha.service.weighted_pick', side_effect=AssertionError('Replay must not redraw')):
            replay = await self.draw(pool, key)
        self.assertEqual(replay.json(), responses[0].json())
        changed = await self.client.post('/api/v1/gacha/pools/' + str(pool['id']) + '/roll', json={
            'expected_cost': 101, 'expected_version': pool['version'], 'operation_key': key}, headers=self.auth())
        self.assertEqual(changed.status_code, 409)

    async def test_duplicate_refunds_full_cost_and_records_both_ledger_entries(self):
        pool = await self.create_pool(await self.create_card(), cost=100)
        first, duplicate = await self.draw(pool), await self.draw(pool)
        self.assertFalse(first.json()['data']['is_duplicate'])
        result = duplicate.json()['data']
        self.assertTrue(result['is_duplicate']); self.assertEqual(result['refund_coins'], 100)
        self.assertEqual(result['new_balance'], 900)
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(UserInventory)), 1)
            self.assertEqual(await db.scalar(select(func.count()).select_from(GachaRoll)), 2)
            transactions = (await db.scalars(select(CoinTransaction).order_by(CoinTransaction.id))).all()
            self.assertEqual([row.amount for row in transactions], [-100, -100, 100])
        history = (await self.client.get('/api/v1/gacha/history', headers=self.auth())).json()['data']
        self.assertEqual(len(history), 2)
        self.assertTrue(history[0]['is_duplicate'])
        self.assertNotIn('user_id', history[0])
        self.assertEqual((await self.client.get('/api/v1/gacha/history')).status_code, 401)

    async def test_last_balance_distinct_draws_never_overdraw(self):
        pool = await self.create_pool(await self.create_card(), cost=100)
        async with self.sessions() as db:
            user = await db.get(audit.User, self.reader.id); user.lightning_coins = 100
            await db.commit()
        responses = await asyncio.gather(self.draw(pool), self.draw(pool))
        self.assertEqual(sorted(response.status_code for response in responses), [200, 400])
        async with self.sessions() as db:
            self.assertEqual((await db.get(audit.User, self.reader.id)).lightning_coins, 0)
            self.assertEqual(await db.scalar(select(func.count()).select_from(GachaRoll)), 1)
            self.assertEqual(await db.scalar(select(func.count()).select_from(OperationReceipt)), 1)

    async def test_gacha_wheel_and_shop_share_wallet_lock(self):
        pool = await self.create_pool(await self.create_card(), cost=100)
        async with self.sessions() as db:
            user = await db.get(audit.User, self.reader.id); user.lightning_coins = 100
            frame = ShopItem(name='Only sold', item_type='frame', price_coins=100, asset_url='/content/frame.webp')
            wheel = Wheel(title='Lightning only', slug='lightning-only', cost_coins=100, has_daily_free_spin=False, is_active=True)
            db.add_all([frame, wheel]); await db.flush()
            db.add_all([WheelItem(wheel_id=wheel.id, reward_type='coins', reward_coins=0, label='Zero', weight=1),
                WheelItem(wheel_id=wheel.id, reward_type='coins', reward_coins=0, label='Zero again', weight=1)])
            await db.commit()
        responses = await asyncio.gather(self.draw(pool),
            self.client.post('/api/v1/shop/buy/' + str(frame.id), json={'expected_price': 100}, headers=self.auth()),
            self.client.post('/api/v1/wheels/' + str(wheel.id) + '/spin', json={'expected_mode': 'paid', 'expected_cost': 100,
                'operation_key': str(audit.uuid.uuid4())}, headers=self.auth()))
        self.assertEqual(sorted(response.status_code for response in responses), [200, 400, 400])
        async with self.sessions() as db:
            self.assertEqual((await db.get(audit.User, self.reader.id)).lightning_coins, 0)
            self.assertEqual(await db.scalar(select(func.count()).select_from(CoinTransaction)), 1)

    async def test_failed_grant_rolls_back_wallet_receipt_and_history(self):
        pool = await self.create_pool(await self.create_card(), cost=100)
        key = str(audit.uuid.uuid4())
        with patch.object(RewardService, 'record_transaction', side_effect=RuntimeError('Injected ledger failure')):
            with self.assertRaises(RuntimeError):
                await self.draw(pool, key)
        async with self.sessions() as db:
            self.assertEqual((await db.get(audit.User, self.reader.id)).lightning_coins, 1000)
            for model in [GachaRoll, UserInventory, CoinTransaction, OperationReceipt]:
                self.assertEqual(await db.scalar(select(func.count()).select_from(model)), 0)
        self.assertEqual((await self.draw(pool, key)).status_code, 200)

    async def test_configuration_and_linked_card_changes_invalidate_confirmed_odds(self):
        card = await self.create_card()
        pool = await self.create_pool(card, cost=100)
        changed = await self.client.patch('/api/v1/staff/gacha/pools/' + str(pool['id']),
            json={'expected_version': pool['version'], 'cost_coins': 101}, headers=self.staff_auth())
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertEqual((await self.draw(pool)).status_code, 409)
        stale_edit = await self.client.patch('/api/v1/staff/gacha/pools/' + str(pool['id']),
            json={'expected_version': pool['version'], 'title': 'Stale edit'}, headers=self.staff_auth())
        self.assertEqual(stale_edit.status_code, 409)
        current = changed.json()['data']
        changed_card = await self.client.patch('/api/v1/staff/shop/items/' + str(card['id']), json={'rarity': 'rare'}, headers=self.staff_auth())
        self.assertEqual(changed_card.status_code, 200, changed_card.text)
        self.assertEqual((await self.draw(current)).status_code, 409)
        details = (await self.client.get('/api/v1/gacha/pools/' + str(pool['id']))).json()['data']
        self.assertGreater(details['version'], current['version'])
        hidden = await self.client.patch('/api/v1/staff/shop/items/' + str(card['id']), json={'is_available': False}, headers=self.staff_auth())
        self.assertEqual(hidden.status_code, 200)
        self.assertEqual((await self.draw(details)).status_code, 409)
        deleted = await self.client.delete('/api/v1/staff/shop/items/' + str(card['id']), headers=self.staff_auth())
        self.assertEqual(deleted.status_code, 409)

    async def test_permissions_empty_pool_and_untrusted_roll_fields(self):
        body = {'title': 'Empty', 'is_active': True, 'cards': []}
        response = await self.client.post('/api/v1/staff/gacha/pools', json=body, headers=self.staff_auth())
        self.assertEqual(response.status_code, 422)
        for path in ['/api/v1/staff/gacha/pools', '/api/v1/staff/gacha/pools/1/history']:
            self.assertEqual((await self.client.get(path, headers=self.auth(self.creator_token))).status_code, 403)
        pool = await self.create_pool(await self.create_card())
        response = await self.client.post('/api/v1/gacha/pools/' + str(pool['id']) + '/roll', json={
            'expected_cost': 20, 'expected_version': pool['version'], 'operation_key': str(audit.uuid.uuid4()),
            'winning_card_id': 1}, headers=self.auth())
        self.assertEqual(response.status_code, 422)
        response = await self.client.post('/api/v1/gacha/pools/' + str(pool['id']) + '/roll', json={
            'expected_cost': 20, 'expected_version': pool['version'], 'operation_key': str(audit.uuid.uuid4())})
        self.assertEqual(response.status_code, 401)


if __name__ == '__main__':
    unittest.main()
