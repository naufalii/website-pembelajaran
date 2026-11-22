"""
Skrip seeder idempoten untuk modul starter production-ready FokusSprints:
"Fundamental Pemrograman Python & Logika Dasar".

Cara menjalankan dari direktori `apps/api`:
    python scripts/seed_starter_course.py
(atau menggunakan virtualenv lokal):
    .\\.venv\\Scripts\\python.exe scripts/seed_starter_course.py

Guardrails:
- Membaca `DATABASE_URL` dari `apps/api/.env` via `app.core.config.settings`.
- Tidak pernah menjalankan DROP TABLE, menghapus data lama, atau menimpa akun user.
- Sepenuhnya idempoten: aman dijalankan berulang kali tanpa membuat duplikasi.
"""

from __future__ import annotations

import asyncio
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, TypedDict
from uuid import uuid4

# Pastikan `apps/api` ada di sys.path dan cwd agar `.env` & modul `app.*` selalu ditemukan
API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))
os.chdir(API_ROOT)

from pydantic import TypeAdapter  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.core.database import AsyncSessionLocal, Base, engine  # noqa: E402
from app.domains.quizzes.schemas import QuestionPayloadUnion  # noqa: E402
from app.models.tables import Course, DailyQuest, Lesson, Quiz, User  # noqa: E402

# ---------------------------------------------------------------------------
# KONSTANTA URL VIDEO YOUTUBE EDUKATIF (mudah diganti sewaktu-waktu)
# Mendukung format youtube.com/embed/..., youtube.com/watch?v=..., atau youtu.be/...
# Seluruh tautan di bawah adalah materi Python Dasar Bahasa Indonesia (Kelas Terbuka).
# ---------------------------------------------------------------------------
STARTER_VIDEO_URLS: Dict[int, str] = {
    1: "https://www.youtube.com/embed/gxmTFXfrMzk",  # Mengenal Variabel & Dasar Memori
    2: "https://www.youtube.com/embed/rF8rh40z_X0",  # IF dan ELSE Statement
    3: "https://www.youtube.com/embed/ZupffvoCChQ",  # While Loop (Perulangan)
    4: "https://www.youtube.com/embed/ywE2eqG3-kc",  # Pengenalan Fungsi (Function)
}


class CourseSeedSpec(TypedDict):
    slug: str
    title: str
    description: str
    category: str
    difficulty: str
    estimated_minutes: int
    is_published: bool


class LessonSeedSpec(TypedDict):
    order_index: int
    title: str
    duration_seconds: int
    summary: str
    transcript: str


class QuizSeedSpec(TypedDict):
    lesson_order: int
    checkpoint_id: str
    checkpoint_title: str
    checkpoint_seconds: int
    title: str
    xp_reward: int
    question_payload: Dict[str, Any]


class QuestSeedSpec(TypedDict):
    quest_code: str
    title: str
    description: str
    xp_reward: int
    target_count: int


STARTER_COURSE: CourseSeedSpec = {
    "slug": "fundamental-pemrograman-python-logika-dasar",
    "title": "Fundamental Pemrograman Python & Logika Dasar",
    "description": (
        "Kuasai pondasi pemrograman Python dari nol secara terstruktur: mulai dari "
        "variabel dan tipe data, percabangan if-elif-else, perulangan for dan while, "
        "hingga merancang fungsi yang rapi dan mudah dipakai ulang."
    ),
    "category": "Pemrograman Dasar",
    "difficulty": "Pemula",
    "estimated_minutes": 24,
    "is_published": True,
}


