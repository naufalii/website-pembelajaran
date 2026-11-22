# FokusSprints — Platform Micro-Learning & Deep Focus

**FokusSprints** adalah aplikasi web full-stack *Gamified Micro-Learning & Deep-Focus Platform* bergaya visual **Dark Earthy Neobrutalism**, dibangun dengan arsitektur monorepo yang siap dijalankan lokal maupun di-deploy ke **Vercel** (`apps/web`), **Supabase / Neon PostgreSQL** (`apps/api` SQLAlchemy 2.0 Async + Alembic `JSONB`), dan **Upstash Redis** (`ZSET` leaderboard & TTL focus session).

---

## 1. Struktur Monorepo

```text
pembelajaran/
├── package.json                 # Workspace root (apps/web, packages/shared)
├── docker-compose.yml           # PostgreSQL 16 + Redis 7 lokal untuk development
├── vercel.json                  # Konfigurasi deployment monorepo Vercel
├── packages/
│   └── shared/                  # Skema Zod strict & tipe TypeScript bersama (@fokussprints/shared)
└── apps/
    ├── web/                     # Frontend: Next.js 15 App Router, Tailwind CSS, Radix UI Neobrutalism, TanStack Query, Zustand, Motion
    └── api/                     # Backend: FastAPI, SQLAlchemy 2.0 Async, Pydantic v2, Alembic, PyJWT, bcrypt, pypdf, Redis Async
```

### Domain Backend Modular (`apps/api/app/domains`)
1. `auth` (`/api/v1/auth`): Registrasi, login JWT, refresh token, dan profil pengguna aktif.
2. `courses` (`/api/v1/courses`): Daftar kursus dan detail kurikulum video mikro.
3. `lessons` (`/api/v1/lessons`): Pelacakan progres checkpoint video, AI Upload PDF/Catatan -> Ringkasan & 3D Flashcard, serta AI Tutor kontekstual.
4. `quizzes` (`/api/v1/quizzes`): Kuis dinamis berbasis PostgreSQL `JSONB` (*discriminated union*: `multiple_choice`, `true_false`, `flashcard_recall`) + pengali `2x XP` Focus Mode.
5. `progress` (`/api/v1/progress`): Agregasi Bento Dashboard, kalender streak, koleksi lencana, dan riwayat kuis.
6. `gamification` (`/api/v1/gamification`): Papan peringkat real-time Redis `ZSET`, Misi Harian (`claim XP`), dan pelacakan sesi Pomodoro + pelanggaran pindah tab.

---

## 2. Cara Menjalankan Lokal

### Opsi A — Tanpa Docker (SQLite & In-Memory ZSET Fallback Otomatis)
1. **Jalankan Backend FastAPI (`apps/api`):**
   ```powershell
   cd apps/api
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   copy .env.example .env
   python -m app.seed
   uvicorn app.main:app --reload --port 8000
   ```
   Buka Swagger UI di `http://127.0.0.1:8000/docs`.

2. **Jalankan Frontend Next.js (`apps/web`):**
   ```powershell
   cd ../..
   npm install
   copy apps\web\.env.example apps\web\.env.local
   npm run dev:web
   ```
   Buka `http://localhost:3000`.

### Opsi B — Dengan Docker (PostgreSQL 16 + Redis 7 Penuh)
1. Jalankan container DB & Cache dari root repo:
   ```bash
   docker compose up -d
   ```
2. Atur `apps/api/.env`:
   ```env
   DATABASE_URL=postgresql+asyncpg://fokussprints:fokussprints_dev_password@localhost:5432/fokussprints
   REDIS_URL=redis://localhost:6379/0
   ```
3. Jalankan migrasi Alembic, seeder, dan server API:
   ```powershell
   cd apps/api
   .\.venv\Scripts\alembic.exe upgrade head
   .\.venv\Scripts\python.exe -m app.seed
   .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
   ```

---

## 3. Panduan Deployment Production

### A. Database: Supabase / Neon PostgreSQL
1. Buat database baru di **Neon** (`ap-southeast-1`) atau **Supabase**.
2. Salin connection string PostgreSQL:
   - **Neon:** `postgresql+asyncpg://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`
   - **Supabase Transaction Pooler:** `postgresql+asyncpg://postgres.xxx:pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`
   *(Engine di `apps/api/app/core/database.py` otomatis menangani parameter SSL Neon dan `statement_cache_size=0` untuk PgBouncer Supabase).*
3. Jalankan migrasi & seeder dari terminal yang terhubung ke DB production:
   ```bash
   alembic upgrade head
   python -m app.seed
   ```

### B. Cache & Real-Time Leaderboard: Upstash Redis
1. Buat database Redis di **Upstash**.
2. Salin URL koneksi TLS `rediss://default:<token>@<endpoint>.upstash.io:6379` ke `REDIS_URL`.

### C. Backend API (`apps/api`)
Deploy folder `apps/api` ke Railway / Render / Fly.io dengan start command:
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
Set environment variables dari `apps/api/.env.example`:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET` (wajib acak & kuat)
- `CORS_ORIGINS=https://domain-vercel-anda.vercel.app`
- `GEMINI_API_KEY` atau `OPENAI_API_KEY` *(opsional; tanpa key pun fitur AI Upload & AI Tutor tetap bekerja menggunakan parser Bahasa Indonesia internal)*

### D. Frontend (`apps/web`) ke Vercel
1. Hubungkan repositori ke **Vercel** (root directory tetap di root monorepo; `vercel.json` sudah mengarahkan workspace ke `apps/web`).
2. Tambahkan Environment Variables di Vercel Project Settings:
   - `NEXT_PUBLIC_API_URL=https://url-backend-api-anda.com`
   - `NEXT_PUBLIC_DEMO_MODE=false` *(ubah ke `true` hanya bila ingin preview tanpa server API)*
3. Deploy — `npm --workspace apps/web run build` akan menghasilkan build Next.js production siap tayang.

---

## 4. Akun Awal & Panduan Isi Data
- **Akun Lokal Awal (0 XP, Level 1, 0 Streak):** `akun@fokussprints.id` | Sandi: `fokussprints123`
- **Panduan Lengkap Pengisian Data per Halaman & Contoh JSON Swagger:** Lihat [docs/PANDUAN_ISI_HALAMAN.md](docs/PANDUAN_ISI_HALAMAN.md).
