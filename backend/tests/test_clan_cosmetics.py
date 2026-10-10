"""Clan purchases exercise real HTTP contracts and a separate durable inventory."""
import asyncio
import hashlib
import io
import os
import unittest
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

from PIL import Image
from sqlalchemy import event, func, select

import test_audit_regressions as audit
from app.core.security import create_access_token
from app.core.storage import safe_path
from app.modules.clans.models import Clan, ClanMember, ClanLevelConfig
from app.modules.rewards.models import CoinTransaction
from app.modules.rewards.service import RewardService
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.users.models import User, UserSession


class ClanCosmeticsTests(unittest.IsolatedAsyncioTestCase):
    auth = audit.AuditRegressionTests.auth
    staff_auth = audit.AuditRegressionTests.staff_auth
    asyncTearDown = audit.AuditRegressionTests.asyncTearDown

    async def asyncSetUp(self):
        await audit.AuditRegressionTests.asyncSetUp(self)
        async with self.sessions() as db:
            self.clan = Clan(name='Cosmetics clan', tag='COS', leader_id=self.reader.id)
            self.outsider = User(username='outsider', email='outsider@example.test',
                hashed_password=audit._PASSWORD, lightning_coins=1000)
            db.add_all([self.clan, self.outsider])
            await db.flush()
            db.add_all([
                ClanMember(clan_id=self.clan.id, user_id=self.reader.id, role='leader'),
                ClanMember(clan_id=self.clan.id, user_id=self.other.id, role='co_leader'),
                ClanMember(clan_id=self.clan.id, user_id=self.third.id, role='member'),
            ])
            self.tokens = {self.reader.id: self.reader_token}
            for user in [self.other, self.third, self.outsider]:
                session = UserSession(user_id=user.id,
                    refresh_token_hash=hashlib.sha256(str(user.id).encode()).hexdigest(),
                    expires_at=datetime.now(timezone.utc) + timedelta(days=1))
                db.add(session)
                await db.flush()
                self.tokens[user.id] = create_access_token(str(user.id), {
                    'role': 'user', 'session_id': str(session.id)})
            await db.commit()

    def path(self, tail=''):
        return '/api/v1/clans/' + str(self.clan.id) + tail

    def actor(self, user=None):
        return self.auth(self.tokens[(user or self.reader).id])

    async def item(self, kind='frame', price=25, available=True, **values):
        async with self.sessions() as db:
            item = ShopItem(name='Clan ' + kind, item_type=kind, price_coins=price,
                asset_url='/content/' + kind + '-synthetic.webp', is_available=available, **values)
            db.add(item)
            await db.commit()
            return item

    async def buy(self, item, user=None, price=None):
        return await self.client.post(self.path('/shop/buy/' + str(item.id)),
            json={'expected_price': item.price_coins if price is None else price}, headers=self.actor(user))

    async def equip(self, item, user=None):
        return await self.client.post(self.path('/shop/equip/' + str(item.id)), headers=self.actor(user))

    async def inventory(self, user=None):
        response = await self.client.get(self.path('/inventory'), headers=self.actor(user))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()['data']

    async def test_purchase_charges_payer_once_and_grants_clan_not_personal_ownership(self):
        from app.modules.clans.models import ClanInventory
        item = await self.item()
        response = await self.buy(item)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['data']['new_balance'], 975)
        async with self.sessions() as db:
            self.assertEqual((await db.get(User, self.reader.id)).lightning_coins, 975)
            self.assertEqual((await db.get(User, self.other.id)).lightning_coins, 100)
            owned = (await db.scalars(select(ClanInventory))).one()
            self.assertEqual((owned.clan_id, owned.item_id, owned.price_paid,
                owned.purchased_by_user_id, owned.is_active),
                (self.clan.id, item.id, 25, self.reader.id, False))
            self.assertEqual(await db.scalar(select(func.count()).select_from(UserInventory)), 0)
            ledger = (await db.scalars(select(CoinTransaction))).one()
            self.assertEqual((ledger.user_id, ledger.amount), (self.reader.id, -25))
            self.assertEqual(ledger.transaction_type, 'clan_shop_purchase')
        duplicate = await self.buy(item, user=self.other)
        self.assertEqual(duplicate.status_code, 409, duplicate.text)
        personal_equip = await self.client.post('/api/v1/shop/equip/' + str(item.id), headers=self.actor())
        self.assertEqual(personal_equip.status_code, 404, personal_equip.text)
        personal_buy = await self.client.post('/api/v1/shop/buy/' + str(item.id),
            json={'expected_price': 25}, headers=self.actor())
        self.assertEqual(personal_buy.status_code, 200, personal_buy.text)
        self.assertEqual(len(await self.inventory()), 1)

    async def test_personal_purchase_does_not_unlock_clan_equipping(self):
        item = await self.item()
        personal = await self.client.post('/api/v1/shop/buy/' + str(item.id),
            json={'expected_price': item.price_coins}, headers=self.actor())
        self.assertEqual(personal.status_code, 200, personal.text)
        response = await self.equip(item)
        self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(await self.inventory(), [])

    async def test_price_confirmation_and_failed_offers_never_charge_or_grant(self):
        from app.modules.clans.models import ClanInventory
        item = await self.item(price=101)
        missing = await self.client.post(self.path('/shop/buy/' + str(item.id)), json={}, headers=self.actor())
        self.assertEqual(missing.status_code, 422, missing.text)
        stale = await self.buy(item, price=100)
        self.assertEqual(stale.status_code, 409, stale.text)
        poor = await self.buy(item, user=self.other)
        self.assertEqual(poor.status_code, 400, poor.text)
        hidden = await self.item(available=False)
        self.assertEqual((await self.buy(hidden)).status_code, 404)
        card = await self.item('card', price=0, rarity='rare', character_name='Hero')
        self.assertEqual((await self.buy(card)).status_code, 422)
        absent = await self.client.post(self.path('/shop/buy/999999'),
            json={'expected_price': 25}, headers=self.actor())
        self.assertEqual(absent.status_code, 404, absent.text)
        async with self.sessions() as db:
            self.assertEqual((await db.get(User, self.reader.id)).lightning_coins, 1000)
            self.assertEqual((await db.get(User, self.other.id)).lightning_coins, 100)
            for model in [ClanInventory, CoinTransaction]:
                self.assertEqual(await db.scalar(select(func.count()).select_from(model)), 0)

    async def test_members_can_inspect_but_only_managers_can_mutate(self):
        item = await self.item()
        self.assertEqual((await self.buy(item)).status_code, 200)
        for user in [self.reader, self.other, self.third]:
            for tail in ['/shop', '/inventory']:
                response = await self.client.get(self.path(tail), headers=self.actor(user))
                self.assertEqual(response.status_code, 200, response.text)
        for tail in ['/shop', '/inventory']:
            response = await self.client.get(self.path(tail), headers=self.actor(self.outsider))
            self.assertEqual(response.status_code, 403, response.text)
            self.assertEqual((await self.client.get(self.path(tail))).status_code, 401)
        for user in [self.third, self.outsider]:
            for action in ['buy', 'equip', 'unequip']:
                response = await self.client.post(self.path('/shop/' + action + '/' + str(item.id)),
                    json={'expected_price': 25} if action == 'buy' else None, headers=self.actor(user))
                self.assertEqual(response.status_code, 403, response.text)
        self.assertEqual((await self.equip(item, user=self.other)).status_code, 200)

    async def test_clan_catalog_excludes_cards_and_uses_clan_ownership(self):
        first = await self.item()
        background = await self.item('background')
        await self.item('card', price=0, rarity='rare', character_name='Hero')
        await self.item(available=False)
        personal = await self.client.post('/api/v1/shop/buy/' + str(background.id),
            json={'expected_price': 25}, headers=self.actor())
        self.assertEqual(personal.status_code, 200, personal.text)
        self.assertEqual((await self.buy(first)).status_code, 200)
        response = await self.client.get(self.path('/shop'), headers=self.actor(self.third))
        self.assertEqual(response.status_code, 200, response.text)
        rows = response.json()['data']
        self.assertEqual({row['id'] for row in rows}, {first.id, background.id})
        self.assertEqual({row['id']: row['is_owned'] for row in rows}, {first.id: True, background.id: False})
        catalog = (await self.client.get('/api/v1/staff/shop/items', headers=self.staff_auth())).json()['data']
        self.assertEqual(next(row for row in catalog if row['id'] == first.id)['owned_count'], 1)
        changed = await self.client.patch('/api/v1/staff/shop/items/' + str(first.id),
            json={'name': 'Renamed clan frame'}, headers=self.staff_auth())
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertEqual(changed.json()['data']['owned_count'], 1)

    async def test_equip_changes_only_same_type_and_unequip_preserves_ownership(self):
        from app.modules.clans.models import ClanInventory
        first = await self.item()
        second = await self.item()
        background = await self.item('background')
        for item in [first, second, background]:
            self.assertEqual((await self.buy(item)).status_code, 200)
        for item in [first, background, second]:
            self.assertEqual((await self.equip(item)).status_code, 200)
        async with self.sessions() as db:
            active = set(await db.scalars(select(ClanInventory.item_id).where(ClanInventory.is_active.is_(True))))
            self.assertEqual(active, {second.id, background.id})
        removed = await self.client.post(self.path('/shop/unequip/' + str(second.id)), headers=self.actor())
        self.assertEqual(removed.status_code, 200, removed.text)
        owned = await self.inventory()
        self.assertEqual(len(owned), 3)
        self.assertEqual({row['id'] for row in owned if row['is_active']}, {background.id})
        unknown = await self.client.post(self.path('/shop/unequip/999999'), headers=self.actor())
        self.assertEqual(unknown.status_code, 404, unknown.text)

    async def test_coleader_pays_and_inventory_remains_after_departure_and_transfer(self):
        from app.modules.clans.models import ClanInventory
        item = await self.item()
        bought = await self.buy(item, user=self.other)
        self.assertEqual(bought.status_code, 200, bought.text)
        self.assertEqual(bought.json()['data']['new_balance'], 75)
        self.assertEqual((await self.equip(item, user=self.other)).status_code, 200)
        with patch('app.modules.clans.router.clan_ws_manager.broadcast', AsyncMock()), \
             patch('app.modules.clans.router.clan_ws_manager.close_member', AsyncMock()):
            departed = await self.client.post(self.path('/leave'), headers=self.actor(self.other))
        self.assertEqual(departed.status_code, 200, departed.text)
        transfer = await self.client.patch(self.path('/members/' + str(self.third.id) + '/role'),
            json={'role': 'leader'}, headers=self.actor())
        self.assertEqual(transfer.status_code, 200, transfer.text)
        owned = await self.inventory(self.third)
        self.assertEqual([(row['id'], row['is_active']) for row in owned], [(item.id, True)])
        async with self.sessions() as db:
            row = (await db.scalars(select(ClanInventory))).one()
            self.assertEqual(row.purchased_by_user_id, self.other.id)
            self.assertEqual((await db.get(User, self.reader.id)).lightning_coins, 1000)
        self.assertEqual((await self.equip(item, user=self.third)).status_code, 200)
        self.assertEqual((await self.equip(item, user=self.other)).status_code, 403)

    async def test_concurrent_equip_keeps_exactly_one_frame_active(self):
        from app.modules.clans.models import ClanInventory
        first, second = await self.item(), await self.item()
        for item in [first, second]:
            self.assertEqual((await self.buy(item)).status_code, 200)
        responses = await asyncio.wait_for(asyncio.gather(self.equip(first),
            self.equip(second, user=self.other)), 10)
        self.assertEqual([response.status_code for response in responses], [200, 200])
        async with self.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(ClanInventory)
                .where(ClanInventory.is_active.is_(True))), 1)
            self.assertEqual(await db.scalar(select(func.count()).select_from(ClanInventory)), 2)

    async def test_failed_ledger_rolls_back_charge_and_inventory(self):
        from app.modules.clans.models import ClanInventory
        item = await self.item()
        with patch.object(RewardService, 'record_transaction', side_effect=RuntimeError('Injected ledger failure')):
            with self.assertRaises(RuntimeError):
                await self.buy(item)
        async with self.sessions() as db:
            self.assertEqual((await db.get(User, self.reader.id)).lightning_coins, 1000)
            for model in [ClanInventory, CoinTransaction]:
                self.assertEqual(await db.scalar(select(func.count()).select_from(model)), 0)
        self.assertEqual((await self.buy(item)).status_code, 200)

    async def test_concurrent_managers_buy_same_item_once(self):
        from app.modules.clans.models import ClanInventory
        item = await self.item()
        responses = await asyncio.wait_for(asyncio.gather(
            self.buy(item), self.buy(item, user=self.other)), 10)
        self.assertEqual(sorted(response.status_code for response in responses), [200, 409])
        async with self.sessions() as db:
            ledger = (await db.scalars(select(CoinTransaction))).one()
            self.assertEqual(ledger.amount, -25)
            self.assertEqual(await db.scalar(select(func.sum(User.lightning_coins)).where(
                User.id.in_([self.reader.id, self.other.id]))), 1075)
            self.assertEqual(await db.scalar(select(func.count()).select_from(ClanInventory)), 1)
            self.assertEqual((await db.scalars(select(ClanInventory))).one().purchased_by_user_id, ledger.user_id)

    async def test_purchase_and_upgrade_share_wallet_serialization(self):
        from app.modules.clans.models import ClanInventory
        item = await self.item(price=100)
        async with self.sessions() as db:
            user = await db.get(User, self.reader.id)
            user.lightning_coins = 100
            clan = await db.get(Clan, self.clan.id)
            clan.xp = 100
            db.add_all([
                ClanLevelConfig(level=1, required_xp=100, upgrade_cost_coins=100, max_members=15),
                ClanLevelConfig(level=2, required_xp=200, upgrade_cost_coins=200, max_members=20),
            ])
            await db.commit()
        with patch('app.modules.clans.router.clan_ws_manager.broadcast', AsyncMock()):
            responses = await asyncio.wait_for(asyncio.gather(self.buy(item), self.client.post(
                self.path('/upgrade-level'), json={'expected_cost': 100}, headers=self.actor())), 10)
        self.assertEqual(sorted(response.status_code for response in responses), [200, 400])
        async with self.sessions() as db:
            self.assertEqual((await db.get(User, self.reader.id)).lightning_coins, 0)
            self.assertEqual(await db.scalar(select(func.count()).select_from(CoinTransaction)), 1)
            ownership = await db.scalar(select(func.count()).select_from(ClanInventory))
            self.assertEqual((await db.get(Clan, self.clan.id)).level + ownership, 2)

    async def test_clan_and_personal_purchase_share_wallet_and_catalog_lock_order(self):
        from app.modules.clans.models import ClanInventory
        clan_item = await self.item(price=100)
        personal_item = await self.item('background', price=100)
        async with self.sessions() as db:
            user = await db.get(User, self.reader.id)
            user.lightning_coins = 100
            await db.commit()
        responses = await asyncio.wait_for(asyncio.gather(self.buy(clan_item), self.client.post(
            '/api/v1/shop/buy/' + str(personal_item.id), json={'expected_price': 100},
            headers=self.actor())), 10)
        self.assertEqual(sorted(response.status_code for response in responses), [200, 400])
        async with self.sessions() as db:
            self.assertEqual((await db.get(User, self.reader.id)).lightning_coins, 0)
            grants = await db.scalar(select(func.count()).select_from(ClanInventory))
            grants += await db.scalar(select(func.count()).select_from(UserInventory))
            self.assertEqual(grants, 1)
            self.assertEqual(await db.scalar(select(func.count()).select_from(CoinTransaction)), 1)

    @unittest.skipUnless(os.getenv('AUDIT_TEST_DATABASE_URL'), 'Requires disposable PostgreSQL row locks')
    async def test_postgres_leadership_transfer_and_target_purchase_cannot_deadlock(self):
        from app.modules.clans.models import ClanInventory
        from app.modules.clans import cosmetics
        item = await self.item()
        wallet_locked = asyncio.Event()
        release_purchase = asyncio.Event()
        transfer_waiting = asyncio.Event()
        original_lock_user = cosmetics.lock_user

        @asynccontextmanager
        async def separate_worker_lock(*_):
            # Database locks must also work across API workers, whose in-memory
            # locks are independent. Do not let local serialization hide a
            # PostgreSQL Clan -> leader FK -> User / User -> Clan cycle.
            yield

        async def pause_after_wallet_lock(db, user_id):
            user = await original_lock_user(db, user_id)
            wallet_locked.set()
            await asyncio.wait_for(release_purchase.wait(), 10)
            return user

        def observe_transfer_wait(_conn, _cursor, statement, _parameters, _context, _many):
            normalized = ' '.join(statement.lower().split())
            # The repaired transfer waits for the user's wallet first. A
            # reversed implementation reaches the FK update while holding the
            # clan row. Release the purchase only after either wait is queued.
            if ('from users' in normalized and 'for update' in normalized) or (
                normalized.startswith('update clans set') and 'leader_id' in normalized):
                transfer_waiting.set()

        with patch('app.core.transactions.entity_lock', separate_worker_lock), \
             patch('app.modules.clans.router.entity_lock', separate_worker_lock), \
             patch.object(cosmetics, 'lock_user', side_effect=pause_after_wallet_lock):
            purchasing = asyncio.create_task(self.buy(item, user=self.other))
            await asyncio.wait_for(wallet_locked.wait(), 5)
            event.listen(self.engine.sync_engine, 'before_cursor_execute', observe_transfer_wait)
            transferring = asyncio.create_task(self.client.patch(
                self.path('/members/' + str(self.other.id) + '/role'),
                json={'role': 'leader'}, headers=self.actor()))
            try:
                await asyncio.wait_for(transfer_waiting.wait(), 5)
                release_purchase.set()
                responses = await asyncio.wait_for(asyncio.gather(purchasing, transferring), 10)
            finally:
                release_purchase.set()
                event.remove(self.engine.sync_engine, 'before_cursor_execute', observe_transfer_wait)
                for task in [purchasing, transferring]:
                    if not task.done():
                        task.cancel()
                await asyncio.gather(purchasing, transferring, return_exceptions=True)
        self.assertEqual([response.status_code for response in responses], [200, 200])
        async with self.sessions() as db:
            self.assertEqual((await db.get(Clan, self.clan.id)).leader_id, self.other.id)
            self.assertEqual((await db.get(User, self.other.id)).lightning_coins, 75)
            self.assertEqual(await db.scalar(select(func.count()).select_from(ClanInventory)), 1)
            self.assertEqual(await db.scalar(select(func.count()).select_from(CoinTransaction)), 1)

    async def test_raw_cosmetic_writes_and_old_uploads_are_rejected_but_logo_upload_works(self):
        for field in ['frame_url', 'banner_url']:
            create = await self.client.post('/api/v1/clans', json={
                'name': 'Raw cosmetics', 'tag': 'RAW', 'expected_cost': 300, field: '/content/raw.png'},
                headers=self.actor(self.outsider))
            self.assertEqual(create.status_code, 422, create.text)
            for value in ['/content/raw.png', '', None]:
                changed = await self.client.patch(self.path(), json={field: value}, headers=self.actor())
                self.assertEqual(changed.status_code, 422, changed.text)
        artwork = io.BytesIO()
        with Image.new('RGBA', (32, 32), 'red') as image:
            image.save(artwork, 'PNG')
        for tail in ['/upload-frame', '/upload-banner']:
            response = await self.client.post(self.path(tail),
                files={'file': ('image.png', artwork.getvalue(), 'image/png')}, headers=self.actor())
            self.assertEqual(response.status_code, 422, response.text)
        for kind in ['frame', 'banner', 'background']:
            response = await self.client.post('/api/v1/clans/uploads/' + kind,
                files={'file': ('image.png', artwork.getvalue(), 'image/png')}, headers=self.actor())
            self.assertEqual(response.status_code, 422, response.text)
        logo = await self.client.post(self.path('/upload-avatar'),
            files={'file': ('logo.png', artwork.getvalue(), 'image/png')}, headers=self.actor())
        self.assertEqual(logo.status_code, 200, logo.text)
        self.assertTrue(safe_path(logo.json()['data']['avatar_url'].removeprefix('/content/')).is_file())
        profile = (await self.client.get(self.path())).json()['data']
        self.assertEqual(profile['avatar_url'], logo.json()['data']['avatar_url'])
        self.assertIsNone(profile['frame_url'])
        self.assertIsNone(profile['banner_url'])

    async def test_only_owned_active_assets_are_exposed_and_animation_follows_admin_edits(self):
        from test_background_media import background_artwork
        # Old direct uploads cannot masquerade as a purchased cosmetic.
        async with self.sessions() as db:
            clan = await db.get(Clan, self.clan.id)
            clan.frame_url = '/content/legacy-frame.png'
            clan.banner_url = '/content/legacy-background.png'
            db.add(audit.Friendship(user_id=self.reader.id, friend_id=self.other.id, status='accepted'))
            await db.commit()
        for path in [self.path(), '/api/v1/clans/my-clan', '/api/v1/clans']:
            response = await self.client.get(path, headers=self.actor())
            data = response.json()['data']
            row = data[0] if isinstance(data, list) else data
            self.assertIsNone(row['frame_url'])
            self.assertIsNone(row['banner_url'])
        for path in ['/api/v1/auth/me', '/api/v1/users/reader/public-profile']:
            response = await self.client.get(path, headers=self.actor())
            appearance = response.json()['data']['clan']
            self.assertIsNone(appearance['frame_url'])
            self.assertIsNone(appearance['banner_url'])
        created = await self.client.post('/api/v1/staff/shop/items', data={
            'name': 'Animated clan forest', 'item_type': 'background', 'price_coins': 25},
            files={'asset_file': ('forest.gif', background_artwork(), 'image/gif')}, headers=self.staff_auth())
        self.assertEqual(created.status_code, 201, created.text)
        art = created.json()['data']
        async with self.sessions() as db:
            item = await db.get(ShopItem, art['id'])
        self.assertEqual((await self.buy(item)).status_code, 200)
        self.assertEqual((await self.equip(item)).status_code, 200)
        for path in [self.path(), '/api/v1/clans/my-clan', '/api/v1/clans']:
            response = await self.client.get(path, headers=self.actor())
            data = response.json()['data']
            row = data[0] if isinstance(data, list) else data
            self.assertEqual(row['banner_url'], art['asset_url'])
            self.assertEqual(row['active_background']['asset_preview_url'], art['asset_preview_url'])
            self.assertTrue(row['active_background']['asset_animated'])
        for path in ['/api/v1/auth/me', '/api/v1/users/reader/public-profile', '/api/v1/friends', '/api/v1/staff/clans']:
            response = await self.client.get(path, headers=self.staff_auth() if path.startswith('/api/v1/staff/') else self.actor())
            self.assertEqual(response.status_code, 200, response.text)
            data = response.json()['data']
            if path == '/api/v1/staff/clans':
                appearance = data[0]
            else:
                appearance = (data[0] if isinstance(data, list) else data)['clan']
            self.assertEqual(appearance['banner_url'], art['asset_url'])
            self.assertEqual(appearance['active_background']['asset_preview_url'], art['asset_preview_url'])
            self.assertTrue(appearance['active_background']['asset_animated'])
        hidden = await self.client.patch('/api/v1/staff/shop/items/' + str(item.id),
            json={'is_available': False}, headers=self.staff_auth())
        self.assertEqual(hidden.status_code, 200, hidden.text)
        self.assertEqual((await self.equip(item)).status_code, 200)
        detail = (await self.client.get(self.path())).json()['data']
        self.assertTrue(detail['active_background']['asset_animated'])
        deleted = await self.client.delete('/api/v1/staff/shop/items/' + str(item.id), headers=self.staff_auth())
        self.assertEqual(deleted.status_code, 409, deleted.text)
        static = await self.client.patch('/api/v1/staff/shop/items/' + str(item.id),
            json={'asset_url': 'https://example.test/static-forest.png'}, headers=self.staff_auth())
        self.assertEqual(static.status_code, 200, static.text)
        detail = (await self.client.get(self.path())).json()['data']
        self.assertEqual(detail['banner_url'], 'https://example.test/static-forest.png')
        self.assertEqual(detail['active_background']['asset_preview_url'], detail['banner_url'])
        self.assertFalse(detail['active_background']['asset_animated'])
        self.assertFalse(safe_path(art['asset_url'].removeprefix('/content/')).exists())
        self.assertFalse(safe_path(art['asset_preview_url'].removeprefix('/content/')).exists())

    async def test_owned_item_deletion_and_shared_media_cleanup_preserve_references(self):
        shared = self.media / 'shared.webp'
        with Image.new('RGB', (32, 32), 'blue') as image:
            image.save(shared, 'WEBP')
        async with self.sessions() as db:
            first = ShopItem(name='Shared one', item_type='frame', price_coins=25, asset_url='/content/shared.webp')
            second = ShopItem(name='Shared two', item_type='frame', price_coins=25, asset_url='/content/shared.webp')
            db.add_all([first, second])
            await db.commit()
        self.assertEqual((await self.buy(first)).status_code, 200)
        self.assertEqual((await self.equip(first)).status_code, 200)
        delete = await self.client.delete('/api/v1/staff/shop/items/' + str(first.id), headers=self.staff_auth())
        self.assertEqual(delete.status_code, 409, delete.text)
        replacement = 'https://example.test/new-frame.webp'
        edit = await self.client.patch('/api/v1/staff/shop/items/' + str(first.id),
            json={'asset_url': replacement}, headers=self.staff_auth())
        self.assertEqual(edit.status_code, 200, edit.text)
        self.assertTrue(shared.exists(), 'A different catalog item still references this artwork')
        detail = (await self.client.get(self.path())).json()['data']
        self.assertEqual(detail['frame_url'], replacement)
        delete_second = await self.client.delete('/api/v1/staff/shop/items/' + str(second.id), headers=self.staff_auth())
        self.assertEqual(delete_second.status_code, 200, delete_second.text)
        self.assertFalse(shared.exists(), 'Equipped clans derive their URL from the catalog; stale copies must not retain art')


if __name__ == '__main__':
    unittest.main()
