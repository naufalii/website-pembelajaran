from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt

from app.core.config import settings


def hash_password(plain_password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": user_id,
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return decoded
    except jwt.PyJWTError:
        return None


def compute_level_bounds(xp: int) -> tuple[int, int, int]:
    """
    Hitung level dari total XP (400 XP per level secara konsisten sehingga
    1.450 XP berada pada Level 5 dengan rentang 1.200 -> 2.000?
    Catatan: Kita kalibrasi agar 1.450 XP tampil sebagai Lv. 5 dengan batas 2.000 XP,
    sejalan dengan visual dashboard: Lv 1 (0-400), Lv 2 (400-800), Lv 3 (800-1200),
    Lv 4 (1200-1400? Atau 400 per level: 0, 350, 700, 1050, 1400 -> 2000).
    Mari gunakan tangga progres yang jelas dan konsisten:
    Lv 1: 0 - 300
    Lv 2: 300 - 650
    Lv 3: 650 - 1000
    Lv 4: 1000 - 1400
    Lv 5: 1400 - 2000
    Lv >= 6: setiap +750 XP naik 1 level.
    """
    thresholds = [0, 300, 650, 1000, 1400, 2000]
    for idx in range(len(thresholds) - 1):
        floor_xp = thresholds[idx]
        next_xp = thresholds[idx + 1]
        if xp < next_xp:
            return idx + 1, floor_xp, next_xp

    extra = xp - 2000
    step = 750
    offset_level = extra // step
    level = 6 + offset_level
    floor_xp = 2000 + offset_level * step
    next_xp = floor_xp + step
    return level, floor_xp, next_xp
