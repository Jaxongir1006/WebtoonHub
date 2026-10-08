"""Isolated business/API regressions. No test opens the project database or media."""
import os
os.environ['APP_ENV'] = 'test'
os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:///:memory:'
import asyncio
import hashlib
import io
import json
import tempfile
import unittest
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch, AsyncMock
import httpx
from PIL import Image
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
import app.models
from app.core.database import Base, get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.main import app
from app.modules.users.models import User, UserSession
from app.modules.staff.models import StaffUser, StaffSession, Role, Permission, SystemSetting
from app.modules.webtoons.models import Webtoon, Chapter, ChapterImage, Genre
from app.modules.library.progress import ReadingProgress, begin_reading
from app.modules.rewards.models import CoinTransaction, ReadReward
from app.modules.rewards.service import RewardService
from app.modules.shop.models import ShopItem, UserInventory
from app.modules.shop.service import ShopService
from app.modules.wheel.models import Wheel, WheelItem, WheelSpin
from app.modules.friends.models import Friendship
from app.modules.clans.models import Clan, ClanMember, ClanLevelConfig, ClanMessage
from app.modules.auth.recovery import PasswordReset
from app.modules.comments.models import Comment

from app.core.redis import get_redis_client as _REDIS_FACTORY

_PASSWORD = hash_password('regression-password-long')

class NoRedis:
    async def get(self, key): return None
    async def set(self, *args, **kwargs): return True
    async def delete(self, *args): return 0
    async def incr(self, key): return 1
    async def expire(self, *args): return True
    async def scan_iter(self, **kwargs):
        if False: yield None

class AuditRegressionTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='webtoonhub-regression-')
        self.media = Path(self.temp.name) / 'media'
        self.media.mkdir()
        pg_url = os.getenv('AUDIT_TEST_DATABASE_URL')
        if pg_url and not pg_url.rstrip('/').endswith('/audit_test'):
            raise RuntimeError('PostgreSQL test database must be explicitly named audit_test')
        self.engine = create_async_engine(pg_url or 'sqlite+aiosqlite:///' + str(Path(self.temp.name)/'test.db').replace(chr(92), '/'))
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)
        async with self.engine.begin() as conn:
            if pg_url:
                await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        async def database():
            async with self.sessions() as db:
                try:
                    yield db
                except Exception:
                    await db.rollback()
                    raise
        app.dependency_overrides[get_db] = database
        content_app = next(route.app for route in app.routes if route.path == '/content')
        self.patches = [patch.object(content_app, 'directory', str(self.media)), patch.object(content_app, 'all_directories', [str(self.media)]), patch('app.core.storage.CONTENT_ROOT', self.media),
            patch('app.core.content.AsyncSessionLocal', self.sessions),
            patch('app.modules.clans.connection_manager.AsyncSessionLocal', self.sessions),
            patch('app.modules.clans.router.AsyncSessionLocal', self.sessions),
            patch('app.core.redis.get_redis_client', AsyncMock(return_value=NoRedis())),
            patch('app.core.rate_limit.get_redis_client', AsyncMock(return_value=NoRedis())),
            patch('app.modules.auth.recovery.send_email', AsyncMock()),
            patch('app.modules.auth.service.send_welcome_email', AsyncMock())]
        for item in self.patches: item.start()
        async with self.sessions() as db:
            self.reader = User(username='reader', email='reader@example.com', hashed_password=_PASSWORD, lightning_coins=1000)
            self.other = User(username='other', email='other@example.com', hashed_password=_PASSWORD, lightning_coins=100)
            self.third = User(username='third', email='third@example.com', hashed_password=_PASSWORD, lightning_coins=100)
            permissions = [Permission(code=code) for code in ['webtoons:create','webtoons:edit','chapters:create','chapters:edit','chapters:approve','chapters:delete','users:manage','staff:manage','roles:manage']]
            admin_role = Role(name='superadmin', permissions=permissions)
            creator_role = Role(name='creator', permissions=[p for p in permissions if p.code in {'webtoons:create','webtoons:edit','chapters:create','chapters:edit'}])
            self.admin = StaffUser(username='admin',email='admin@example.com',hashed_password=_PASSWORD,role=admin_role)
            self.creator = StaffUser(username='creator',email='creator@example.com',hashed_password=_PASSWORD,role=creator_role)
            db.add_all([self.reader,self.other,self.third,self.admin,self.creator])
            await db.flush()
            self.work = Webtoon(title='Published work',slug='published-work',type='novel',cover_image_url='/content/cover.webp',status='ongoing',uploader_staff_id=self.admin.id)
            db.add(self.work)
            await db.flush()
            self.chapter = Chapter(webtoon_id=self.work.id,chapter_number=1,status='published',content_text='A complete story',reward_coins=0)
            self.pending = Chapter(webtoon_id=self.work.id,chapter_number=2,status='pending',content_text='Pending story',reward_coins=5)
            db.add_all([self.chapter,self.pending])
            self.user_session = UserSession(user_id=self.reader.id,refresh_token_hash=hashlib.sha256(b'refresh-reader').hexdigest(),expires_at=datetime.now(timezone.utc)+timedelta(days=1))
            self.staff_session = StaffSession(staff_id=self.admin.id,refresh_token_hash='staff-hash',expires_at=datetime.now(timezone.utc)+timedelta(days=1))
            self.creator_session = StaffSession(staff_id=self.creator.id,refresh_token_hash='creator-hash',expires_at=datetime.now(timezone.utc)+timedelta(days=1))
            db.add_all([self.user_session,self.staff_session,self.creator_session])
            await db.commit()
        self.reader_token = create_access_token(str(self.reader.id), {'role':'user','session_id':str(self.user_session.id)})
        self.staff_token = create_access_token(str(self.admin.id), {'role':'staff','session_id':str(self.staff_session.id)})
        self.creator_token = create_access_token(str(self.creator.id), {'role':'staff','session_id':str(self.creator_session.id)})
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app,raise_app_exceptions=True),base_url='http://test')
    async def asyncTearDown(self):
        await self.client.aclose()
        app.dependency_overrides.clear()
        for item in reversed(self.patches): item.stop()
        await self.engine.dispose()
        self.temp.cleanup()
    def auth(self, token=None): return {'Authorization':'Bearer '+(token or self.reader_token), 'Idempotency-Key':str(uuid.uuid4())}
    def staff_auth(self): return self.auth(self.staff_token)
    async def test_staff_responses_never_expose_password_hash(self):
        response = await self.client.get('/api/v1/staff/users',headers=self.staff_auth())
        self.assertEqual(response.status_code,200,response.text)
        self.assertNotIn('hashed_password',response.text)
        self.assertNotIn(_PASSWORD,response.text)
    async def test_session_other_route_and_logout_revocation(self):
        for path, headers in [('/api/v1/auth/sessions', self.auth()), ('/api/v1/staff/auth/sessions', self.staff_auth())]:
            listing=await self.client.get(path,headers=headers)
            self.assertEqual(listing.status_code,200,listing.text)
            self.assertTrue(listing.json()['data'][0]['created_at'].endswith(('Z','+00:00')))
        response=await self.client.delete('/api/v1/staff/auth/sessions/other',headers=self.staff_auth())
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual((await self.client.post('/api/v1/auth/logout',headers=self.auth())).status_code,200)
        self.assertEqual((await self.client.get('/api/v1/auth/me',headers=self.auth())).status_code,401)
    async def test_refresh_rotates_and_rejects_replay(self):
        response=await self.client.post('/api/v1/auth/refresh',json={'refresh_token':'refresh-reader'})
        self.assertEqual(response.status_code,200,response.text)
        self.assertNotEqual(response.json()['data']['refresh_token'],'refresh-reader')
        self.assertEqual((await self.client.post('/api/v1/auth/refresh',json={'refresh_token':'refresh-reader'})).status_code,401)
    async def test_password_reset_is_single_use_and_revokes_all_sessions(self):
        token='isolated-password-reset-token'
        async with self.sessions() as db:
            linked=await db.get(StaffUser,self.creator.id); linked.user_id=self.reader.id
            db.add(PasswordReset(user_id=self.reader.id,token_hash=hashlib.sha256(token.encode()).hexdigest(),expires_at=datetime.now(timezone.utc)+timedelta(minutes=5)))
            await db.commit()
        body={'token':token,'new_password':'different-password'}
        self.assertEqual((await self.client.post('/api/v1/auth/password/reset',json=body)).status_code,200)
        self.assertEqual((await self.client.post('/api/v1/auth/password/reset',json=body)).status_code,400)
        self.assertEqual((await self.client.get('/api/v1/auth/me',headers=self.auth())).status_code,401)
        self.assertEqual((await self.client.get('/api/v1/staff/auth/me',headers=self.auth(self.creator_token))).status_code,401)
        login=await self.client.post('/api/v1/staff/auth/login',json={'email':self.creator.username,'password':body['new_password']})
        self.assertEqual(login.status_code,200,login.text)
        old=await self.client.post('/api/v1/staff/auth/login',json={'email':self.creator.username,'password':'regression-password-long'})
        self.assertEqual(old.status_code,401,old.text)

    async def test_idle_logout_revokes_exact_reader_and_staff_refresh_sessions(self):
        async with self.sessions() as db:
            staff_session=await db.get(StaffSession,self.staff_session.id)
            staff_session.refresh_token_hash=hashlib.sha256(b'refresh-staff').hexdigest()
            other_reader_device=UserSession(user_id=self.reader.id,refresh_token_hash=hashlib.sha256(b'other-reader-device').hexdigest(),
                              expires_at=datetime.now(timezone.utc)+timedelta(days=1))
            other_staff_device=StaffSession(staff_id=self.admin.id,refresh_token_hash=hashlib.sha256(b'other-staff-device').hexdigest(),
                              expires_at=datetime.now(timezone.utc)+timedelta(days=1))
            db.add_all([other_reader_device,other_staff_device]); await db.commit()
        for role, owner, session, refresh, path, profile, original_token in [
            ('user',self.reader,self.user_session,'refresh-reader','/api/v1/auth/logout','/api/v1/auth/me',self.reader_token),
            ('staff',self.admin,self.staff_session,'refresh-staff','/api/v1/staff/auth/logout','/api/v1/staff/auth/me',self.staff_token),
        ]:
            expired=create_access_token(str(owner.id),{'role':role,'session_id':str(session.id)},expires_delta=timedelta(seconds=-1))
            self.assertEqual((await self.client.get(profile,headers=self.auth(expired))).status_code,401)
            result=await self.client.post(path,json={'refresh_token':refresh},headers=self.auth(expired))
            self.assertEqual(result.status_code,200,result.text)
            self.assertEqual((await self.client.get(profile,headers=self.auth(original_token))).status_code,401)
            replay=await self.client.post(path,json={'refresh_token':refresh},headers=self.auth(expired))
            self.assertEqual(replay.status_code,401,replay.text)
        async with self.sessions() as db:
            self.assertTrue((await db.get(UserSession,other_reader_device.id)).is_active)
            self.assertTrue((await db.get(StaffSession,other_staff_device.id)).is_active)
        # Missing/null refresh remains compatible with valid access-only logout.
        access=create_access_token(str(self.admin.id),{'role':'staff','session_id':str(other_staff_device.id)})
        null=await self.client.post('/api/v1/staff/auth/logout',json={'refresh_token':None},headers=self.auth(access))
        self.assertEqual(null.status_code,200,null.text)
        self.assertEqual((await self.client.post('/api/v1/auth/refresh',json={'refresh_token':'refresh-reader'})).status_code,401)

    async def test_idle_logout_rejects_mismatched_forged_and_missing_credentials(self):
        expired=create_access_token(str(self.reader.id),{'role':'user','session_id':str(self.user_session.id)},expires_delta=timedelta(seconds=-1))
        wrong_owner=create_access_token(str(self.other.id),{'role':'user','session_id':str(self.user_session.id)},expires_delta=timedelta(seconds=-1))
        wrong_session=create_access_token(str(self.reader.id),{'role':'user','session_id':str(uuid.uuid4())},expires_delta=timedelta(seconds=-1))
        for token, refresh in [(wrong_owner,'refresh-reader'),(wrong_session,'refresh-reader'),
                               (self.staff_token,'refresh-reader'),('forged-token','refresh-reader'),(expired,'invalid-refresh')]:
            result=await self.client.post('/api/v1/auth/logout',json={'refresh_token':refresh},headers=self.auth(token))
            self.assertEqual(result.status_code,401,result.text)
        missing=await self.client.post('/api/v1/auth/logout',headers=self.auth(expired))
        self.assertEqual(missing.status_code,401,missing.text)
        anonymous=await self.client.post('/api/v1/auth/logout',json={'refresh_token':None})
        self.assertEqual(anonymous.status_code,401,anonymous.text)
        arbitrary=await self.client.post('/api/v1/auth/logout',json={'refresh_token':'refresh-reader','session_id':str(uuid.uuid4())})
        self.assertEqual(arbitrary.status_code,422,arbitrary.text)
        async with self.sessions() as db:
            self.assertTrue((await db.get(UserSession,self.user_session.id)).is_active)
            self.assertTrue((await db.get(StaffSession,self.staff_session.id)).is_active)

    async def test_logout_refresh_only_and_expired_refresh_session(self):
        async with self.sessions() as db:
            session=await db.get(UserSession,self.user_session.id)
            session.expires_at=datetime.now(timezone.utc)-timedelta(seconds=1); await db.commit()
        expired=await self.client.post('/api/v1/auth/logout',json={'refresh_token':'refresh-reader'})
        self.assertEqual(expired.status_code,401,expired.text)
        async with self.sessions() as db:
            session=await db.get(UserSession,self.user_session.id)
            session.expires_at=datetime.now(timezone.utc)+timedelta(days=1); await db.commit()
        valid=await self.client.post('/api/v1/auth/logout',json={'refresh_token':'refresh-reader'})
        self.assertEqual(valid.status_code,200,valid.text)
        async with self.sessions() as db:
            self.assertFalse((await db.get(UserSession,self.user_session.id)).is_active)

    async def test_rotated_refresh_logout_still_accepts_valid_captured_access(self):
        rotation=await self.client.post('/api/v1/auth/refresh',json={'refresh_token':'refresh-reader'})
        self.assertEqual(rotation.status_code,200,rotation.text)
        current=rotation.json()['data']
        logout=await self.client.post('/api/v1/auth/logout',headers=self.auth(),json={'refresh_token':'refresh-reader'})
        self.assertEqual(logout.status_code,200,logout.text)
        replay=await self.client.post('/api/v1/auth/refresh',json={'refresh_token':current['refresh_token']})
        self.assertEqual(replay.status_code,401,replay.text)
        self.assertEqual((await self.client.get('/api/v1/auth/me',headers=self.auth(current['access_token']))).status_code,401)
        # The common contract also handles a rotated studio refresh hash.
        async with self.sessions() as db:
            session=await db.get(StaffSession,self.staff_session.id)
            session.refresh_token_hash=hashlib.sha256(b'rotated-staff-refresh').hexdigest(); await db.commit()
        staff=await self.client.post('/api/v1/staff/auth/logout',headers=self.staff_auth(),json={'refresh_token':'captured-old-staff-refresh'})
        self.assertEqual(staff.status_code,200,staff.text)

    async def test_rotated_refresh_logout_expired_access_stays_strict_and_known_mismatch_rejected(self):
        rotation=await self.client.post('/api/v1/auth/refresh',json={'refresh_token':'refresh-reader'})
        self.assertEqual(rotation.status_code,200,rotation.text)
        current=rotation.json()['data']['refresh_token']
        expired=create_access_token(str(self.reader.id),{'role':'user','session_id':str(self.user_session.id)},expires_delta=timedelta(seconds=-1))
        stale=await self.client.post('/api/v1/auth/logout',headers=self.auth(expired),json={'refresh_token':'refresh-reader'})
        self.assertEqual(stale.status_code,401,stale.text)
        async with self.sessions() as db:
            other=UserSession(user_id=self.other.id,refresh_token_hash=hashlib.sha256(b'refresh-other').hexdigest(),
                              expires_at=datetime.now(timezone.utc)+timedelta(days=1))
            staff=await db.get(StaffSession,self.staff_session.id)
            staff.refresh_token_hash=hashlib.sha256(b'refresh-staff').hexdigest()
            db.add(other); await db.commit()
        for refresh in ['refresh-other','refresh-staff']:
            mismatch=await self.client.post('/api/v1/auth/logout',headers=self.auth(),json={'refresh_token':refresh})
            self.assertEqual(mismatch.status_code,401,mismatch.text)
        async with self.sessions() as db:
            self.assertTrue((await db.get(UserSession,self.user_session.id)).is_active)
            self.assertTrue((await db.get(UserSession,other.id)).is_active)
            self.assertTrue((await db.get(StaffSession,self.staff_session.id)).is_active)
        matching=await self.client.post('/api/v1/auth/logout',headers=self.auth(expired),json={'refresh_token':current})
        self.assertEqual(matching.status_code,200,matching.text)

    async def test_password_change_revokes_reader_and_linked_studio_devices(self):
        async with self.sessions() as db:
            linked=await db.get(StaffUser,self.creator.id); linked.user_id=self.reader.id; await db.commit()
        changed=await self.client.patch('/api/v1/auth/profile',headers=self.auth(),
                json={'old_password':'regression-password-long','new_password':'changed-password-123'})
        self.assertEqual(changed.status_code,200,changed.text)
        self.assertEqual((await self.client.get('/api/v1/auth/me',headers=self.auth())).status_code,401)
        self.assertEqual((await self.client.get('/api/v1/staff/auth/me',headers=self.auth(self.creator_token))).status_code,401)
        login=await self.client.post('/api/v1/staff/auth/login',json={'email':self.creator.username,'password':'changed-password-123'})
        self.assertEqual(login.status_code,200,login.text)
    async def test_creator_cannot_publish_or_edit_other_work(self):
        response=await self.client.patch(f'/api/v1/staff/chapters/{self.chapter.id}',json={'status':'published'},headers=self.auth(self.creator_token))
        self.assertEqual(response.status_code,403,response.text)
        async with self.sessions() as db:
            work=await db.get(Webtoon,self.work.id); work.uploader_staff_id=self.creator.id; await db.commit()
        response=await self.client.patch(f'/api/v1/staff/chapters/{self.pending.id}',json={'status':'published'},headers=self.auth(self.creator_token))
        self.assertEqual(response.status_code,403,response.text)
    async def test_staff_detail_has_pending_data_without_view_increment(self):
        response=await self.client.get(f'/api/v1/staff/webtoons/{self.work.id}',headers=self.staff_auth())
        self.assertEqual(response.status_code,200,response.text)
        data=response.json()['data']; self.assertEqual(len(data['chapters']),2); self.assertIn('genre_ids',data)
        async with self.sessions() as db: self.assertEqual((await db.get(Webtoon,self.work.id)).view_count,0)
    async def test_reward_requires_elapsed_completion_and_zero_is_zero(self):
        claim=f'/api/v1/rewards/chapters/{self.chapter.id}/claim'
        # Actual reward route is detected explicitly to keep assertion meaningful.
        from app.modules.rewards.router import client_router
        reward_path=next(route.path for route in client_router.routes if 'chapter' in route.path and 'POST' in route.methods)
        claim='/api/v1'+reward_path.replace('{chapter_id}',str(self.chapter.id)).replace('{id}',str(self.chapter.id))
        self.assertEqual((await self.client.post(claim,headers=self.auth())).status_code,409)
        opened=await self.client.get(f'/api/v1/chapters/{self.chapter.id}',headers=self.auth())
        self.assertEqual(opened.status_code,200,opened.text)
        body={'chapter_id':self.chapter.id,'page_index':0,'progress_percent':100,'completed':True}
        saved=await self.client.put(f'/api/v1/users/reading-progress/{self.work.id}',json=body,headers=self.auth())
        self.assertFalse(saved.json()['data']['completed'])
        async with self.sessions() as db:
            await db.execute(update(ReadingProgress).values(started_at=datetime.now(timezone.utc)-timedelta(seconds=11))); await db.commit()
        saved=await self.client.put(f'/api/v1/users/reading-progress/{self.work.id}',json=body,headers=self.auth())
        self.assertTrue(saved.json()['data']['completed'])
        reward=await self.client.post(claim,headers=self.auth()); self.assertEqual(reward.status_code,200,reward.text)
        self.assertEqual(reward.json()['data']['reward_amount'],0)
        body['progress_percent']=20; body['completed']=False
        saved=await self.client.put(f'/api/v1/users/reading-progress/{self.work.id}',json=body,headers=self.auth())
        self.assertTrue(saved.json()['data']['completed'])
        response=await self.client.get('/api/v1/users/reading-progress',headers=self.auth())
        self.assertEqual(response.json()['data'][0]['webtoon_title'],self.work.title)
        async with self.sessions() as db:
            # An unpublished chapter position must not hide the saved public chapter.
            db.add(ReadingProgress(user_id=self.reader.id, webtoon_id=self.work.id, chapter_id=self.pending.id,
                   started_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)+timedelta(seconds=1)))
            await db.commit()
        response=await self.client.get('/api/v1/users/reading-progress',headers=self.auth())
        self.assertEqual(len(response.json()['data']),1)
        self.assertEqual(response.json()['data'][0]['chapter_id'],self.chapter.id)
    async def test_economy_persists_and_unsupported_fields_rejected(self):
        response=await self.client.patch('/api/v1/staff/economy/settings',json={'daily_checkin_reward':37,'welcome_bonus':0},headers=self.staff_auth())
        self.assertEqual(response.status_code,200,response.text)
        async with self.sessions() as db:
            result=await RewardService.claim_daily_checkin(db,self.reader.id)
            self.assertEqual(result.reward_amount,37)
        response=await self.client.patch('/api/v1/staff/economy/settings',json={'comment_reward':10},headers=self.staff_auth())
        self.assertEqual(response.status_code,422)
    async def test_empty_gift_targets_cannot_reward_everyone(self):
        async with self.sessions() as db:
            with self.assertRaises(Exception) as caught:
                await RewardService.distribute_coins(db,self.admin.id,100,'audit',False,[])
            self.assertEqual(caught.exception.status_code,422)
        async with self.sessions() as db: self.assertEqual(await db.scalar(select(func.count(CoinTransaction.id))),0)
    async def test_friend_delete_uses_user_id_only(self):
        async with self.sessions() as db:
            # Friendship ID equals other user ID but points to the third user.
            db.add(Friendship(id=self.other.id,user_id=self.reader.id,friend_id=self.third.id,status='accepted'))
            db.add(Friendship(id=99,user_id=self.reader.id,friend_id=self.other.id,status='accepted'))
            await db.commit()
        response=await self.client.delete(f'/api/v1/friends/{self.other.id}',headers=self.auth())
        self.assertEqual(response.status_code,200,response.text)
        async with self.sessions() as db:
            self.assertIsNotNone(await db.get(Friendship,self.other.id)); self.assertIsNone(await db.get(Friendship,99))
    async def test_numeric_username_wins_and_explicit_id_remains_available(self):
        async with self.sessions() as db:
            other=await db.get(User,self.other.id); other.username=str(self.third.id); await db.commit()
        data=(await self.client.get(f'/api/v1/users/{self.third.id}/public-profile')).json()['data']
        self.assertEqual(data['id'],self.other.id)
        data=(await self.client.get(f'/api/v1/users/id/{self.third.id}/public-profile')).json()['data']
        self.assertEqual(data['id'],self.third.id)
    async def test_wheel_intent_stale_free_never_charges(self):
        async with self.sessions() as db:
            wheel=Wheel(title='Audit wheel',slug='audit-wheel',cost_coins=10,has_daily_free_spin=True,is_active=True)
            db.add(wheel); await db.flush()
            db.add_all([WheelItem(wheel_id=wheel.id,reward_type='coins',reward_coins=0,label='Zero',weight=1),WheelItem(wheel_id=wheel.id,reward_type='coins',reward_coins=0,label='Zero2',weight=1)])
            await db.commit(); wheel_id=wheel.id
        url=f'/api/v1/wheels/{wheel_id}/spin'; intent={'expected_mode':'free','expected_cost':0,'operation_key':str(uuid.uuid4())}
        first=await self.client.post(url,json=intent,headers=self.auth()); self.assertEqual(first.status_code,200,first.text)
        stale=await self.client.post(url,json={**intent,'operation_key':str(uuid.uuid4())},headers=self.auth()); self.assertEqual(stale.status_code,409,stale.text)
        async with self.sessions() as db: self.assertEqual((await db.get(User,self.reader.id)).lightning_coins,1000)
        self.assertEqual((await self.client.get('/api/v1/wheels/user/history',headers=self.auth())).status_code,200)
    async def test_concurrent_purchases_cannot_overspend_and_ledger_matches(self):
        async with self.sessions() as db:
            user=await db.get(User,self.reader.id); user.lightning_coins=10
            items=[ShopItem(name='Item'+str(index),item_type='frame',price_coins=10,asset_url='/content/frame.svg',is_available=True) for index in range(2)]
            db.add_all(items); await db.commit(); ids=[item.id for item in items]
        async def buy(identifier):
            async with self.sessions() as db:
                try: return await ShopService.buy_item(db,self.reader.id,identifier)
                except Exception as error: await db.rollback(); return error
        if self.engine.url.get_backend_name() == 'postgresql':
            @asynccontextmanager
            async def no_process_mutex(*args):
                yield
            with patch('app.core.transactions.entity_lock', no_process_mutex):
                results=await asyncio.gather(*(buy(identifier) for identifier in ids))
        else:
            results=await asyncio.gather(*(buy(identifier) for identifier in ids))
        self.assertEqual(sum(not isinstance(result,Exception) for result in results),1)
        async with self.sessions() as db:
            self.assertEqual((await db.get(User,self.reader.id)).lightning_coins,0)
            self.assertEqual(await db.scalar(select(func.sum(CoinTransaction.amount))),-10)
            self.assertEqual(await db.scalar(select(func.count(UserInventory.id))),1)
    async def test_private_comments_and_paginated_replies(self):
        async with self.sessions() as db:
            root=Comment(chapter_id=self.chapter.id,user_id=self.reader.id,content='Root'); db.add(root); await db.flush()
            db.add_all([Comment(chapter_id=self.chapter.id,user_id=self.reader.id,parent_id=root.id,content='Reply'+str(index)) for index in range(4)])
            await db.commit(); root_id=root.id
        self.assertEqual((await self.client.get(f'/api/v1/chapters/{self.pending.id}/comments')).status_code,404)
        first=await self.client.get(f'/api/v1/comments/{root_id}/replies?offset=0&limit=2')
        data=first.json()['data']; self.assertEqual(data['total'],4); self.assertTrue(data['has_more'])
        second=(await self.client.get(f'/api/v1/comments/{root_id}/replies?offset=2&limit=2')).json()['data']
        self.assertFalse(second['has_more']); self.assertNotEqual(data['items'][0]['id'],second['items'][0]['id'])
    async def test_verified_avatar_draft_cancel_does_not_save_and_bad_bytes_rejected(self):
        bad=await self.client.post('/api/v1/users/avatar/draft',files={'file':('fake.png',b'not an image','image/png')},headers=self.auth())
        self.assertEqual(bad.status_code,422,bad.text)
        buffer=io.BytesIO(); Image.new('RGB',(20,30),'red').save(buffer,'PNG')
        uploaded=await self.client.post('/api/v1/users/avatar/draft',files={'file':('good.png',buffer.getvalue(),'image/png')},headers=self.auth())
        self.assertEqual(uploaded.status_code,200,uploaded.text)
        async with self.sessions() as db: self.assertIsNone((await db.get(User,self.reader.id)).avatar_url)
        saved=await self.client.patch('/api/v1/users/profile',json={'avatar_url':uploaded.json()['data']['avatar_url']},headers=self.auth())
        self.assertEqual(saved.status_code,200,saved.text)
    async def test_clan_fee_transfer_and_chat_idempotence(self):
        async with self.sessions() as db:
            db.add(SystemSetting(key='clan_creation_cost',value='50'))
            db.add_all([ClanLevelConfig(level=1,required_xp=100,upgrade_cost_coins=50,max_members=15),ClanLevelConfig(level=2,required_xp=200,upgrade_cost_coins=100,max_members=20)])
            await db.commit()
        stale=await self.client.post('/api/v1/clans',json={'name':'Audit Clan','tag':'AUD','expected_cost':300},headers=self.auth()); self.assertEqual(stale.status_code,409,stale.text)
        created=await self.client.post('/api/v1/clans',json={'name':'Audit Clan','tag':'AUD','expected_cost':50},headers=self.auth()); self.assertEqual(created.status_code,201,created.text)
        clan_id=created.json()['data']['id']; self.assertEqual(created.json()['data']['remaining_coins'],950)
        async with self.sessions() as db:
            db.add(ClanMember(clan_id=clan_id,user_id=self.other.id,role='member')); await db.commit()
        send={'content':'Hello clan','client_message_id':'stable-test-id'}
        first=await self.client.post(f'/api/v1/clans/{clan_id}/chat/send',json=send,headers=self.auth())
        second=await self.client.post(f'/api/v1/clans/{clan_id}/chat/send',json=send,headers=self.auth())
        self.assertEqual(first.status_code,200,first.text); self.assertEqual(first.json()['data']['id'],second.json()['data']['id'])
        transfer=await self.client.patch(f'/api/v1/clans/{clan_id}/members/{self.other.id}/role',json={'role':'leader'},headers=self.auth()); self.assertEqual(transfer.status_code,200,transfer.text)
        async with self.sessions() as db: self.assertEqual((await db.get(Clan,clan_id)).leader_id,self.other.id)
    async def test_share_metadata_is_escaped_and_does_not_increment_views(self):
        async with self.sessions() as db:
            work=await db.get(Webtoon,self.work.id); work.title='Danger <script>alert(1)</script>'; await db.commit()
        response=await self.client.get(f'/api/v1/share/webtoons/{self.work.id}')
        self.assertEqual(response.status_code,200); self.assertIn('og:image',response.text); self.assertNotIn('<script>',response.text)
        async with self.sessions() as db: self.assertEqual((await db.get(Webtoon,self.work.id)).view_count,0)
    def test_password_suffix_after_72_bytes_matters(self):
        password='a'*72+'suffix-one'; encoded=hash_password(password)
        self.assertTrue(verify_password(password,encoded)); self.assertFalse(verify_password('a'*72+'suffix-two',encoded))
    def test_svg_sanitizer_removes_active_and_external_content(self):
        from app.core.storage import sanitize_svg
        sanitized=sanitize_svg(b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><rect fill="url(https://example.test/a)"/><foreignObject><p>bad</p></foreignObject></svg>')
        self.assertNotIn(b'script',sanitized); self.assertNotIn(b'onload',sanitized); self.assertNotIn(b'foreignObject',sanitized); self.assertNotIn(b'https://example.test',sanitized)

    async def test_pending_media_requires_staff_capability_and_legacy_dimensions_backfill(self):
        from app.core.storage import StorageService
        from app.modules.webtoons.service import WebtoonService
        buffer=io.BytesIO(); Image.new('RGB',(90,140),'blue').save(buffer,'PNG')
        url=await StorageService.upload_file_async(bucket_name='chapters',object_name=f'{self.work.id}/{self.pending.id}/001.png',data=buffer.getvalue())
        async with self.sessions() as db:
            image=ChapterImage(chapter_id=self.pending.id,image_url=url,order_index=1); db.add(image); await db.commit()
        # StaticFiles directory is fixed at app import; authorization is still checked before file resolution.
        response=await self.client.get(url); self.assertEqual(response.status_code,403,response.text)
        detail=(await self.client.get(f'/api/v1/staff/webtoons/{self.work.id}',headers=self.staff_auth())).json()['data']
        pending=next(chapter for chapter in detail['chapters'] if chapter['id']==self.pending.id)
        self.assertIn('media_token=',pending['images'][0]['image_url'])
        authorized=await self.client.get(pending['images'][0]['image_url']); self.assertEqual(authorized.status_code,200,authorized.text)
        await self.client.post('/api/v1/staff/auth/logout',headers=self.staff_auth())
        revoked=await self.client.get(pending['images'][0]['image_url']); self.assertEqual(revoked.status_code,403,revoked.text)
        async with self.sessions() as db:
            data=await WebtoonService.read_chapter(db,self.pending.id,None,True)
            self.assertEqual((data.images[0].width,data.images[0].height),(90,140))
            image=await db.get(ChapterImage,data.images[0].id); self.assertEqual(image.width,90)
    async def test_chapter_pages_reorder_remove_and_reward_upload_zero(self):
        async with self.sessions() as db:
            image1=ChapterImage(chapter_id=self.pending.id,image_url='/content/does-not-exist-1.webp',order_index=1)
            image2=ChapterImage(chapter_id=self.pending.id,image_url='/content/does-not-exist-2.webp',order_index=2)
            db.add_all([image1,image2]); await db.commit(); ids=[image1.id,image2.id]
        updated=await self.client.patch(f'/api/v1/staff/chapters/{self.pending.id}',json={'image_ids':[ids[1]],'reward_coins':0},headers=self.staff_auth())
        self.assertEqual(updated.status_code,200,updated.text)
        async with self.sessions() as db:
            self.assertIsNone(await db.get(ChapterImage,ids[0])); self.assertEqual((await db.get(ChapterImage,ids[1])).order_index,1)
        upload=await self.client.post('/api/v1/staff/chapters',data={'webtoon_id':str(self.work.id),'chapter_number':'3','content_text':'new chapter','reward_coins':'0'},headers=self.staff_auth())
        self.assertEqual(upload.status_code,201,upload.text); self.assertEqual(upload.json()['data']['reward_coins'],0)
        feedback=await self.client.patch(f'/api/v1/staff/chapters/{self.pending.id}/status',json={'status':'rejected','feedback':'Please correct page order'},headers=self.staff_auth())
        self.assertEqual(feedback.status_code,200,feedback.text)
        async with self.sessions() as db: self.assertEqual((await db.get(Chapter,self.pending.id)).moderation_feedback,'Please correct page order')
    async def test_chat_session_authorization_rechecks_revocation_and_membership(self):
        from app.modules.clans.connection_manager import valid_chat_session
        async with self.sessions() as db:
            clan=Clan(name='SessionClan',tag='SES',leader_id=self.reader.id); db.add(clan); await db.flush()
            member=ClanMember(clan_id=clan.id,user_id=self.reader.id,role='leader'); db.add(member); await db.commit()
            self.assertIsNotNone(await valid_chat_session(db,clan.id,self.reader.id,self.user_session.id))
            await db.delete(member); await db.commit()
            self.assertIsNone(await valid_chat_session(db,clan.id,self.reader.id,self.user_session.id))
            db.add(ClanMember(clan_id=clan.id,user_id=self.reader.id,role='leader')); await db.commit()
            await db.execute(update(UserSession).values(is_active=False)); await db.commit()
            self.assertIsNone(await valid_chat_session(db,clan.id,self.reader.id,self.user_session.id))
    async def test_rate_limit_and_readiness_fail_truthfully(self):
        class OverLimit(NoRedis):
            async def incr(self,key): return 100000
        with patch('app.core.rate_limit.get_redis_client',AsyncMock(return_value=OverLimit())):
            response=await self.client.post('/api/v1/auth/login',json={'email':'reader@example.com','password':'anything'})
            self.assertEqual(response.status_code,429); self.assertIn('Retry-After',response.headers)
        with patch('app.core.database.AsyncSessionLocal',side_effect=RuntimeError('offline')):
            response=await self.client.get('/api/v1/health'); self.assertEqual(response.status_code,503)
    async def test_cache_bound_and_redis_auth_tls_url(self):
        import app.core.redis as cache
        cache._memory_cache.clear()
        with patch('app.core.redis.get_redis_client',AsyncMock(side_effect=ConnectionError())):
            for index in range(cache.MAX_CACHE_ENTRIES+10):
                await cache.CacheService.set(str(index),{'value':index})
            self.assertLessEqual(len(cache._memory_cache),cache.MAX_CACHE_ENTRIES)
            self.assertIsNone(await cache.CacheService.get('0'))
        original=cache.redis_client; cache.redis_client=None
        try:
            with patch.object(cache.settings,'REDIS_URL','rediss://test-user:test-pass@localhost:6380/2'):
                client=await _REDIS_FACTORY()
                self.assertEqual(client.connection_pool.connection_kwargs['username'],'test-user')
                self.assertEqual(client.connection_pool.connection_kwargs['db'],2)
                await client.aclose()
        finally:
            cache.redis_client=original

    async def test_image_append_is_idempotent_and_duplicate_chapter_is_conflict(self):
        buffer=io.BytesIO(); Image.new('RGB',(30,60),'green').save(buffer,'PNG')
        content=buffer.getvalue(); path=f'/api/v1/staff/chapters/{self.pending.id}/images'
        headers=self.staff_auth() | {'Idempotency-Key':'one-edit-draft'}
        first=await self.client.post(path,files={'images':('first.png',content,'image/png')},headers=headers)
        self.assertEqual(first.status_code,200,first.text)
        retry=await self.client.post(path,files={'images':('first.png',content,'image/png')},headers=headers)
        self.assertEqual(retry.status_code,200,retry.text); self.assertEqual(first.json()['data'][0]['id'],retry.json()['data'][0]['id'])
        async with self.sessions() as db: self.assertEqual(await db.scalar(select(func.count(ChapterImage.id)).where(ChapterImage.chapter_id == self.pending.id)),1)
        async with self.sessions() as db:
            db.add_all([ChapterImage(chapter_id=self.pending.id,image_url=f'/content/absent-page-{i}.webp',order_index=i)
                        for i in range(2,101)])
            await db.commit()
            existing=(await db.execute(select(ChapterImage.id).where(ChapterImage.chapter_id == self.pending.id).order_by(ChapterImage.order_index))).scalars().all()
        retained=list(reversed(existing[:99]))
        replace_headers=self.staff_auth() | {'Idempotency-Key':'replace-at-page-limit'}
        changed=await self.client.post(path,data={'retained_image_ids':json.dumps(retained)},
                 files={'images':('replace.png',content,'image/png')},headers=replace_headers)
        self.assertEqual(changed.status_code,200,changed.text)
        retry=await self.client.post(path,data={'retained_image_ids':json.dumps(retained)},
                 files={'images':('replace.png',content,'image/png')},headers=replace_headers)
        self.assertEqual(retry.status_code,200,retry.text)
        self.assertEqual(changed.json()['data'][0]['id'],retry.json()['data'][0]['id'])
        async with self.sessions() as db:
            current=(await db.execute(select(ChapterImage.id).where(ChapterImage.chapter_id == self.pending.id).order_by(ChapterImage.order_index))).scalars().all()
            self.assertEqual(current,retained+[changed.json()['data'][0]['id']])
        conflict=await self.client.post(path,data={'retained_image_ids':'[]'},
                 files={'images':('replace.png',content,'image/png')},headers=replace_headers)
        self.assertEqual(conflict.status_code,409,conflict.text)
        duplicate=await self.client.post('/api/v1/staff/chapters',data={'webtoon_id':str(self.work.id),'chapter_number':'1','content_text':'duplicate'},headers=self.staff_auth())
        self.assertEqual(duplicate.status_code,409,duplicate.text)
    async def test_catalog_sort_and_light_chapter_list_no_full_novel_text(self):
        response=await self.client.get('/api/v1/webtoons?sort=updated')
        self.assertEqual(response.status_code,200,response.text); self.assertNotIn('A complete story',response.text)
        chapters=await self.client.get(f'/api/v1/webtoons/{self.work.id}/chapters?offset=0&limit=1')
        self.assertEqual(len(chapters.json()['data']),1); self.assertNotIn('A complete story',chapters.text)
        async with self.sessions() as db: self.assertEqual((await db.get(Webtoon,self.work.id)).view_count,0)

    async def test_library_first_chapter_and_directory_pagination(self):
        saved=await self.client.post(f'/api/v1/users/library/{self.work.id}',json={'status':'reading'},headers=self.auth())
        self.assertEqual(saved.status_code,200,saved.text)
        response=await self.client.get('/api/v1/users/library',headers=self.auth())
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json()['data'][0]['webtoon']['first_chapter']['id'],self.chapter.id)
        async with self.sessions() as db:
            db.add_all([Clan(name='Directory'+str(index),tag='DIR'+str(index),leader_id=self.reader.id) for index in range(3)])
            db.add_all([Friendship(user_id=self.reader.id,friend_id=user_id,status='accepted') for user_id in [self.other.id,self.third.id]])
            await db.commit()
        clans=await self.client.get('/api/v1/clans?offset=0&limit=2'); self.assertEqual(clans.status_code,200,clans.text)
        self.assertEqual(clans.json()['pagination']['total'],3); self.assertTrue(clans.json()['pagination']['has_more'])
        friends=await self.client.get('/api/v1/friends?offset=0&limit=1',headers=self.auth()); self.assertEqual(friends.status_code,200,friends.text)
        self.assertEqual(friends.json()['pagination']['total'],2); self.assertTrue(friends.json()['pagination']['has_more'])

    async def test_bulk_gift_and_purchase_do_not_lose_wallet_update(self):
        async with self.sessions() as db:
            user=await db.get(User,self.reader.id); user.lightning_coins=10
            item=ShopItem(name='BulkRace',item_type='frame',price_coins=10,asset_url='/content/race.svg',is_available=True)
            db.add(item); await db.commit(); item_id=item.id
        async def purchase():
            async with self.sessions() as db: return await ShopService.buy_item(db,self.reader.id,item_id)
        async def gift():
            async with self.sessions() as db: return await RewardService.distribute_coins(db,self.admin.id,20,'Gift',False,[self.reader.id])
        await asyncio.gather(purchase(),gift())
        async with self.sessions() as db:
            self.assertEqual((await db.get(User,self.reader.id)).lightning_coins,20)
            self.assertEqual(await db.scalar(select(func.sum(CoinTransaction.amount))),10)

    async def test_creator_catalog_contains_only_owned_projects(self):
        response=await self.client.get('/api/v1/staff/webtoons',headers=self.auth(self.creator_token))
        self.assertEqual(response.status_code,200,response.text); self.assertEqual(response.json()['data']['total'],0)
        async with self.sessions() as db:
            work=await db.get(Webtoon,self.work.id); work.uploader_staff_id=self.creator.id; await db.commit()
        response=await self.client.get('/api/v1/staff/webtoons',headers=self.auth(self.creator_token))
        self.assertEqual(response.json()['data']['total'],1); self.assertEqual(response.json()['data']['items'][0]['chapter_count'],2)
    async def test_duplicate_registration_and_reader_wallet_bypass_fail_cleanly(self):
        response=await self.client.post('/api/v1/auth/register',json={'username':self.other.username,'email':self.third.email,'password':'acceptable-password'})
        self.assertEqual(response.status_code,409,response.text)
        response=await self.client.patch(f'/api/v1/staff/readers/{self.reader.id}',json={'lightning_coins':100000},headers=self.staff_auth())
        self.assertEqual(response.status_code,422,response.text)
        async with self.sessions() as db: self.assertEqual((await db.get(User,self.reader.id)).lightning_coins,1000)
    async def test_non_superadmin_clan_settings_permissions_work(self):
        async with self.sessions() as db:
            permission=await db.scalar(select(Permission).where(Permission.code=='users:manage'))
            role=Role(name='operator',permissions=[permission]); operator=StaffUser(username='operator',email='operator@example.com',hashed_password=_PASSWORD,role=role)
            second=StaffUser(username='operator-two',email='operator-two@example.com',hashed_password=_PASSWORD,role=role)
            db.add_all([operator,second]); await db.flush()
            session=StaffSession(staff_id=operator.id,refresh_token_hash='operator',expires_at=datetime.now(timezone.utc)+timedelta(days=1))
            db.add(session); await db.commit()
        token=create_access_token(str(operator.id),{'role':'staff','session_id':str(session.id)})
        response=await self.client.get('/api/v1/staff/clans/settings',headers=self.auth(token)); self.assertEqual(response.status_code,200,response.text)
        deletion=await self.client.delete(f'/api/v1/staff/roles/{role.id}',headers=self.staff_auth())
        self.assertEqual(deletion.status_code,400,deletion.text)
        async with self.sessions() as db:
            wheel_permission=Permission(code='wheel:manage'); wheel_role=Role(name='wheel-only',permissions=[wheel_permission])
            wheel_staff=StaffUser(username='wheel-staff',email='wheel-staff@example.com',hashed_password=_PASSWORD,role=wheel_role)
            db.add(wheel_staff); await db.flush()
            wheel_session=StaffSession(staff_id=wheel_staff.id,refresh_token_hash='wheel-only',expires_at=datetime.now(timezone.utc)+timedelta(days=1))
            db.add(wheel_session); await db.commit()
        wheel_token=create_access_token(str(wheel_staff.id),{'role':'staff','session_id':str(wheel_session.id)})
        catalog=await self.client.get('/api/v1/staff/shop/items',headers=self.auth(wheel_token))
        self.assertEqual(catalog.status_code,200,catalog.text)
        mutation=await self.client.patch('/api/v1/staff/shop/items/1',headers=self.auth(wheel_token),json={'price':0})
        self.assertEqual(mutation.status_code,403,mutation.text)
