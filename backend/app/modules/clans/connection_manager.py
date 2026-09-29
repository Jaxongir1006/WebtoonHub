from typing import Dict, Set
from fastapi import WebSocket


class ClanConnectionManager:
    def __init__(self):
        # clan_id -> set of active WebSockets
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, clan_id: int, websocket: WebSocket):
        await websocket.accept()
        if clan_id not in self.active_connections:
            self.active_connections[clan_id] = set()
        self.active_connections[clan_id].add(websocket)

    def disconnect(self, clan_id: int, websocket: WebSocket):
        if clan_id in self.active_connections:
            self.active_connections[clan_id].discard(websocket)
            if not self.active_connections[clan_id]:
                del self.active_connections[clan_id]

    async def broadcast(self, clan_id: int, message: dict):
        if clan_id in self.active_connections:
            dead_connections = set()
            for conn in list(self.active_connections[clan_id]):
                try:
                    await conn.send_json(message)
                except Exception:
                    dead_connections.add(conn)

            for dead in dead_connections:
                self.active_connections[clan_id].discard(dead)


clan_ws_manager = ClanConnectionManager()
