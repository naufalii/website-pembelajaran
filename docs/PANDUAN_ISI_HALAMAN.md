# Panduan Pengisian Data & Pemetaan Halaman — FokusSprints

Dokumen ini menjadi panduan praktis untuk memahami **isi setiap halaman/widget**, **sumber data PostgreSQL & Redis**, serta **cara mengisi konten asli** baik langsung lewat antarmuka aplikasi maupun melalui **Swagger UI** (`http://127.0.0.1:8000/docs`).

> **Catatan Kondisi Awal:** Aplikasi dimulai dalam keadaan **bersih tanpa data dummy** (`0 XP`, `Level 1`, `0 Hari Streak`, akun awal `akun@fokussprints.id` dengan sandi `fokussprints123`). Seluruh widget menampilkan *Empty State* yang rapi sampai kamu mengisi konten pertama.

---

## Urutan Mengisi Konten Baru via Swagger UI (`http://127.0.0.1:8000/docs`)

Jika ingin mengisi kurikulum lengkap (Kursus → Kuis → Video Mikro), ikuti urutan berikut agar `course_id`, `lesson_id`, dan `quiz_id` saling terhubung:

1. Buat **Kursus** via `POST /api/v1/courses` → salin `id` kursus sebagai `course_id`.
2. Buat **Video Mikro** via `POST /api/v1/lessons` (awalnya dengan `checkpoints: []`) → salin `id` pelajaran sebagai `lesson_id`.
3. Buat **Kuis JSONB** via `POST /api/v1/quizzes` memakai `lesson_id` di atas → salin `id` kuis sebagai `quiz_id`.
4. *(Opsional)* Tambahkan `checkpoints` pada pelajaran berikutnya saat `POST /api/v1/lessons` jika sudah memiliki `quiz_id`.
5. Buat **Misi Harian** via `POST /api/v1/gamification/quests`.

---

## 1. Global Shell (Tampil di Semua 5 Rute)

### A. Left Navigation Sidebar & Bottom-Left Docked User Card
- **Isinya apa:** Logo & nama **FokusSprints**, 5 tombol navigasi halaman (`Beranda & Belajar`, `Kuis & Sprint`, `AI Upload PDF`, `Leaderboard`, `Lencana & Profil`), serta kartu profil ringkas di kiri bawah berisi Avatar inisial, Nama, Level, total XP, dan bar progres level.
- **Sumber Data:** Tabel PostgreSQL `users` → `GET /api/v1/progress/dashboard` (`user`) atau `GET /api/v1/auth/me`.
- **Cara Mengisinya:**
  - Lewat UI: Buka halaman `/profil`, klik tab **Daftar** untuk membuat akun baru (`POST /api/v1/auth/register`) atau tab **Masuk** (`POST /api/v1/auth/login`).
  - Lewat Swagger UI (`POST /api/v1/auth/register`):
    ```json
    {
      "full_name": "Nadia Kusuma",
      "email": "nadia@kampus.ac.id",
      "password": "passwordkuat123"
    }
    ```

### B. Top Greeting & Focus Status Bar
- **Isinya apa:** Sapaan `"Selamat Belajar, [Nama Depan]!"`, badge pill **Streak** (`X Hari Streak`), dan tombol **`Mulai Fokus 25:00`** (berubah menjadi badge **`FOCUS MODE AKTIF • 2x XP`** + countdown live saat timer berjalan).
- **Sumber Data:**
  - Nama & Streak: tabel `users` (`GET /api/v1/progress/dashboard`).
  - Sesi Focus Mode & 2x XP Multiplier: tabel `focus_sessions` + Redis key `focus:session:{userId}` (`POST /api/v1/gamification/focus/start`, `POST /api/v1/gamification/focus/{session_id}/violation`, `POST /api/v1/gamification/focus/{session_id}/complete`).
- **Cara Mengisinya:**
  - Lewat UI: Klik tombol **`Mulai Fokus 25:00`** di header atas atau tombol **`Mulai Sprint`** pada panel Pomodoro. Pindah ke tab browser lain saat Focus Mode aktif untuk menguji modal peringatan `#E05A47` dan pemutusan bonus `2x XP`.

