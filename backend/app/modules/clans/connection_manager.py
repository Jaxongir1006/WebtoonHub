"""Session-scoped sockets with a Redis bus shared by all API workers.

Database history is authoritative. Clients also catch up using their message
cursor, so Redis interruptions never create a permanent gap.
"""
import asyncio
from contextlib import suppress
from datetime import datetime, timezone
import json
import logging
import uuid
from fastapi import WebSocket
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.redis import get_redis_client
from app.modules.users.models import User, UserSession
from app.modules.clans.models import ClanMember

async def valid_chat_session(db, clan_id, user_id, session_id):
    user = await db.get(User, user_id)
    session = await db.scalar(select(UserSession).where(UserSession.id == uuid.UUID(str(session_id)), UserSession.user_id == user_id,
                            UserSession.is_active.is_(True), UserSession.expires_at > datetime.now(timezone.utc)))
    member = await db.scalar(select(ClanMember).where(ClanMember.clan_id == clan_id, ClanMember.user_id == user_id))
    return (user, member) if user and user.is_active and session and member else None

class ClanConnectionManager:
    CHANNEL = 'webtoonhub:clan-events:v1'
    SOCKET_SEND_TIMEOUT = 2.0
    SOCKET_CLOSE_TIMEOUT = .5
    def __init__(self):
        self.active_connections = {}
        self.identities = {}
        self.send_locks = {}
        self.origin = str(uuid.uuid4())
        self.listener = None
        self.bus_ready = asyncio.Event()
    async def start(self):
        if self.listener is None or self.listener.done():
            self.listener = asyncio.create_task(self._listen(), name='clan-events')
    async def stop(self):
        if self.listener is not None:
            self.listener.cancel()
            with suppress(asyncio.CancelledError):
                await self.listener
            self.listener = None
        self.bus_ready.clear()
    async def _publish(self, event):
        try:
            client = await get_redis_client()
            await client.publish(self.CHANNEL, json.dumps({**event, 'origin': self.origin}))
        except Exception:
            # Local delivery still works; REST cursor catch-up covers a bus outage.
            logging.getLogger(__name__).debug('Clan event bus unavailable', exc_info=True)
    async def _listen(self):
        delay = .25
        while True:
            pubsub = None
            try:
                pubsub = (await get_redis_client()).pubsub()
                await pubsub.subscribe(self.CHANNEL)
                self.bus_ready.set()
                delay = .25
                while True:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1)
                    if message and message.get('type') == 'message':
                        await self._receive(json.loads(message['data']))
                    await asyncio.sleep(.01)
            except asyncio.CancelledError:
                raise
            except Exception:
                self.bus_ready.clear()
                logging.getLogger(__name__).debug('Reconnecting clan event bus', exc_info=True)
            finally:
                if pubsub is not None:
                    with suppress(Exception):
                        await pubsub.aclose()
            await asyncio.sleep(delay)
            delay = min(delay * 2, 10)
    async def _receive(self, event):
        if event.get('origin') == self.origin:
            return
        if event.get('kind') == 'message':
            await self._broadcast_local(event['clan_id'], event['message'])
        elif event.get('kind') == 'member_revoked':
            await self._close_member_local(event['clan_id'], event['user_id'])
        elif event.get('kind') == 'session_revoked':
            await self._close_session_local(event['session_id'])
    async def connect(self, clan_id, websocket, user_id, session_id):
        await websocket.accept()
        self.active_connections.setdefault(clan_id, set()).add(websocket)
        self.identities[websocket] = (user_id, str(session_id))
        self.send_locks[websocket] = asyncio.Lock()
    def disconnect(self, clan_id, websocket):
        self.active_connections.get(clan_id, set()).discard(websocket)
        if not self.active_connections.get(clan_id):
            self.active_connections.pop(clan_id, None)
        self.identities.pop(websocket, None)
        self.send_locks.pop(websocket, None)
    async def close_session(self, session_id):
        await self._publish({'kind': 'session_revoked', 'session_id': str(session_id)})
        await self._close_session_local(session_id)
    async def _close_session_local(self, session_id):
        targets = [(clan_id, websocket) for clan_id, connections in list(self.active_connections.items())
                   for websocket in list(connections)
                   if self.identities.get(websocket, (None, None))[1] == str(session_id)]
        await asyncio.gather(*(self.close(clan_id, websocket) for clan_id, websocket in targets))
    async def close_member(self, clan_id, user_id):
        await self._publish({'kind': 'member_revoked', 'clan_id': clan_id, 'user_id': user_id})
        await self._close_member_local(clan_id, user_id)
    async def _close_member_local(self, clan_id, user_id):
        targets = [websocket for websocket in list(self.active_connections.get(clan_id, set()))
                   if self.identities.get(websocket, (None, None))[0] == user_id]
        await asyncio.gather(*(self.close(clan_id, websocket) for websocket in targets))
    async def close(self, clan_id, websocket):
        # Remove authorization and delivery state before a stalled network close.
        self.disconnect(clan_id, websocket)
        try:
            await asyncio.wait_for(websocket.close(code=1008), self.SOCKET_CLOSE_TIMEOUT)
        except Exception:
            pass
    async def broadcast(self, clan_id, message):
        # Other workers must receive the event independently of local backpressure.
        await self._publish({'kind': 'message', 'clan_id': clan_id, 'message': message})
        await self._broadcast_local(clan_id, message)
    async def _broadcast_local(self, clan_id, message):
        await asyncio.gather(*(self._deliver(clan_id, websocket, message)
                               for websocket in list(self.active_connections.get(clan_id, set()))))
    async def _deliver(self, clan_id, websocket, message):
        try:
            # Concurrent REST broadcasts still serialize frames on each connection.
            lock = self.send_locks.get(websocket)
            if lock is None:
                return
            async with lock:
                identity = self.identities.get(websocket)
                if identity is None:
                    return
                user_id, session_id = identity
                async with AsyncSessionLocal() as db:
                    if not await valid_chat_session(db, clan_id, user_id, session_id):
                        await self.close(clan_id, websocket)
                        return
                # Recheck after validation; revocation may have removed this socket.
                if websocket in self.identities:
                    await asyncio.wait_for(websocket.send_json(message), self.SOCKET_SEND_TIMEOUT)
        except Exception:
            await self.close(clan_id, websocket)

clan_ws_manager = ClanConnectionManager()
