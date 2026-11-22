from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional, Tuple

from redis.asyncio import Redis

from app.core.config import settings

LEADERBOARD_KEY = "leaderboard:weekly"
FOCUS_SESSION_TTL = 3600
QUIZ_STATE_TTL = 1800


class RedisService:
    """
    Wrapper Redis Async dengan Sorted Set (ZSET) untuk leaderboard real-time
    dan session cache TTL untuk focus:session:{userId} serta quiz:state:{userId}.
    Jika REDIS_URL belum disetel atau tidak dapat dijangkau secara lokal,
    otomatis fallback ke struktur in-memory ZSET + TTL yang identik.
    """

    def __init__(self) -> None:
        self._client: Optional[Redis] = None
        self._using_memory: bool = True
        self._memory_zset: Dict[str, float] = {}
        self._memory_kv: Dict[str, Tuple[str, float]] = {}

    async def connect(self) -> None:
        if not settings.REDIS_URL.strip():
            self._using_memory = True
            return
        try:
            client = Redis.from_url(
                settings.REDIS_URL.strip(),
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=2.5,
            )
            await client.ping()
            self._client = client
            self._using_memory = False
        except Exception:
            self._client = None
            self._using_memory = True

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    @property
    def source_name(self) -> str:
        return "memory_zset" if self._using_memory else "redis_zset"

    async def set_leaderboard_score(self, user_id: str, xp: int) -> None:
        if self._client is not None and not self._using_memory:
            await self._client.zadd(LEADERBOARD_KEY, {user_id: float(xp)})
            return
        self._memory_zset[user_id] = float(xp)

    async def increment_leaderboard_score(self, user_id: str, delta_xp: int) -> float:
        if self._client is not None and not self._using_memory:
            return float(await self._client.zincrby(LEADERBOARD_KEY, float(delta_xp), user_id))
        current = self._memory_zset.get(user_id, 0.0)
        updated = current + float(delta_xp)
        self._memory_zset[user_id] = updated
        return updated

    async def get_leaderboard_top(self, limit: int = 20) -> List[Tuple[str, int]]:
        if self._client is not None and not self._using_memory:
            rows = await self._client.zrevrange(LEADERBOARD_KEY, 0, limit - 1, withscores=True)
            return [(str(uid), int(score)) for uid, score in rows]
        sorted_items = sorted(self._memory_zset.items(), key=lambda item: item[1], reverse=True)
        return [(uid, int(score)) for uid, score in sorted_items[:limit]]

    async def get_user_rank(self, user_id: str) -> Optional[int]:
        if self._client is not None and not self._using_memory:
            rank = await self._client.zrevrank(LEADERBOARD_KEY, user_id)
            return int(rank) + 1 if rank is not None else None
        sorted_ids = [
            uid for uid, _ in sorted(self._memory_zset.items(), key=lambda item: item[1], reverse=True)
        ]
        if user_id not in sorted_ids:
            return None
        return sorted_ids.index(user_id) + 1

    async def set_json(self, key: str, payload: Dict[str, Any], ttl_seconds: int) -> None:
        serialized = json.dumps(payload)
        if self._client is not None and not self._using_memory:
            await self._client.setex(key, ttl_seconds, serialized)
            return
        self._memory_kv[key] = (serialized, time.monotonic() + ttl_seconds)

    async def get_json(self, key: str) -> Optional[Dict[str, Any]]:
        if self._client is not None and not self._using_memory:
            raw = await self._client.get(key)
            if not raw:
                return None
            return json.loads(raw)
        entry = self._memory_kv.get(key)
        if not entry:
            return None
        raw, expires_at = entry
        if time.monotonic() > expires_at:
            self._memory_kv.pop(key, None)
            return None
        return json.loads(raw)

    async def delete_key(self, key: str) -> None:
        if self._client is not None and not self._using_memory:
            await self._client.delete(key)
            return
        self._memory_kv.pop(key, None)

    async def set_focus_session(self, user_id: str, session_data: Dict[str, Any]) -> None:
        await self.set_json(f"focus:session:{user_id}", session_data, FOCUS_SESSION_TTL)

    async def get_focus_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        return await self.get_json(f"focus:session:{user_id}")

    async def clear_focus_session(self, user_id: str) -> None:
        await self.delete_key(f"focus:session:{user_id}")

    async def set_quiz_state(self, user_id: str, state_data: Dict[str, Any]) -> None:
        await self.set_json(f"quiz:state:{user_id}", state_data, QUIZ_STATE_TTL)

    async def get_quiz_state(self, user_id: str) -> Optional[Dict[str, Any]]:
        return await self.get_json(f"quiz:state:{user_id}")


redis_service = RedisService()
