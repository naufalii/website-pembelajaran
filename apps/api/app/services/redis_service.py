from __future__ import annotations

import asyncio
import json
import time
from typing import Any, Awaitable, Dict, List, Optional, Tuple, TypeVar

from redis.asyncio import Redis

from app.core.config import settings

LEADERBOARD_KEY = "leaderboard:weekly"
FOCUS_SESSION_TTL = 3600
QUIZ_STATE_TTL = 1800
REDIS_TIMEOUT_SECONDS = 1.5

T = TypeVar("T")


class RedisService:
    """
    Wrapper Redis Async dengan Sorted Set (ZSET) untuk leaderboard real-time
    dan session cache TTL untuk focus:session:{userId} serta quiz:state:{userId}.
    Setiap koneksi dan perintah Redis dibatasi timeout singkat (maksimal 1.5 detik)
    dengan fallback aman ke cache in-memory agar gangguan Redis tidak pernah menggantung API.
    """

    def __init__(self) -> None:
        self._client: Optional[Redis] = None
        self._using_memory: bool = True
        self._memory_zset: Dict[str, float] = {}
        self._memory_kv: Dict[str, Tuple[str, float]] = {}

    async def _run_with_timeout(self, awaitable: Awaitable[T]) -> Optional[T]:
        try:
            return await asyncio.wait_for(awaitable, timeout=REDIS_TIMEOUT_SECONDS)
        except Exception:
            # Jangan biarkan timeout/gangguan jaringan Upstash memblokir request pengguna
            return None

    async def connect(self) -> None:
        if not settings.REDIS_URL.strip():
            self._using_memory = True
            return
        try:
            client = Redis.from_url(
                settings.REDIS_URL.strip(),
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=REDIS_TIMEOUT_SECONDS,
                socket_timeout=REDIS_TIMEOUT_SECONDS,
                retry_on_timeout=False,
            )
            pong = await asyncio.wait_for(client.ping(), timeout=REDIS_TIMEOUT_SECONDS)
            if pong:
                self._client = client
                self._using_memory = False
            else:
                await client.aclose()
                self._client = None
                self._using_memory = True
        except Exception:
            self._client = None
            self._using_memory = True

    async def close(self) -> None:
        if self._client is not None:
            try:
                await asyncio.wait_for(self._client.aclose(), timeout=1.0)
            except Exception:
                pass
            self._client = None

    @property
    def source_name(self) -> str:
        return "memory_zset" if self._using_memory else "redis_zset"

    async def set_leaderboard_score(self, user_id: str, xp: int) -> None:
        self._memory_zset[user_id] = float(xp)
        if self._client is not None and not self._using_memory:
            await self._run_with_timeout(self._client.zadd(LEADERBOARD_KEY, {user_id: float(xp)}))

    async def set_leaderboard_scores_bulk(self, scores: Dict[str, int]) -> None:
        if not scores:
            return
        mapping = {uid: float(xp) for uid, xp in scores.items()}
        self._memory_zset.update(mapping)
        if self._client is not None and not self._using_memory:
            await self._run_with_timeout(self._client.zadd(LEADERBOARD_KEY, mapping))

    async def increment_leaderboard_score(self, user_id: str, delta_xp: int) -> float:
        current = self._memory_zset.get(user_id, 0.0)
        updated = current + float(delta_xp)
        self._memory_zset[user_id] = updated
        if self._client is not None and not self._using_memory:
            res = await self._run_with_timeout(
                self._client.zincrby(LEADERBOARD_KEY, float(delta_xp), user_id)
            )
            if res is not None:
                return float(res)
        return updated

    async def get_leaderboard_top(self, limit: int = 20) -> List[Tuple[str, int]]:
        if self._client is not None and not self._using_memory:
            rows = await self._run_with_timeout(
                self._client.zrevrange(LEADERBOARD_KEY, 0, limit - 1, withscores=True)
            )
            if rows is not None:
                return [(str(uid), int(score)) for uid, score in rows]
        sorted_items = sorted(self._memory_zset.items(), key=lambda item: item[1], reverse=True)
        return [(uid, int(score)) for uid, score in sorted_items[:limit]]

    async def get_user_rank(self, user_id: str) -> Optional[int]:
        if self._client is not None and not self._using_memory:
            rank = await self._run_with_timeout(self._client.zrevrank(LEADERBOARD_KEY, user_id))
            if rank is not None:
                return int(rank) + 1
        sorted_ids = [
            uid for uid, _ in sorted(self._memory_zset.items(), key=lambda item: item[1], reverse=True)
        ]
        if user_id not in sorted_ids:
            return None
        return sorted_ids.index(user_id) + 1

    async def set_json(self, key: str, payload: Dict[str, Any], ttl_seconds: int) -> None:
        serialized = json.dumps(payload)
        self._memory_kv[key] = (serialized, time.monotonic() + ttl_seconds)
        if self._client is not None and not self._using_memory:
            await self._run_with_timeout(self._client.setex(key, ttl_seconds, serialized))

    async def get_json(self, key: str) -> Optional[Dict[str, Any]]:
        if self._client is not None and not self._using_memory:
            raw = await self._run_with_timeout(self._client.get(key))
            if raw:
                try:
                    return json.loads(raw)
                except Exception:
                    return None
        entry = self._memory_kv.get(key)
        if not entry:
            return None
        raw_mem, expires_at = entry
        if time.monotonic() > expires_at:
            self._memory_kv.pop(key, None)
            return None
        return json.loads(raw_mem)

    async def delete_key(self, key: str) -> None:
        self._memory_kv.pop(key, None)
        if self._client is not None and not self._using_memory:
            await self._run_with_timeout(self._client.delete(key))

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