### C. Panel Chat AI Tutor (Floating & Collapsible)
- **Isinya apa:** Asisten belajar percakapan bebas *multi-turn* dengan balasan format **Markdown** (daftar poin, teks tebal, blok kode), indikator status provider (`AI Live: Gemini`, `AI Live: OpenAI`, atau `Mode Offline/Fallback - Pasang API Key`), tombol **Perbesar/Perkecil**, dan tombol **Reset Obrolan**.
- **Sumber Data:** Endpoint `POST /api/v1/lessons/ai/tutor` (mengirim `message`, `history`, `lesson_context`, dan opsional `lesson_id`).
- **Cara Mengisinya:**
  - Lewat UI: Klik tombol mengambang **`AI Tutor`** di pojok kanan bawah atau di kartu Pomodoro. Untuk mengaktifkan respons generatif penuh, isi `GEMINI_API_KEY` (`gemini-2.5-flash`) atau `OPENAI_API_KEY` di `apps/api/.env`.
  - Lewat Swagger UI (`POST /api/v1/lessons/ai/tutor`):
    ```json
    {
      "message": "Jelaskan teknik Active Recall dan buatkan 1 contoh latihan singkatnya.",
      "history": [
        { "role": "user", "content": "Halo AI Tutor, aku sedang belajar persiapan ujian." },
        { "role": "assistant", "content": "Halo! Tentu, topik apa yang ingin kita bahas hari ini?" }
      ],
      "lesson_context": null
    }
    ```

---

## 2. Halaman `/` (`Beranda & Belajar` — Bento Dashboard)

### Widget 2.1 — Core Learning Card: Tab `Video Mikro`
- **Isinya apa:** Judul kursus aktif, pemutar video mikro interaktif berdurasi 4–5 menit, teks transkrip tersinkronisasi, timeline dengan pin **checkpoint emas**, fitur *auto-pause* di detik checkpoint yang memunculkan kuis kilat 2x2, tombol **`Uji Checkpoint Kuis`**, dan ringkasan materi.
- **Sumber Data:** Tabel `courses`, `lessons` (kolom `checkpoints` bertipe `JSONB`), `lesson_progress`, dan `quizzes` → `GET /api/v1/progress/dashboard` (`active_course`), `GET /api/v1/quizzes`, serta `POST /api/v1/lessons/{lesson_id}/progress`.
- **Cara Mengisinya (via Swagger UI):**
  1. Buat kursus di `POST /api/v1/courses`:
     ```json
     {
       "slug": "dasar-sistem-terdistribusi",
       "title": "Dasar Sistem Terdistribusi",
       "description": "Pahami konsistensi data, caching Redis, dan replikasi database dalam modul mikro.",
       "category": "Arsitektur Perangkat Lunak",
       "difficulty": "Menengah",
       "estimated_minutes": 12,
       "is_published": true
     }
     ```
  2. Buat video mikro di `POST /api/v1/lessons` (ganti `COURSE_UUID` dengan `id` dari langkah 1, dan isi `QUIZ_UUID` setelah membuat kuis di Widget 2.2):
     ```json
     {
       "course_id": "COURSE_UUID",
       "order_index": 1,
       "title": "Pola Cache-Aside dengan Redis",
       "summary": "Cara mempercepat pembacaan database menggunakan Redis cache dan invalidasi TTL.",
       "transcript": "Aplikasi modern membaca cache Redis terlebih dahulu sebelum menyentuh database utama. Jika data tidak ditemukan (cache miss), backend mengambil dari PostgreSQL lalu menyimpannya ke Redis dengan TTL tertentu.",
       "video_url": null,
       "duration_seconds": 240,
       "checkpoints": [
         {
           "id": "cp-1",
           "at_seconds": 60,
           "title": "Checkpoint 1: Cache Miss",
           "quiz_id": "QUIZ_UUID"
         }
       ]
     }
     ```

