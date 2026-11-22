from __future__ import annotations

import sys
from pathlib import Path

# Pastikan root `apps/api` berada di sys.path agar import `app.main` selalu aman di runtime Vercel
API_ROOT = str(Path(__file__).resolve().parent.parent)
if API_ROOT not in sys.path:
    sys.path.insert(0, API_ROOT)

from app.main import app  # noqa: E402

__all__ = ["app"]
