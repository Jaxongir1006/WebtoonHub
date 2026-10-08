"""Financial retries, concurrent relationships and multi-worker chat, in isolation."""
import asyncio
import json
import os
import unittest
import uuid
from contextlib import asynccontextmanager, nullcontext
from unittest.mock import AsyncMock, patch

from tests import test_audit_regressions as fixtures
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from app.core.idempotency import OperationReceipt
from app.modules.users.models import User, UserSession
from app.modules.rewards.models import CoinTransaction
from app.modules.friends.models import Friendship
from app.modules.wheel.models import Wheel, WheelItem, WheelSpin
from app.modules.clans.models import Clan, ClanMember, ClanMessage
from app.modules.clans.connection_manager import ClanConnectionManager


class ReliabilityTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.case = fixtures.AuditRegressionTests()
        await self.case.asyncSetUp()
    async def asyncTearDown(self):
        await self.case.asyncTearDown()

    async def wheel(self, free=False):
        async with self.case.sessions() as db:
            wheel = Wheel(title='Retry wheel', slug='retry-wheel', cost_coins=100, has_daily_free_spin=free, is_active=True)
            db.add(wheel); await db.flush()
            db.add_all([WheelItem(wheel_id=wheel.id, reward_type='coins', reward_coins=5, label='Five', weight=1),
                        WheelItem(wheel_id=wheel.id, reward_type='coins', reward_coins=5, label='Five too', weight=1)])
            await db.commit()
            return wheel.id

    async def test_concurrent_paid_retry_has_one_spin_receipt_and_debit(self):
        t = self.case; wheel_id = await self.wheel()
        body = dict(expected_mode='paid', expected_cost=100, operation_key=str(uuid.uuid4()))
        # PostgreSQL must serialize retries even in different workers without
        # the process-local optimization.
        with patch('app.core.transactions.entity_lock', no_process_mutex) if t.engine.dialect.name == 'postgresql' else nullcontext():
            responses = await asyncio.gather(*[t.client.post(f'/api/v1/wheels/{wheel_id}/spin', json=body, headers=t.auth()) for _ in range(2)])
        self.assertEqual([r.status_code for r in responses], [200,200], [r.text for r in responses])
        self.assertEqual(responses[0].json(), responses[1].json())
        self.assertEqual(responses[0].json()['data']['reward_coins'], 5)
        async with t.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(WheelSpin)), 1)
            self.assertEqual(await db.scalar(select(func.count()).select_from(OperationReceipt)), 1)
            self.assertEqual(await db.scalar(select(func.sum(CoinTransaction.amount))), -95)
            self.assertEqual((await db.get(User,t.reader.id)).lightning_coins, 905)
            wheel = await db.get(Wheel,wheel_id); wheel.cost_coins=500; wheel.is_active=False
            await db.commit()
        # A lost response remains recoverable after the wheel was repriced/disabled.
        replay = await t.client.post(f'/api/v1/wheels/{wheel_id}/spin',json=body,headers=t.auth())
        self.assertEqual(replay.json(),responses[0].json())
        conflict=await t.client.post(f'/api/v1/wheels/{wheel_id}/spin',json={**body,'expected_cost':500},headers=t.auth())
        self.assertEqual(conflict.status_code,409,conflict.text)

    async def test_free_receipt_replays_before_daily_availability_check(self):
        t=self.case; wheel_id=await self.wheel(True)
        body=dict(expected_mode='free',expected_cost=0,operation_key=str(uuid.uuid4()))
        first=await t.client.post(f'/api/v1/wheels/{wheel_id}/spin',json=body,headers=t.auth())
        replay=await t.client.post(f'/api/v1/wheels/{wheel_id}/spin',json=body,headers=t.auth())
        self.assertEqual(first.status_code,200,first.text); self.assertEqual(first.json(),replay.json())
        stale=await t.client.post(f'/api/v1/wheels/{wheel_id}/spin',json={**body,'operation_key':str(uuid.uuid4())},headers=t.auth())
        self.assertEqual(stale.status_code,409,stale.text)

    async def test_uncommitted_receipt_and_wallet_are_rolled_back_together(self):
        t=self.case; wheel_id=await self.wheel()
        body=dict(expected_mode='paid',expected_cost=100,operation_key=str(uuid.uuid4()))
        with patch('app.modules.wheel.service.commit_operation',side_effect=RuntimeError('simulated pre-commit failure')):
            with self.assertRaises(RuntimeError):
                await t.client.post(f'/api/v1/wheels/{wheel_id}/spin',json=body,headers=t.auth())
        async with t.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(OperationReceipt)),0)
            self.assertEqual(await db.scalar(select(func.count()).select_from(WheelSpin)),0)
            self.assertEqual(await db.scalar(select(func.count()).select_from(CoinTransaction)),0)
            self.assertEqual((await db.get(User,t.reader.id)).lightning_coins,1000)
        retry=await t.client.post(f'/api/v1/wheels/{wheel_id}/spin',json=body,headers=t.auth())
        self.assertEqual(retry.status_code,200,retry.text)

    async def test_staff_adjustment_and_distribution_replay_original_results(self):
        t=self.case; key=str(uuid.uuid4()); headers={**t.staff_auth(),'Idempotency-Key':key}
        body={'amount_delta':10,'reason':'Retry audit'}; path=f'/api/v1/staff/readers/{t.reader.id}/coins'
        first=await t.client.post(path,json=body,headers=headers)
        replay=await t.client.post(path,json=body,headers=headers)
        self.assertEqual(first.status_code,200,first.text); self.assertEqual(first.json(),replay.json())
        changed=await t.client.post(path,json={**body,'amount_delta':20},headers=headers)
        self.assertEqual(changed.status_code,409,changed.text)
        gift={'amount':25,'reason':'Retry distribution','all_active_users':False,'target_user_ids':[t.reader.id,t.other.id]}
        # Keys cannot be recycled across financial endpoints.
        collision=await t.client.post('/api/v1/staff/coins/distribute',json=gift,headers=headers)
        self.assertEqual(collision.status_code,409,collision.text)
        headers['Idempotency-Key']=str(uuid.uuid4())
        first=await t.client.post('/api/v1/staff/coins/distribute',json=gift,headers=headers)
        self.assertEqual(first.status_code,200,first.text)
        # Normalized target order/duplicates identify the same operation.
        replay=await t.client.post('/api/v1/staff/coins/distribute',json={**gift,'target_user_ids':[t.other.id,t.reader.id,t.reader.id]},headers=headers)
        self.assertEqual(first.json(),replay.json())
        async with t.sessions() as db:
            self.assertEqual((await db.get(User,t.reader.id)).lightning_coins,1035)
            self.assertEqual((await db.get(User,t.other.id)).lightning_coins,125)
            self.assertEqual(await db.scalar(select(func.count()).select_from(CoinTransaction)),3)

    async def test_financial_http_intents_require_identity(self):
        t=self.case; wheel_id=await self.wheel()
        missing=await t.client.post(f'/api/v1/wheels/{wheel_id}/spin',json={'expected_mode':'paid','expected_cost':100},headers=t.auth())
        self.assertEqual(missing.status_code,422)
        headers={'Authorization':'Bearer '+t.staff_token}
        missing=await t.client.post(f'/api/v1/staff/readers/{t.reader.id}/coins',json={'amount_delta':10,'reason':'Audit'},headers=headers)
        self.assertEqual(missing.status_code,422)

    async def test_crossed_friend_requests_converge_on_one_accepted_pair(self):
        t=self.case
        async with t.sessions() as db:
            session=UserSession(user_id=t.other.id,refresh_token_hash='other-session',expires_at=t.user_session.expires_at)
            db.add(session); await db.commit()
        token=fixtures.create_access_token(str(t.other.id),{'role':'user','session_id':str(session.id)})
        requests=[t.client.post('/api/v1/friends/request',json={'user_id':t.other.id},headers=t.auth()),
                  t.client.post('/api/v1/friends/request',json={'user_id':t.reader.id},headers=t.auth(token))]
        with patch('app.modules.friends.router.entity_lock', no_process_mutex) if t.engine.dialect.name == 'postgresql' else nullcontext():
            responses=await asyncio.gather(*requests)
        self.assertEqual([r.status_code for r in responses],[200,200],[r.text for r in responses])
        async with t.sessions() as db:
            pairs=(await db.scalars(select(Friendship))).all()
            self.assertEqual(len(pairs),1); self.assertEqual(pairs[0].status,'accepted')
            db.add(Friendship(user_id=pairs[0].friend_id,friend_id=pairs[0].user_id,status='pending'))
            with self.assertRaises(IntegrityError): await db.commit()
            await db.rollback()

    async def test_chat_catchup_recovers_more_than_latest_fifty_without_gaps(self):
        t=self.case
        async with t.sessions() as db:
            clan=Clan(name='Catchup clan',tag='GAP',leader_id=t.reader.id)
            db.add(clan); await db.flush()
            db.add(ClanMember(clan_id=clan.id,user_id=t.reader.id,role='leader'))
            db.add_all([ClanMessage(clan_id=clan.id,user_id=t.reader.id,content=str(i)) for i in range(137)])
            await db.commit(); clan_id=clan.id
        cursor=0; recovered=[]
        while True:
            response=await t.client.get(f'/api/v1/clans/{clan_id}/chat/messages',params={'after_id':cursor,'limit':50},headers=t.auth())
            self.assertEqual(response.status_code,200,response.text)
            page=response.json(); recovered.extend(m['content'] for m in page['data']); cursor=page['next_after_id']
            if not page['has_more']: break
        self.assertEqual(recovered,[str(i) for i in range(137)])
        invalid=await t.client.get(f'/api/v1/clans/{clan_id}/chat/messages?after_id=1&before_id=2',headers=t.auth())
        self.assertEqual(invalid.status_code,422)
        latest=(await t.client.get(f'/api/v1/clans/{clan_id}/chat/messages?limit=50',headers=t.auth())).json()['data']
        self.assertEqual([m['content'] for m in latest],[str(i) for i in range(87,137)])

    async def test_independent_chat_workers_share_messages_and_revocations(self):
        t=self.case; bus=FakeBus(); a=ClanConnectionManager(); b=ClanConnectionManager()
        with patch('app.modules.clans.connection_manager.get_redis_client',AsyncMock(return_value=bus)), \
             patch('app.modules.clans.connection_manager.valid_chat_session',AsyncMock(return_value=True)):
            await a.start(); await b.start()
            try:
                await asyncio.wait_for(asyncio.gather(a.bus_ready.wait(),b.bus_ready.wait()),2)
                left=FakeSocket(); right=FakeSocket()
                await a.connect(7,left,t.reader.id,t.user_session.id)
                await b.connect(7,right,t.reader.id,t.user_session.id)
                await a.broadcast(7,{'id':1,'content':'shared'})
                await eventually(lambda: len(right.messages)==1)
                self.assertEqual(left.messages,right.messages)
                self.assertEqual(len(left.messages),1,'Origin must not receive duplicate Redis echo')
                await a.close_session(t.user_session.id)
                await eventually(lambda: right.closed)
                self.assertTrue(left.closed); self.assertFalse(b.identities)
                left=FakeSocket();right=FakeSocket()
                await a.connect(7,left,t.reader.id,t.user_session.id)
                await b.connect(7,right,t.reader.id,t.user_session.id)
                await b.close_member(7,t.reader.id)
                await eventually(lambda:left.closed)
                self.assertTrue(right.closed)
            finally:
                await a.stop();await b.stop()

    async def test_chat_bus_outage_keeps_local_delivery_and_persisted_catchup(self):
        t=self.case; manager=ClanConnectionManager(); socket=FakeSocket()
        with patch('app.modules.clans.connection_manager.get_redis_client',AsyncMock(side_effect=ConnectionError)), \
             patch('app.modules.clans.connection_manager.valid_chat_session',AsyncMock(return_value=True)):
            await manager.connect(7,socket,t.reader.id,t.user_session.id)
            await manager.broadcast(7,{'id':42,'content':'local still works'})
            self.assertEqual(socket.messages,[{'id':42,'content':'local still works'}])

    @unittest.skipUnless(os.getenv('AUDIT_TEST_REDIS_URL'), 'Disposable Redis URL is required for transport integration')
    async def test_real_redis_shares_delivery_between_independent_worker_managers(self):
        import redis.asyncio as redis
        t=self.case; client=redis.from_url(os.environ['AUDIT_TEST_REDIS_URL'],decode_responses=True,socket_timeout=2)
        a=ClanConnectionManager();b=ClanConnectionManager()
        a.CHANNEL=b.CHANNEL='webtoonhub:review:'+str(uuid.uuid4())
        with patch('app.modules.clans.connection_manager.get_redis_client',AsyncMock(return_value=client)), \
             patch('app.modules.clans.connection_manager.valid_chat_session',AsyncMock(return_value=True)):
            await a.start();await b.start()
            try:
                await asyncio.wait_for(asyncio.gather(a.bus_ready.wait(),b.bus_ready.wait()),5)
                left=FakeSocket();right=FakeSocket()
                await a.connect(7,left,t.reader.id,t.user_session.id)
                await b.connect(7,right,t.reader.id,t.user_session.id)
                await a.broadcast(7,{'id':1,'content':'actual Redis transport'})
                await eventually(lambda:len(right.messages)==1)
                self.assertEqual(left.messages,right.messages)
                await b.close_session(t.user_session.id)
                await eventually(lambda:left.closed)
                self.assertTrue(right.closed)
            finally:
                await a.stop();await b.stop();await client.aclose()