STARTER_LESSONS: List[LessonSeedSpec] = [
    {
        "order_index": 1,
        "title": "Variabel, Tipe Data, dan Cara Kerja Memori Dasar",
        "duration_seconds": 300,
        "summary": (
            "Poin inti: (1) Variabel adalah label yang merujuk ke objek nilai di memori; "
            "(2) Python menerapkan dynamic typing untuk tipe dasar int, float, str, dan bool; "
            "(3) Gunakan penamaan snake_case yang jelas dan jangan diawali angka."
        ),
        "transcript": (
            "Di Python, variabel bekerja seperti label nama yang menempel pada sebuah nilai di memori, "
            "bukan kotak kaku bertipe tetap. Kamu bisa langsung menulis nama = 'Budi' atau skor = 9.5 "
            "tanpa mendeklarasikan tipe datanya terlebih dahulu karena Python memakai dynamic typing. "
            "Empat tipe data dasar yang paling sering kamu temui adalah int untuk bilangan bulat, "
            "float untuk bilangan desimal, str untuk teks, dan bool untuk nilai logika True atau False. "
            "Kamu selalu bisa memeriksa tipe sebuah variabel kapan saja dengan fungsi bawaan type(), "
            "serta biasakan memakai format snake_case agar kode mudah dibaca kembali."
        ),
    },
    {
        "order_index": 2,
        "title": "Percabangan Logika dengan If, Elif, dan Else",
        "duration_seconds": 360,
        "summary": (
            "Poin inti: (1) Blok if-elif-else memeriksa kondisi berurutan dari atas ke bawah "
            "dan hanya menjalankan cabang pertama yang True; (2) Indentasi 4 spasi menentukan "
            "isi blok kode; (3) Gunakan == untuk perbandingan nilai dan = untuk assignment."
        ),
        "transcript": (
            "Program yang cerdas perlu mampu mengambil keputusan berdasarkan kondisi tertentu. "
            "Python menyediakan struktur if, elif, dan else untuk mengatur alur percabangan tersebut. "
            "Setiap kondisi dievaluasi dari atas ke bawah memakai operator perbandingan seperti ==, !=, "
            ">, atau <, serta operator logika and, or, dan not. Begitu satu cabang bernilai True, "
            "blok kode berindentasi di dalamnya langsung dijalankan dan cabang elif maupun else di "
            "bawahnya akan dilewati. Karena itu, susun syarat dari kondisi paling spesifik ke paling umum."
        ),
    },
    {
        "order_index": 3,
        "title": "Perulangan Efisien Menggunakan For dan While Loop",
        "duration_seconds": 360,
        "summary": (
            "Poin inti: (1) Pilih for loop saat jumlah iterasi jelas atau menelusuri koleksi data; "
            "(2) Pilih while loop saat berhenti berdasarkan kondisi dinamis; (3) Selalu perbarui "
            "variabel kontrol untuk mencegah infinite loop serta manfaatkan break dan continue."
        ),
        "transcript": (
            "Ketika kamu perlu mengulang tugas yang sama berkali-kali, perulangan atau loop membuat kode "
            "jauh lebih ringkas. Gunakan for loop bersama fungsi range(start, stop) atau koleksi data "
            "seperti list dan string saat banyaknya langkah sudah jelas. Perlu diingat bahwa batas akhir "
            "pada range() tidak ikut disertakan. Sementara itu, gunakan while loop ketika perulangan "
            "terus berjalan selama sebuah kondisi masih bernilai True. Pastikan kondisi berhenti selalu "
            "bisa tercapai agar program tidak terjebak infinite loop, dan gunakan break untuk keluar "
            "lebih cepat atau continue untuk melompati satu putaran."
        ),
    },
    {
        "order_index": 4,
        "title": "Membuat Fungsi (Function) yang Rapi dan Reusable",
        "duration_seconds": 420,
        "summary": (
            "Poin inti: (1) Kata kunci def membungkus logika ke dalam blok modular yang bisa dipakai ulang; "
            "(2) Parameter ditulis saat definisi fungsi sedangkan argumen dikirim saat pemanggilan; "
            "(3) Gunakan return agar hasil perhitungan bisa diolah kembali di luar fungsi."
        ),
        "transcript": (
            "Seiring bertambahnya baris kode, menuliskan logika yang sama berulang kali membuat program "
            "sulit dirawat. Dengan kata kunci def, kamu bisa membungkus satu tugas spesifik ke dalam "
            "fungsi yang rapi dan reusable. Variabel di dalam tanda kurung saat definisi disebut parameter, "
            "sedangkan nilai yang kamu kirim saat memanggil fungsi disebut argumen. Variabel yang dibuat "
            "di dalam fungsi bersifat lokal (local scope), sehingga tidak langsung terbaca dari luar. "
            "Bedakan pula print() yang sekadar mencetak ke layar dengan return yang mengembalikan nilai "
            "nyata agar bisa disimpan atau dihitung lagi oleh bagian program lain."
        ),
    },
]


