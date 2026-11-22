from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any, Dict, Tuple
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


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
        query_params = parse_qs(parsed.query)
        sslmode = query_params.pop("sslmode", [None])[0]
        query_params.pop("channel_binding", None)
        if sslmode and sslmode != "disable":
            connect_args["ssl"] = "require"
        if "pooler.supabase.com" in (parsed.hostname or ""):
            # Supabase PgBouncer transaction pooler does not support prepared statements
            connect_args["statement_cache_size"] = 0
        cleaned_query = urlencode(query_params, doseq=True)
        url = urlunparse(parsed._replace(query=cleaned_query))
    elif url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    return url, connect_args


_db_url, _connect_args = build_async_engine_kwargs(settings.DATABASE_URL)

engine = create_async_engine(
    _db_url,
    echo=False,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