async def eventually(predicate):
    for _ in range(100):
        if predicate(): return
        await asyncio.sleep(.01)
    raise AssertionError('Cross-worker event was not delivered')

@asynccontextmanager
async def no_process_mutex(*args):
    yield

class FakeSocket:
    def __init__(self): self.messages=[];self.closed=False
    async def accept(self): pass
    async def send_json(self,message): self.messages.append(message)
    async def close(self,code): self.closed=True

class FakeBus:
    def __init__(self): self.subscribers=set()
    def pubsub(self): return FakeSubscription(self)
    async def publish(self,channel,data):
        for subscriber in self.subscribers:
            if subscriber.channel==channel: await subscriber.queue.put({'type':'message','data':data})

class FakeSubscription:
    def __init__(self,bus): self.bus=bus;self.queue=asyncio.Queue();self.channel=None
    async def subscribe(self,channel): self.channel=channel;self.bus.subscribers.add(self)
    async def get_message(self,**kwargs):
        try: return await asyncio.wait_for(self.queue.get(),.02)
        except asyncio.TimeoutError: return None
    async def aclose(self): self.bus.subscribers.discard(self)


class UploadThrottleTests(unittest.IsolatedAsyncioTestCase):
    async def test_resumable_pages_have_separate_limit_and_return_retry_after(self):
        from app.core.rate_limit import enforce_rate_limit
        from starlette.requests import Request
        from starlette.responses import Response
        counters={}
        class Counter:
            async def incr(self,key): counters[key]=counters.get(key,0)+1;return counters[key]
            async def expire(self,*args): pass
        async def next_response(request): return Response(status_code=204)
        async def request(path,method='POST'):
            return await enforce_rate_limit(Request({'type':'http','path':path,'method':method,
                'scheme':'http','server':('test',80),'client':('127.0.0.1',123),'query_string':b'','headers':[]}),next_response)
        with patch('app.core.rate_limit.get_redis_client',AsyncMock(return_value=Counter())):
            for i in range(30):
                self.assertEqual((await request('/api/v1/staff/chapter-imports/start')).status_code,204)
            limited=await request('/api/v1/staff/chapter-imports/1/finalize')
            self.assertEqual(limited.status_code,429);self.assertGreater(int(limited.headers['Retry-After']),0)
            self.assertEqual((await request('/api/v1/staff/chapter-imports/1/pages/1','PUT')).status_code,204)
            for i in range(30): self.assertEqual((await request('/api/v1/staff/shop/items/upload-asset')).status_code,204)
            self.assertEqual((await request('/api/v1/staff/shop/items/upload-asset')).status_code,429)