STARTER_QUIZZES: List[QuizSeedSpec] = [
    # --- 3 SOAL PILIHAN GANDA 2x2 (multiple_choice) ---
    {
        "lesson_order": 1,
        "checkpoint_id": "py-m1-cp1",
        "checkpoint_title": "Tipe Data Otomatis",
        "checkpoint_seconds": 150,
        "title": "Identifikasi Tipe Data Desimal",
        "xp_reward": 20,
        "question_payload": {
            "type": "multiple_choice",
            "prompt": (
                "Jika kita menulis kode skor = 9.5 lalu memeriksanya dengan type(skor), "
                "tipe data apa yang dikembalikan Python?"
            ),
            "options": [
                {"id": "A", "text": "int (bilangan bulat)"},
                {"id": "B", "text": "float (bilangan desimal)"},
                {"id": "C", "text": "str (teks karakter)"},
                {"id": "D", "text": "bool (nilai benar atau salah)"},
            ],
            "correct_option_id": "B",
            "explanation": (
                "Angka yang memiliki titik desimal seperti 9.5 otomatis dikenali Python "
                "sebagai tipe float (floating-point number)."
            ),
        },
    },
    {
        "lesson_order": 2,
        "checkpoint_id": "py-m2-cp1",
        "checkpoint_title": "Urutan Cabang If-Elif",
        "checkpoint_seconds": 180,
        "title": "Alur Evaluasi Blok If dan Elif",
        "xp_reward": 20,
        "question_payload": {
            "type": "multiple_choice",
            "prompt": (
                "Untuk nilai = 85, hasil apa yang tampil jika urutan kode ditulis: "
                "if nilai >= 60: 'Lulus', lalu elif nilai >= 80: 'Sangat Baik'?"
            ),
            "options": [
                {"id": "A", "text": "'Sangat Baik' karena 85 lebih dekat ke 80"},
                {"id": "B", "text": "'Lulus' karena cabang pertama sudah bernilai True"},
                {"id": "C", "text": "Keduanya tampil secara bersamaan"},
                {"id": "D", "text": "Program berhenti dengan error sintaks"},
            ],
            "correct_option_id": "B",
            "explanation": (
                "Python memeriksa percabangan dari atas ke bawah. Begitu kondisi pertama "
                "(nilai >= 60) terpenuhi, cabang elif di bawahnya langsung dilewati."
            ),
        },
    },
    {
        "lesson_order": 3,
        "checkpoint_id": "py-m3-cp1",
        "checkpoint_title": "Batas Fungsi range()",
        "checkpoint_seconds": 180,
        "title": "Deret Angka pada For Loop",
        "xp_reward": 20,
        "question_payload": {
            "type": "multiple_choice",
            "prompt": (
                "Angka apa saja yang dihasilkan oleh perulangan for i in range(1, 5): "
                "di Python?"
            ),
            "options": [
                {"id": "A", "text": "1, 2, 3, 4, 5"},
                {"id": "B", "text": "0, 1, 2, 3, 4"},
                {"id": "C", "text": "1, 2, 3, 4"},
                {"id": "D", "text": "2, 3, 4, 5"},
            ],
            "correct_option_id": "C",
            "explanation": (
                "Fungsi range(start, stop) menyertakan batas awal (1) tetapi berhenti tepat "
                "sebelum batas akhir (5), sehingga menghasilkan 1, 2, 3, dan 4."
            ),
        },
    },
    # --- 3 SOAL BENAR / SALAH (true_false) ---
    {
        "lesson_order": 1,
        "checkpoint_id": "py-m1-cp2",
        "checkpoint_title": "Aturan Nama Variabel",
        "checkpoint_seconds": 240,
        "title": "Validitas Penamaan Variabel Python",
        "xp_reward": 15,
        "question_payload": {
            "type": "true_false",
            "statement": (
                "Di Python, nama variabel seperti 2_nilai_ujian diperbolehkan selama "
                "menggunakan garis bawah (_) sebagai pemisah kata."
            ),
            "is_true": False,
            "explanation": (
                "Salah. Nama variabel Python tidak boleh diawali angka; harus dimulai "
                "dengan huruf atau garis bawah (_), misalnya nilai_ujian_2."
            ),
        },
    },
    {
        "lesson_order": 2,
        "checkpoint_id": "py-m2-cp2",
        "checkpoint_title": "Operator = vs ==",
        "checkpoint_seconds": 270,
        "title": "Operator Perbandingan pada Kondisi If",
        "xp_reward": 15,
        "question_payload": {
            "type": "true_false",
            "statement": (
                "Di dalam kondisi percabangan if, tanda sama dengan tunggal (=) dipakai "
                "untuk mengecek apakah dua nilai sama persis."
            ),
            "is_true": False,
            "explanation": (
                "Salah. Tanda = digunakan untuk mengisi nilai ke variabel (assignment), "
                "sedangkan pengecekan kesamaan pada kondisi if wajib memakai tanda ganda (==)."
            ),
        },
    },
    {
        "lesson_order": 4,
        "checkpoint_id": "py-m4-cp1",
        "checkpoint_title": "print() vs return",
        "checkpoint_seconds": 210,
        "title": "Nilai Kembalian Fungsi Tanpa return",
        "xp_reward": 15,
        "question_payload": {
            "type": "true_false",
            "statement": (
                "Fungsi Python yang hanya menjalankan print() tanpa perintah return "
                "akan otomatis mengembalikan nilai None ke pemanggilnya."
            ),
            "is_true": True,
            "explanation": (
                "Benar. print() hanya menampilkan output ke layar. Tanpa return, "
                "Python secara bawaan mengembalikan objek None."
            ),
        },
    },
    # --- 3 SOAL FLASHCARD RECALL (flashcard_recall) ---
    {
        "lesson_order": 3,
        "checkpoint_id": "py-m3-cp2",
        "checkpoint_title": "Recall For vs While",
        "checkpoint_seconds": 280,
        "title": "Memilih For Loop atau While Loop",
        "xp_reward": 15,
        "question_payload": {
            "type": "flashcard_recall",
            "front_prompt": (
                "Kapan sebaiknya kamu memakai for loop dibandingkan while loop, dan apa "
                "risiko utama yang perlu diwaspadai pada while loop?"
            ),
            "back_answer": (
                "Pakai for loop saat jumlah iterasi sudah diketahui atau menelusuri koleksi data "
                "(list, string, range). Pakai while loop saat perulangan bergantung pada kondisi "
                "dinamis, dan pastikan variabel syarat diperbarui agar tidak terjadi infinite loop."
            ),
            "hint": "Bandingkan jumlah langkah yang pasti dengan syarat kondisi yang terus dicek.",
            "key_terms": ["for loop", "while loop", "infinite loop", "iterabel"],
        },
    },
    {
        "lesson_order": 4,
        "checkpoint_id": "py-m4-cp2",
        "checkpoint_title": "Recall Parameter vs Argumen",
        "checkpoint_seconds": 320,
        "title": "Membedakan Parameter dan Argumen",
        "xp_reward": 15,
        "question_payload": {
            "type": "flashcard_recall",
            "front_prompt": (
                "Apa perbedaan antara parameter dan argumen saat kamu mendefinisikan "
                "lalu memanggil sebuah fungsi di Python?"
            ),
            "back_answer": (
                "Parameter adalah variabel placeholder di dalam tanda kurung saat definisi fungsi "
                "(def sapa(nama):). Argumen adalah nilai nyata yang dikirim ketika fungsi itu "
                "dipanggil (sapa('Dina'))."
            ),
            "hint": "Satu berada di baris definisi def, satu lagi dikirim saat pemanggilan.",
            "key_terms": ["def", "parameter", "argumen", "reusable"],
        },
    },
    {
        "lesson_order": 4,
        "checkpoint_id": "py-m4-cp3",
        "checkpoint_title": "Recall Local Scope & Return",
        "checkpoint_seconds": 380,
        "title": "Ruang Lingkup Lokal dan Pengembalian Nilai",
        "xp_reward": 15,
        "question_payload": {
            "type": "flashcard_recall",
            "front_prompt": (
                "Mengapa variabel yang dibuat di dalam fungsi tidak bisa langsung dipakai "
                "di luar fungsi, dan bagaimana cara meneruskan hasilnya keluar?"
            ),
            "back_answer": (
                "Variabel di dalam fungsi berada pada local scope sehingga hanya hidup selama "
                "fungsi dijalankan. Gunakan kata kunci return untuk mengirim nilainya keluar lalu "
                "simpan ke variabel di bagian pemanggil."
            ),
            "hint": "Ingat konsep local scope dan kata kunci pengembali nilai fungsi.",
            "key_terms": ["local scope", "return", "modular", "fungsi"],
        },
    },
]


