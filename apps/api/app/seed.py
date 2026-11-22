from __future__ import annotations

import asyncio

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import hash_password
from app.models.tables import User
from app.services.redis_service import redis_service

DEFAULT_USER_ID = "11111111-1111-4111-8111-111111111100"


async def seed_database(db: AsyncSession) -> None:
    """
    Inisialisasi database bersih tanpa data dummy.
    Hanya memastikan minimal ada 1 akun lokal kosong (0 XP, Level 1, 0 Streak)
    agar endpoint autentikasi & profil siap dipakai saat baru dijalankan.
    """
    user_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    if user_count and user_count > 0:
        users = (await db.execute(select(User))).scalars().all()
        for u in users:
            if u.xp > 0:
                await redis_service.set_leaderboard_score(u.id, u.xp)
        return

    clean_user = User(
        id=DEFAULT_USER_ID,
        email="akun@fokussprints.id",
        full_name="Pengguna FokusSprints",
        password_hash=hash_password("fokussprints123"),
        avatar_seed="fokus",
        xp=0,
        level=1,
        current_streak=0,
        longest_streak=0,
    )
    db.add(clean_user)
    await db.commit()


async def init_db_and_seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await seed_database(db)


if __name__ == "__main__":
    async def _cli_main() -> None:
        await redis_service.connect()
        await init_db_and_seed()
        await redis_service.close()
        print("FokusSprints clean database initialized successfully (zero dummy data).")

    asyncio.run(_cli_main())