### Widget 2.2 — Core Learning Card: Tab `Kuis Kilat Harian`
- **Isinya apa:** Tampilan kuis interaktif lengkap dengan maskot mini, pertanyaan tegas, grid jawaban 2x2 Neobrutalist (atau Benar/Salah / Flashcard Recall), tombol **`Kunci Jawaban`**, dan tombol **`Lewati`**.
- **Sumber Data:** Tabel `quizzes` (kolom **`question_payload` bertipe `JSONB`**) & `quiz_attempts` → `GET /api/v1/progress/dashboard` (`daily_quiz`) & `POST /api/v1/quizzes/{quiz_id}/submit`.
- **Cara Mengisinya (via Swagger UI `POST /api/v1/quizzes` — 3 Format `JSONB`):**
  - **Format 1 (`multiple_choice` — Grid 2x2):**
    ```json
    {
      "lesson_id": "LESSON_UUID_ATAU_NULL",
      "title": "Kuis Kilat: Strategi Cache-Aside",
      "xp_reward": 15,
      "checkpoint_seconds": 60,
      "question_payload": {
        "type": "multiple_choice",
        "prompt": "Apa yang dilakukan backend saat terjadi cache miss pada pola Cache-Aside?",
        "options": [
          { "id": "A", "text": "Mengembalikan error 500 langsung ke pengguna" },
          { "id": "B", "text": "Mengambil data dari database lalu menyimpannya ke Redis dengan TTL" },
          { "id": "C", "text": "Menghapus seluruh tabel PostgreSQL" },
          { "id": "D", "text": "Menunggu cron job malam hari" }
        ],
        "correct_option_id": "B",
        "explanation": "Saat cache miss, aplikasi membaca sumber kebenaran di PostgreSQL dan mengisi ulang Redis dengan TTL."
      }
    }
    ```
  - **Format 2 (`true_false` — Benar / Salah):**
    ```json
    {
      "lesson_id": null,
      "title": "Cek Pemahaman: TTL Redis",
      "xp_reward": 15,
      "checkpoint_seconds": null,
      "question_payload": {
        "type": "true_false",
        "statement": "TTL (Time-To-Live) pada Redis berfungsi menghapus key cache usang secara otomatis setelah durasi tertentu.",
        "is_true": true,
        "explanation": "Benar! TTL mencegah data cache bertahan selamanya ketika data utama berubah."
      }
    }
    ```
  - **Format 3 (`flashcard_recall` — Uji Ingatan Mandiri):**
    ```json
    {
      "lesson_id": null,
      "title": "Recall Cepat: Teknik Active Recall",
      "xp_reward": 20,
      "checkpoint_seconds": null,
      "question_payload": {
        "type": "flashcard_recall",
        "front_prompt": "Mengapa menguji diri sendiri lebih efektif daripada membaca ulang catatan?",
        "back_answer": "Penarikan aktif memaksa jalur sinaptik otak bekerja membangun ulang memori sehingga retensi jangka panjang meningkat tajam.",
        "hint": "Ingat kata kunci: penarikan aktif tanpa melihat catatan.",
        "key_terms": ["Sinaptik", "Retensi", "Active Recall"]
      }
    }
    ```

### Widget 2.3 — Pomodoro Focus Engine
- **Isinya apa:** Timer digital *tabular numerals* (`25:00`), preset durasi (`Fokus 25:00`, `Rehat 05:00`, `Uji 00:10`), kontrol Mulai/Jeda/Reset, dan pintasan `AI Tutor`.
- **Sumber Data:** Client state Zustand (`focus-store.ts`) + tabel PostgreSQL `focus_sessions` + Redis `focus:session:{userId}` (`POST /api/v1/gamification/focus/start` & `/complete`).
- **Cara Mengisinya:** Langsung klik **`Mulai Sprint`** (atau pilih preset **`Uji 00:10`** untuk simulasi penyelesaian sesi cepat yang langsung memberi XP dan mencatat statistik fokus).

### Widget 2.4 — Alur Belajar Sesi Ini
- **Isinya apa:** Kartu pilihan urutan video mikro di dalam kursus aktif beserta durasi, jumlah checkpoint, dan status selesai.
- **Sumber Data:** Tabel `lessons` + `lesson_progress` dari `GET /api/v1/progress/dashboard` (`active_course.lessons`).
- **Cara Mengisinya:** Tambahkan 1 atau lebih pelajaran ke kursus yang sama lewat `POST /api/v1/lessons` (lihat contoh JSON pada Widget 2.1 dengan `order_index: 1, 2, 3`).