STARTER_DAILY_QUESTS: List[QuestSeedSpec] = [
    {
        "quest_code": "micro_video_finish",
        "title": "Tuntaskan 1 Video Mikro",
        "description": "Selesaikan 1 pelajaran video mikro hingga tuntas untuk meraih bonus XP.",
        "xp_reward": 50,
        "target_count": 1,
    },
    {
        "quest_code": "perfect_quiz",
        "title": "Selesaikan 3 Soal Kuis Kilat",
        "description": "Jawab tepat 3 soal dari Kuis Kilat atau checkpoint video hari ini.",
        "xp_reward": 75,
        "target_count": 3,
    },
    {
        "quest_code": "pomodoro_1",
        "title": "Selesaikan 1 Sesi Fokus Pomodoro",
        "description": "Jalankan timer fokus Pomodoro sampai selesai agar ritme belajar terjaga.",
        "xp_reward": 100,
        "target_count": 1,
    },
]


payload_validator = TypeAdapter(QuestionPayloadUnion)


async def seed_starter_course() -> None:
    stats: Dict[str, Dict[str, int]] = {
        "courses": {"created": 0, "updated": 0},
        "lessons": {"created": 0, "updated": 0},
        "quizzes": {"created": 0, "updated": 0},
        "quests": {"created": 0, "updated": 0},
    }
    quiz_type_counts: Counter[str] = Counter()

    # Validasi seluruh payload kuis terhadap Pydantic discriminated union sebelum menyentuh DB
    for quiz_spec in STARTER_QUIZZES:
        validated = payload_validator.validate_python(quiz_spec["question_payload"])
        quiz_type_counts[validated.type] += 1

    # Pastikan tabel tersedia tanpa pernah menghapus data atau struktur yang sudah ada
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Upsert Kursus Utama (cek berdasarkan slug)
        course = (
            await db.execute(select(Course).where(Course.slug == STARTER_COURSE["slug"]))
        ).scalar_one_or_none()

        if course is None:
            course = Course(
                id=str(uuid4()),
                slug=STARTER_COURSE["slug"],
                title=STARTER_COURSE["title"],
                description=STARTER_COURSE["description"],
                category=STARTER_COURSE["category"],
                difficulty=STARTER_COURSE["difficulty"],
                estimated_minutes=STARTER_COURSE["estimated_minutes"],
                is_published=STARTER_COURSE["is_published"],
            )
            db.add(course)
            await db.flush()
            stats["courses"]["created"] += 1
        else:
            course.title = STARTER_COURSE["title"]
            course.description = STARTER_COURSE["description"]
            course.category = STARTER_COURSE["category"]
            course.difficulty = STARTER_COURSE["difficulty"]
            course.estimated_minutes = STARTER_COURSE["estimated_minutes"]
            course.is_published = STARTER_COURSE["is_published"]
            stats["courses"]["updated"] += 1

        # 2. Upsert 4 Pelajaran Video Mikro (cek berdasarkan course_id + order_index)
        lessons_by_order: Dict[int, Lesson] = {}
        for lesson_spec in STARTER_LESSONS:
            order_idx = lesson_spec["order_index"]
            video_url = STARTER_VIDEO_URLS[order_idx]

            lesson = (
                await db.execute(
                    select(Lesson).where(
                        Lesson.course_id == course.id,
                        Lesson.order_index == order_idx,
                    )
                )
            ).scalar_one_or_none()

            if lesson is None:
                lesson = Lesson(
                    id=str(uuid4()),
                    course_id=course.id,
                    order_index=order_idx,
                    title=lesson_spec["title"],
                    summary=lesson_spec["summary"],
                    transcript=lesson_spec["transcript"],
                    video_url=video_url,
                    duration_seconds=lesson_spec["duration_seconds"],
                    checkpoints=[],
                )
                db.add(lesson)
                await db.flush()
                stats["lessons"]["created"] += 1
            else:
                lesson.title = lesson_spec["title"]
                lesson.summary = lesson_spec["summary"]
                lesson.transcript = lesson_spec["transcript"]
                lesson.video_url = video_url
                lesson.duration_seconds = lesson_spec["duration_seconds"]
                stats["lessons"]["updated"] += 1

            lessons_by_order[order_idx] = lesson

        # 3. Upsert 9 Soal Kuis Sprint & bangun daftar checkpoint per lesson
        checkpoints_by_order: Dict[int, List[Dict[str, Any]]] = {
            order_idx: [] for order_idx in lessons_by_order
        }

        for quiz_spec in STARTER_QUIZZES:
            target_lesson = lessons_by_order[quiz_spec["lesson_order"]]
            validated_payload = payload_validator.validate_python(quiz_spec["question_payload"])
            dumped_payload = validated_payload.model_dump()

            quiz = (
                await db.execute(
                    select(Quiz).where(
                        Quiz.lesson_id == target_lesson.id,
                        Quiz.title == quiz_spec["title"],
                    )
                )
            ).scalar_one_or_none()

            if quiz is None:
                quiz = Quiz(
                    id=str(uuid4()),
                    lesson_id=target_lesson.id,
                    title=quiz_spec["title"],
                    quiz_type=validated_payload.type,
                    xp_reward=quiz_spec["xp_reward"],
                    checkpoint_seconds=quiz_spec["checkpoint_seconds"],
                    question_payload=dumped_payload,
                )
                db.add(quiz)
                await db.flush()
                stats["quizzes"]["created"] += 1
            else:
                quiz.quiz_type = validated_payload.type
                quiz.xp_reward = quiz_spec["xp_reward"]
                quiz.checkpoint_seconds = quiz_spec["checkpoint_seconds"]
                quiz.question_payload = dumped_payload
                stats["quizzes"]["updated"] += 1

            checkpoints_by_order[quiz_spec["lesson_order"]].append(
                {
                    "id": quiz_spec["checkpoint_id"],
                    "at_seconds": quiz_spec["checkpoint_seconds"],
                    "title": quiz_spec["checkpoint_title"],
                    "quiz_id": quiz.id,
                }
            )

        # Tautkan checkpoints JSONB pada tiap lesson (diurutkan berdasarkan detik kemunculan)
        for order_idx, lesson in lessons_by_order.items():
            sorted_cps = sorted(
                checkpoints_by_order[order_idx],
                key=lambda item: int(item["at_seconds"]),
            )
            lesson.checkpoints = sorted_cps

        # 4. Upsert 3 Misi Harian (Daily Quests) untuk setiap user terdaftar tanpa mengubah profil user
        users = list((await db.execute(select(User))).scalars().all())
        quest_date_utc = datetime.now(timezone.utc).date()

        for user in users:
            for quest_spec in STARTER_DAILY_QUESTS:
                existing_quest = (
                    await db.execute(
                        select(DailyQuest).where(
                            DailyQuest.user_id == user.id,
                            DailyQuest.quest_code == quest_spec["quest_code"],
                            DailyQuest.quest_date == quest_date_utc,
                        )
                    )
                ).scalar_one_or_none()

                if existing_quest is None:
                    db.add(
                        DailyQuest(
                            id=str(uuid4()),
                            user_id=user.id,
                            quest_code=quest_spec["quest_code"],
                            title=quest_spec["title"],
                            description=quest_spec["description"],
                            xp_reward=quest_spec["xp_reward"],
                            target_count=quest_spec["target_count"],
                            current_count=0,
                            is_completed=False,
                            is_claimed=False,
                            quest_date=quest_date_utc,
                        )
                    )
                    stats["quests"]["created"] += 1
                else:
                    # Perbarui definisi misi tanpa mereset progres user yang sedang berjalan
                    existing_quest.title = quest_spec["title"]
                    existing_quest.description = quest_spec["description"]
                    existing_quest.xp_reward = quest_spec["xp_reward"]
                    existing_quest.target_count = quest_spec["target_count"]
                    if existing_quest.current_count >= existing_quest.target_count:
                        existing_quest.is_completed = True
                    stats["quests"]["updated"] += 1

        await db.commit()

    await engine.dispose()

    print("=" * 64)
    print("FokusSprints Starter Course Seeder — Ringkasan Eksekusi")
    print("=" * 64)
    print(f"Database dialect : {engine.dialect.name}")
    print(f"Tanggal misi UTC : {quest_date_utc.isoformat()} ({len(users)} pengguna terdaftar)")
    print("-" * 64)
    print(
        f"Courses          : {stats['courses']['created']} dibuat, "
        f"{stats['courses']['updated']} diperbarui"
    )
    print(
        f"Lessons          : {stats['lessons']['created']} dibuat, "
        f"{stats['lessons']['updated']} diperbarui"
    )
    print(
        f"Quizzes (total)  : {stats['quizzes']['created']} dibuat, "
        f"{stats['quizzes']['updated']} diperbarui"
    )
    print(
        "  - multiple_choice  : "
        f"{quiz_type_counts['multiple_choice']} soal"
    )
    print(
        "  - true_false       : "
        f"{quiz_type_counts['true_false']} soal"
    )
    print(
        "  - flashcard_recall : "
        f"{quiz_type_counts['flashcard_recall']} soal"
    )
    print(
        f"Daily Quests     : {stats['quests']['created']} dibuat, "
        f"{stats['quests']['updated']} diperbarui "
        f"({len(STARTER_DAILY_QUESTS)} misi x {len(users)} user)"
    )
    print("=" * 64)


if __name__ == "__main__":
    asyncio.run(seed_starter_course())
