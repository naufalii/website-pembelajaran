from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from typing import Any, Dict, Tuple
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings

IS_VERCEL = bool(os.getenv("VERCEL"))


class Base(DeclarativeBase):
    pass


def build_async_engine_kwargs(raw_url: str) -> Tuple[str, Dict[str, Any]]:
    """
    Normalize DATABASE_URL for asyncpg (Neon SSL + Supabase PgBouncer) or SQLite dev fallback.
    asyncpg rejects query params like `sslmode` and `channel_binding` in the DSN.
    """
    url = raw_url.strip()
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://") :]
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = "postgresql+asyncpg://" + url[len("postgresql://") :]

    connect_args: Dict[str, Any] = {}
    if url.startswith("postgresql+asyncpg://"):
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        query_params = parse_qs(parsed.query)
        sslmode = query_params.pop("sslmode", [None])[0]
        query_params.pop("channel_binding", None)
        if sslmode and sslmode != "disable":
            connect_args["ssl"] = "require"
        elif sslmode is None and (
            "pooler.supabase.com" in hostname
            or "supabase.co" in hostname
            or "neon.tech" in hostname
        ):
            connect_args["ssl"] = "require"
        if "pooler.supabase.com" in hostname:
            # Supabase PgBouncer transaction pooler does not support prepared statements
            connect_args["statement_cache_size"] = 0
        cleaned_query = urlencode(query_params, doseq=True)
        url = urlunparse(parsed._replace(query=cleaned_query))
    elif url.startswith("sqlite"):
        if IS_VERCEL and "./" in url:
            # Filesystem Vercel read-only kecuali /tmp bila DATABASE_URL belum disetel
            url = "sqlite+aiosqlite:////tmp/fokussprints_dev.db"
        connect_args["check_same_thread"] = False

    return url, connect_args


_db_url, _connect_args = build_async_engine_kwargs(settings.DATABASE_URL)

_engine_kwargs: Dict[str, Any] = {
    "echo": False,
    "connect_args": _connect_args,
}

if IS_VERCEL:
    # Hindari koneksi pool menggantung ("Event loop is closed") pada Python Serverless Vercel
    _engine_kwargs["poolclass"] = NullPool
else:
    _engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(_db_url, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
