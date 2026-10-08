"""Slow-socket isolation and durable chat retries; only isolated test storage."""
import asyncio
import os
import unittest
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, patch

from tests import test_audit_regressions as fixtures
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.transactions import lock_user
from app.modules.clans.connection_manager import ClanConnectionManager
from app.modules.clans.models import Clan, ClanMember, ClanMessage


class FakeSession:
    async def __aenter__(self): return self
    async def __aexit__(self, *args): pass


class Socket:
    def __init__(self, slow_send=False, slow_close=False):
        self.slow_send = slow_send
        self.slow_close = slow_close
        self.messages = []
        self.send_started = asyncio.Event()
        self.delivered = asyncio.Event()
        self.close_started = asyncio.Event()
    async def accept(self): pass
    async def send_json(self, message):
        self.send_started.set()
        if self.slow_send:
            await asyncio.Event().wait()
        self.messages.append(message)
        self.delivered.set()
    async def close(self, code):
        self.close_started.set()
        if self.slow_close:
            await asyncio.Event().wait()


class TransportIsolationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.manager = ClanConnectionManager()
        self.manager.SOCKET_SEND_TIMEOUT = .02
        self.manager.SOCKET_CLOSE_TIMEOUT = .02
        self.published = []
        async def publish(event): self.published.append(event)
        self.manager._publish = publish
        self.patches = [patch('app.modules.clans.connection_manager.AsyncSessionLocal', FakeSession),
                        patch('app.modules.clans.connection_manager.valid_chat_session', AsyncMock(return_value=True))]
        for item in self.patches: item.start()
    async def asyncTearDown(self):
        for item in reversed(self.patches): item.stop()

    async def test_slow_socket_cannot_delay_healthy_socket_or_remote_publication(self):
        slow, healthy = Socket(slow_send=True, slow_close=True), Socket()
        await self.manager.connect(1, slow, 1, 'session')
        await self.manager.connect(1, healthy, 2, 'other')
        task = asyncio.create_task(self.manager.broadcast(1, {'id': 7}))
        await asyncio.wait_for(slow.send_started.wait(), .2)
        await asyncio.wait_for(healthy.delivered.wait(), .2)
        self.assertFalse(task.done(), 'The blocked peer must still be pending during healthy delivery')
        self.assertEqual(self.published, [{'kind': 'message', 'clan_id': 1, 'message': {'id': 7}}])
        await asyncio.wait_for(task, .2)
        self.assertEqual(healthy.messages, [{'id': 7}])
        self.assertTrue(slow.close_started.is_set())
        self.assertNotIn(slow, self.manager.identities)
        self.assertNotIn(slow, self.manager.send_locks)
        self.assertIn(healthy, self.manager.identities)

    async def test_revocation_publishes_before_parallel_bounded_local_closes(self):
        sockets = [Socket(slow_close=True) for _ in range(4)]
        for socket in sockets: await self.manager.connect(1, socket, 1, 'session')
        task = asyncio.create_task(self.manager.close_session('session'))
        await asyncio.wait_for(asyncio.gather(*(socket.close_started.wait() for socket in sockets)), .2)
        self.assertEqual(self.published, [{'kind': 'session_revoked', 'session_id': 'session'}])
        self.assertFalse(self.manager.identities, 'Revocation must remove sockets before network close completes')
        await asyncio.wait_for(task, .2)
        self.assertFalse(self.manager.active_connections)

    async def test_received_slow_message_does_not_block_next_revocation_indefinitely(self):
        slow, other = Socket(slow_send=True, slow_close=True), Socket()
        await self.manager.connect(1, slow, 1, 'session')
        await self.manager.connect(2, other, 2, 'other')
        await asyncio.wait_for(self.manager._receive({'kind': 'message', 'clan_id': 1, 'message': {'id': 1}}), .2)
        await asyncio.wait_for(self.manager._receive({'kind': 'member_revoked', 'clan_id': 2, 'user_id': 2}), .2)
        self.assertTrue(other.close_started.is_set())
        self.assertFalse(self.manager.identities)

    async def test_same_socket_frames_are_serialized(self):
        # This tests serialization, not the slow-peer deadline. Windows timer
        # granularity and a busy CI runner must not turn a healthy yield into
        # the deliberately tiny timeout used by the separate timeout cases.
        self.manager.SOCKET_SEND_TIMEOUT = 5
        class OrderedSocket(Socket):
            sending = False
            concurrent = False
            async def send_json(self, message):
                if self.sending: self.concurrent = True
                self.sending = True
                await asyncio.sleep(.001)
                self.messages.append(message)
                self.sending = False
        socket = OrderedSocket()
        await self.manager.connect(1, socket, 1, 'session')
        await asyncio.gather(self.manager.broadcast(1, {'id': 1}), self.manager.broadcast(1, {'id': 2}))
        self.assertFalse(socket.concurrent)
        self.assertEqual(socket.messages, [{'id': 1}, {'id': 2}])


class ChatRetryTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.case = fixtures.AuditRegressionTests()
        await self.case.asyncSetUp()
        async with self.case.sessions() as db:
            clan = Clan(name='Retry clan', tag='TRY', leader_id=self.case.reader.id)
            db.add(clan); await db.flush()
            db.add(ClanMember(clan_id=clan.id, user_id=self.case.reader.id, role='leader'))
            await db.commit()
            self.clan_id = clan.id
    async def asyncTearDown(self): await self.case.asyncTearDown()

    async def test_author_is_database_locked_before_identity_lookup_and_replay(self):
        events = []
        original_scalar = AsyncSession.scalar
        async def observed_scalar(db, statement, *args, **kwargs):
            if 'clan_messages.client_message_id' in str(statement): events.append('lookup')
            return await original_scalar(db, statement, *args, **kwargs)
        async def observed_lock(db, user_id):
            events.append('lock')
            return await lock_user(db, user_id)
        path = f'/api/v1/clans/{self.clan_id}/chat/send'
        body = {'content': 'One message', 'client_message_id': 'transport-retry'}
        with patch('app.modules.clans.router.lock_user', observed_lock), \
             patch.object(AsyncSession, 'scalar', observed_scalar), \
             patch('app.modules.clans.router.clan_ws_manager.broadcast', AsyncMock()):
            first = await self.case.client.post(path, json=body, headers=self.case.auth())
            replay = await self.case.client.post(path, json=body, headers=self.case.auth())
            changed = await self.case.client.post(path, json={**body, 'content': 'Different'}, headers=self.case.auth())
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(first.json(), replay.json())
        self.assertEqual(changed.status_code, 409, changed.text)
        self.assertEqual(events, ['lock', 'lookup', 'lock', 'lookup', 'lock', 'lookup'])
        async with self.case.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(ClanMessage)), 1)

    @unittest.skipUnless(os.getenv('AUDIT_TEST_DATABASE_URL'), 'Cross-worker row-lock concurrency requires PostgreSQL')
    async def test_independent_workers_retry_same_message_with_one_acknowledged_row(self):
        @asynccontextmanager
        async def no_process_lock(*args): yield
        path = f'/api/v1/clans/{self.clan_id}/chat/send'
        body = {'content': 'Cross-worker retry', 'client_message_id': 'cross-worker-retry'}
        # Bypass the local lock to exercise only the transaction's PostgreSQL lock.
        with patch('app.core.transactions.entity_lock', no_process_lock), \
             patch('app.modules.clans.router.clan_ws_manager.broadcast', AsyncMock()):
            responses = await asyncio.gather(*(self.case.client.post(path, json=body, headers=self.case.auth()) for _ in range(4)))
        self.assertEqual([response.status_code for response in responses], [200] * 4, [response.text for response in responses])
        self.assertTrue(all(response.json() == responses[0].json() for response in responses))
        async with self.case.sessions() as db:
            self.assertEqual(await db.scalar(select(func.count()).select_from(ClanMessage)), 1)