### Widget 2.5 — XP Progress Ring
- **Isinya apa:** Cincin progres SVG animasi menampilkan XP saat ini vs target level berikutnya (misal `0 / 300 XP` pada `Lv. 1`) dan sisa XP menuju naik level.
- **Sumber Data:** Tabel `users` (`xp`, `level`) dari `GET /api/v1/progress/dashboard`.
- **Cara Mengisinya:** Otomatis bertambah saat pengguna menyelesaikan kuis (`POST /api/v1/quizzes/{id}/submit`), menuntaskan sesi Pomodoro (`+35 XP` atau `+70 XP` saat 2x aktif), menuntaskan video (`+25 XP`), atau mengklaim Misi Harian.

### Widget 2.6 — Streak & Progres Mingguan
- **Isinya apa:** Grid kalender 21 hari berlabel kolom `S S R K J S M` yang menyorot hari aktif dengan ikon centang/api emas.
- **Sumber Data:** Tabel `user_streaks` → `GET /api/v1/progress/dashboard` (`streak_calendar`) & `GET /api/v1/progress/streaks`.
- **Cara Mengisinya:** Otomatis terisi untuk tanggal hari ini setiap kali pengguna meraih XP dari kuis, Pomodoro, atau video mikro.

### Widget 2.7 — Leaderboard (Mini Podium)
- **Isinya apa:** Visual podium 3 tingkat (#1 warna Sand Gold, #2 & #3 warna Forest/Sage) untuk 3 peraih XP tertinggi minggu ini.
- **Sumber Data:** Redis Sorted Set `leaderboard:weekly` (`ZSET`) + tabel `users` → `GET /api/v1/progress/dashboard` (`leaderboard_top`). Hanya menampilkan pengguna dengan `xp > 0`.
- **Cara Mengisinya:** Otomatis terisi ketika satu atau lebih pengguna (bisa dibuat via `/profil` atau `POST /api/v1/auth/register`) mulai mengumpulkan XP dari kuis atau Pomodoro.

### Widget 2.8 — Misi Harian
- **Isinya apa:** Daftar checklist target harian beserta progres (`current_count / target_count`), nominal hadiah XP, dan tombol **`Klaim XP`** saat target terpenuhi.
- **Sumber Data:** Tabel `daily_quests` → `GET /api/v1/progress/dashboard` (`daily_quests`), `GET /api/v1/gamification/quests`, `POST /api/v1/gamification/quests`, dan `POST /api/v1/gamification/quests/{quest_id}/claim`.
- **Cara Mengisinya (via Swagger UI `POST /api/v1/gamification/quests`):**
  Gunakan `quest_code` standar agar progresnya terupdate otomatis oleh sistem (`pomodoro_1`, `perfect_quiz`, `zero_distraction`, atau `micro_video_finish`):
  ```json
  {
    "quest_code": "pomodoro_1",
    "title": "Selesaikan 1 Sesi Pomodoro",
    "description": "Jalankan timer Deep-Focus 25 menit hingga tuntas.",
    "xp_reward": 50,
    "target_count": 1
  }
  ```
  Contoh misi kedua (otomatis terisi saat menjawab kuis benar):
  ```json
  {
    "quest_code": "perfect_quiz",
    "title": "Jawab Benar 2 Kuis Kilat",
    "description": "Raih jawaban tepat pada 2 soal kuis hari ini.",
    "xp_reward": 100,
    "target_count": 2
  }
  ```

---

## 3. Halaman `/kuis` (`Kuis & Sprint`)

- **Isinya apa:**
  1. Filter tipe kuis (`Semua Kuis`, `Pilihan Ganda 2x2`, `Benar / Salah`, `Flashcard Recall`).
  2. Runner kuis interaktif penuh di sebelah kiri + daftar antrean `Daftar Kuis Cepat` di kanan.
  3. Seksi bawah `Modul Micro-Learning Tersedia` berisi kartu katalog seluruh kursus.
- **Sumber Data:**
  - Daftar kuis: tabel `quizzes` → `GET /api/v1/quizzes?quiz_type=...`
  - Daftar kursus: tabel `courses` → `GET /api/v1/courses`
- **Cara Mengisinya:**
  - Kuis: `POST /api/v1/quizzes` (gunakan salah satu dari 3 format JSONB di Widget 2.2).
  - Katalog Kursus: `POST /api/v1/courses` (lihat JSON pada Widget 2.1).

---

## 4. Halaman `/ai-upload` (`AI Upload PDF`)

- **Isinya apa:**
  1. Panel kiri: Form unggah berkas **PDF / TXT** (*drag-and-drop*) atau tab **Tempel Catatan**, plus daftar `Dokumen Tersimpan`.
  2. Panel kanan: **Ringkasan Poin AI**, **Dek 3D Flashcard Interaktif** (kartu Warm Cream yang bisa di-flip 3D), dan **Kuis Otomatis dari Dokumen**.
- **Sumber Data:** Tabel PostgreSQL `ai_documents` → `GET /api/v1/lessons/ai/documents` & `POST /api/v1/lessons/ai/documents`.
- **Cara Mengisinya:**
  - **Paling Mudah Langsung dari UI:** Buka menu `AI Upload PDF`, pilih file `.pdf`/`.txt` atau klik tab **Tempel Catatan** (bisa klik **`Isi Contoh Catatan`** atau tempel catatan kuliahmu sendiri), lalu klik **`Hasilkan Ringkasan & Flashcard`**.
  - **Via Swagger UI (`POST /api/v1/lessons/ai/documents` dengan `application/json`):**
    ```json
    {
      "title": "Catatan Struktur Data Tree",
      "text": "Binary Search Tree (BST) menjaga aturan bahwa seluruh node di sub-pohon kiri lebih kecil dari root dan seluruh node di sub-pohon kanan lebih besar dari root. Operasi pencarian rata-rata berjalan dalam kompleksitas O(log n) bila pohon seimbang."
    }
    ```

---

## 5. Halaman `/leaderboard` (`Leaderboard`)

- **Isinya apa:** Badge peringkat pengguna aktif, badge status engine (`Redis ZSET Live` / `ZSET Engine`), **Podium 3 Besar Minggu Ini**, dan tabel peringkat seluruh peserta lengkap dengan level, jumlah hari streak, dan total XP.
- **Sumber Data:** Redis Sorted Set `leaderboard:weekly` (`ZREVRANGE ... WITHSCORES`) yang disinkronkan dengan tabel PostgreSQL `users` → `GET /api/v1/gamification/leaderboard`.
- **Cara Mengisinya:**
  - Tidak ada input manual terpisah; peringkat otomatis bertambah setiap kali pengguna login/daftar lalu meraih XP melalui:
    - Menjawab benar kuis (`POST /api/v1/quizzes/{id}/submit`)
    - Menyelesaikan sesi Pomodoro (`POST /api/v1/gamification/focus/{id}/complete`)
    - Mengklaim Misi Harian (`POST /api/v1/gamification/quests/{id}/claim`)
    - Menuntaskan video mikro (`POST /api/v1/lessons/{id}/progress`)

---

## 6. Halaman `/profil` (`Lencana & Profil`)

- **Isinya apa:**
  1. Kartu profil utama (Avatar, Nama, Level, Bar XP, dan 4 kartu statistik: `Sesi Pomodoro`, `Streak Aktif`, `Akurasi Kuis`, `Total Fokus`).
  2. Grid **Koleksi Lencana FokusSprints** (6 lencana dengan progres pembukaan otomatis).
  3. Kartu **Histori Kuis Terakhir** beserta pengali `1x`/`2x` XP.
  4. Kartu **Masuk / Daftar Akun Baru** berbasis JWT Auth.
- **Sumber Data:** Tabel `users`, `focus_sessions`, `quiz_attempts`, `ai_documents` → `GET /api/v1/progress/profile`, `POST /api/v1/auth/login`, `POST /api/v1/auth/register`.
- **Cara Mengisinya:**
  - **Akun:** Gunakan form **`Masuk`** (akun default bersih: `akun@fokussprints.id` / `fokussprints123`) atau klik tab **`Daftar`** langsung di halaman `/profil` untuk membuat akun baru.
  - **Statistik, Lencana & Histori:** Terisi otomatis secara akurat tanpa angka dummy ketika akun tersebut menyelesaikan kuis, sesi Pomodoro, streak harian, dan konversi dokumen AI.
