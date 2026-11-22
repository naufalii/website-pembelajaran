from __future__ import annotations

import io
import json
import re
from typing import Any, Dict, List, Optional, Tuple

import httpx
from pypdf import PdfReader

from app.core.config import settings


def extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    """Ekstrak teks bersih dari berkas PDF menggunakan pypdf."""
    reader = PdfReader(io.BytesIO(file_bytes))
    chunks: List[str] = []
    for page in reader.pages[:25]:
        extracted = page.extract_text() or ""
        cleaned = re.sub(r"\s+", " ", extracted).strip()
        if cleaned:
            chunks.append(cleaned)
    return "\n\n".join(chunks).strip()


def _split_sentences(raw_text: str) -> List[str]:
    normalized = re.sub(r"\s+", " ", raw_text).strip()
    parts = re.split(r"(?<=[.!?])\s+", normalized)
    return [p.strip() for p in parts if len(p.strip()) >= 24]


def _extract_keywords(raw_text: str, limit: int = 8) -> List[str]:
    stopwords = {
        "yang", "untuk", "dengan", "dalam", "pada", "adalah", "dari", "atau", "juga",
        "akan", "dapat", "karena", "ketika", "sebagai", "tersebut", "lebih", "sangat",
        "antara", "melalui", "bukan", "hanya", "setiap", "secara", "bahwa", "sehingga",
        "this", "that", "with", "from", "into", "about", "which", "where", "there",
    }
    words = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ]{4,}", raw_text)
    freq: Dict[str, int] = {}
    canonical: Dict[str, str] = {}
    for w in words:
        low = w.lower()
        if low in stopwords:
            continue
        freq[low] = freq.get(low, 0) + 1
        if low not in canonical:
            canonical[low] = w.capitalize()
    ranked = sorted(freq.items(), key=lambda item: item[1], reverse=True)
    return [canonical[k] for k, _ in ranked[:limit]]


def _fallback_generate_study_pack(title: str, text: str) -> Dict[str, Any]:
    sentences = _split_sentences(text)
    if not sentences:
        sentences = [
            f"Materi {title} membahas konsep inti untuk mempercepat pemahaman dan retensi jangka panjang.",
            "Pembelajaran mikro memecah topik kompleks menjadi unit 4 sampai 5 menit yang terukur.",
            "Pengulangan aktif melalui flashcard dan kuis checkpoint memperkuat koneksi memori jangka panjang.",
        ]

    summary_bullets = sentences[:5]
    keywords = _extract_keywords(text, limit=6)
    if len(keywords) < 3:
        keywords = ["Konsep Inti", "Retensi Aktif", "Deep Focus", "Micro-Learning"]

    flashcards: List[Dict[str, str]] = []
    for idx in range(min(4, max(3, len(sentences)))):
        sentence = sentences[idx % len(sentences)]
        topic_word = keywords[idx % len(keywords)]
        flashcards.append(
            {
                "id": f"fc-{idx + 1}",
                "front": f"Apa inti konsep terkait '{topic_word}' pada materi {title}?",
                "back": sentence,
                "tag": topic_word,
            }
        )

    lead_sentence = sentences[0]
    kw0 = keywords[0]
    kw1 = keywords[1] if len(keywords) > 1 else "Pomodoro"
    kw2 = keywords[2] if len(keywords) > 2 else "Active Recall"

    generated_quizzes: List[Dict[str, Any]] = [
        {
            "type": "multiple_choice",
            "prompt": f"Berdasarkan catatan '{title}', pernyataan mana yang paling tepat menggambarkan fokus konsep '{kw0}'?",
            "options": [
                {"id": "A", "text": lead_sentence[:110]},
                {"id": "B", "text": f"Menghafal tanpa menguji pemahaman tentang {kw1}"},
                {"id": "C", "text": "Mengabaikan jeda istirahat dan belajar terus-menerus 4 jam"},
                {"id": "D", "text": f"Mengganti seluruh praktik {kw2} dengan membaca pasif"},
            ],
            "correct_option_id": "A",
            "explanation": f"Ringkasan utama materi menekankan: {lead_sentence}",
        },
        {
            "type": "true_false",
            "statement": f"Penerapan prinsip '{kw1}' dalam '{title}' membantu memperjelas pemahaman konsep inti secara terstruktur.",
            "is_true": True,
            "explanation": f"Benar! Konsep '{kw1}' muncul sebagai bagian penting dari inti materi yang dianalisis.",
        },
        {
            "type": "flashcard_recall",
            "front_prompt": f"Sebutkan definisi atau peran penting '{kw0}' dari materi yang baru kamu unggah!",
            "back_answer": lead_sentence,
            "hint": f"Ingat kata kunci: {kw0} & {kw1}",
            "key_terms": keywords[:4],
        },
    ]

    return {
        "summary_bullets": summary_bullets,
        "flashcards": flashcards,
        "generated_quizzes": generated_quizzes,
    }


async def _call_gemini_json(prompt_text: str) -> Optional[Dict[str, Any]]:
    if not settings.GEMINI_API_KEY.strip():
        return None
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY.strip()}"
    )
    body = {
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.4},
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(endpoint, json=body)
            if resp.status_code != 200:
                return None
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(raw_text)
    except Exception:
        return None


async def _call_openai_json(prompt_text: str) -> Optional[Dict[str, Any]]:
    if not settings.OPENAI_API_KEY.strip():
        return None
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY.strip()}"},
                json={
                    "model": "gpt-4o-mini",
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {
                            "role": "system",
                            "content": "Kamu adalah asisten edukasi FokusSprints yang selalu menjawab dalam Bahasa Indonesia dengan JSON valid.",
                        },
                        {"role": "user", "content": prompt_text},
                    ],
                },
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            return json.loads(data["choices"][0]["message"]["content"])
    except Exception:
        return None


async def generate_study_pack(title: str, raw_text: str) -> Dict[str, Any]:
    """
    Konversi teks materi menjadi ringkasan poin, dek 3D Flashcards, dan 3 kuis JSONB.
    Menggunakan Gemini/OpenAI jika API key tersedia, dan fallback ke parser NLP Indonesia yang deterministik.
    """
    truncated = raw_text[:6000]
    prompt = (
        "Buat JSON dengan kunci `summary_bullets` (array 4-5 string ringkasan Bahasa Indonesia), "
        "`flashcards` (array 4 objek {id, front, back, tag}), dan `generated_quizzes` (array berisi 1 `multiple_choice` dengan 4 opsi id A-D, 1 `true_false`, 1 `flashcard_recall`). "
        f"Judul: {title}\n\nMateri:\n{truncated}"
    )

    ai_result = await _call_gemini_json(prompt)
    if ai_result is None:
        ai_result = await _call_openai_json(prompt)

    if isinstance(ai_result, dict) and all(
        k in ai_result for k in ("summary_bullets", "flashcards", "generated_quizzes")
    ):
        return ai_result

    return _fallback_generate_study_pack(title, raw_text)


TUTOR_SYSTEM_PROMPT = (
    "Kamu adalah AI Tutor FokusSprints yang cerdas, komunikatif, ramah, dan serba bisa. "
    "Kamu membantu pengguna berdiskusi bebas tentang materi kuliah, pemrograman/coding, ringkasan catatan, "
    "pemecahan masalah, maupun latihan soal. Jangan pernah menolak menjawab hanya karena tidak ada video aktif. "
    "Selalu balas dalam Bahasa Indonesia menggunakan format Markdown yang rapi (gunakan poin-poin, **teks tebal** "
    "untuk konsep penting, serta blok kode ``` jika menjelaskan pemrograman)."
)


async def _call_gemini_chat(
    message: str,
    history: List[Dict[str, str]],
    system_prompt: str,
) -> Optional[str]:
    if not settings.GEMINI_API_KEY.strip():
        return None
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY.strip()}"
    )
    contents: List[Dict[str, Any]] = []
    for turn in history[-16:]:
        role = "model" if turn.get("role") == "assistant" else "user"
        content = str(turn.get("content", "")).strip()
        if content:
            contents.append({"role": role, "parts": [{"text": content}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    body: Dict[str, Any] = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.65, "maxOutputTokens": 1200},
    }
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(endpoint, json=body)
            if resp.status_code != 200:
                return None
            data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return str(text).strip() or None
    except Exception:
        return None


async def _call_openai_chat(
    message: str,
    history: List[Dict[str, str]],
    system_prompt: str,
) -> Optional[str]:
    if not settings.OPENAI_API_KEY.strip():
        return None
    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for turn in history[-16:]:
        role = "assistant" if turn.get("role") == "assistant" else "user"
        content = str(turn.get("content", "")).strip()
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY.strip()}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": messages,
                    "temperature": 0.65,
                    "max_tokens": 1200,
                },
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            text = data["choices"][0]["message"]["content"]
            return str(text).strip() or None
    except Exception:
        return None


def _build_fallback_tutor_markdown(
    message: str,
    history: List[Dict[str, str]],
    lesson_context: Optional[str],
) -> Tuple[str, List[str]]:
    msg_lower = message.lower()
    prior_user_msgs = [t.get("content", "") for t in history if t.get("role") == "user"]
    continuity_note = (
        f"\n\n*Melanjutkan topik sebelumnya mengenai \"{prior_user_msgs[-1][:60]}\":*"
        if prior_user_msgs
        else ""
    )

    if any(k in msg_lower for k in ("kode", "code", "python", "typescript", "javascript", "react", "sql", "bug", "error")):
        answer = (
            "Siap! Berikut pendekatan terstruktur untuk topik **pemrograman** yang kamu tanyakan:"
            f"{continuity_note}\n\n"
            "1. **Pecah masalah jadi fungsi kecil** agar mudah diuji per bagian.\n"
            "2. **Validasi tipe data & edge case** (nilai kosong, `null`, atau array `[]`).\n"
            "3. **Contoh pola cepat (Python / TypeScript):**\n"
            "```python\n"
            "def proses_data(items: list[str]) -> list[str]:\n"
            "    return [item.strip() for item in items if item.strip()]\n"
            "```\n\n"
            "Kirim potongan kode atau pesan error lengkapmu di sini jika ingin dibedah baris demi baris."
        )
        followups = [
            "Tolong review logika fungsi ini langkah demi langkah",
            "Buat 2 soal latihan coding singkat untuk topik ini",
            "Apa kesalahan umum yang sering terjadi?",
        ]
        return answer, followups

    if any(k in msg_lower for k in ("latihan", "soal", "kuis", "uji", "quiz")):
        topic_hint = lesson_context.splitlines()[0][:80] if lesson_context else "materi yang sedang kamu pelajari"
        answer = (
            f"Ayo kita uji pemahamanmu tentang **{topic_hint}** dengan latihan cepat:"
            f"{continuity_note}\n\n"
            "**Pertanyaan Latihan (Active Recall):**\n"
            "- Jelaskan dengan **3 kalimat sederhana** bagaimana konsep inti ini bekerja tanpa melihat catatan.\n"
            "- Berikan **1 contoh kasus nyata** di mana konsep tersebut paling berdampak.\n\n"
            "Tulis jawabanmu di kolom chat ini, nanti kita evaluasi bersama!"
        )
        followups = [
            "Ini jawabanku, tolong beri evaluasi",
            "Beri soal pilihan ganda 4 opsi untuk materi ini",
            "Jelaskan ulang konsep dasarnya lebih sederhana",
        ]
        return answer, followups

    if any(k in msg_lower for k in ("ringkas", "rangkum", "inti", "poin", "summary")):
        if lesson_context:
            bullets = _split_sentences(lesson_context)[:4]
            formatted = "\n".join(f"- {b}" for b in bullets) if bullets else f"- {lesson_context[:260]}"
            answer = f"**Ringkasan Terstruktur Materi:**{continuity_note}\n\n{formatted}"
        else:
            answer = (
                "Untuk merangkum materi apa pun secara cepat saat sesi sprint:\n\n"
                "- **Ide Pokok:** Tulis 1 kalimat utama yang menjawab *apa* dan *mengapa*.\n"
                "- **3 Poin Pendukung:** Ambil fakta, rumus, atau mekanisme terpenting.\n"
                "- **Pertanyaan Uji:** Ubah tiap poin menjadi pertanyaan *flashcard*.\n\n"
                "Kamu bisa tempel langsung teks catatanmu di obrolan ini agar aku bantu rangkumkan!"
            )
        followups = [
            "Buatkan 3 flashcard tanya-jawab dari ringkasan ini",
            "Beri contoh penerapan nyatanya",
            "Uji aku dengan 1 pertanyaan cepat",
        ]
        return answer, followups

    if lesson_context and lesson_context.strip():
        sentences = _split_sentences(lesson_context)
        matched = [
            s for s in sentences if any(tok in s.lower() for tok in re.findall(r"[a-z]{4,}", msg_lower))
        ]
        insight = matched[0] if matched else (sentences[0] if sentences else lesson_context[:240])
        answer = (
            f"Menjawab pertanyaanmu terkait materi aktif:{continuity_note}\n\n"
            f"- **Poin Kunci:** {insight}\n"
            "- **Tips Praktik:** Pecah konsep di atas menjadi 1 pertanyaan uji mandiri sebelum sesi Pomodoro berakhir.\n\n"
            "*Catatan: Saat ini AI Tutor berjalan di mode fallback lokal. Tambahkan `GEMINI_API_KEY` atau `OPENAI_API_KEY` di `apps/api/.env` untuk respons AI generatif penuh.*"
        )
        followups = [
            "Jelaskan lebih dalam dengan analogi sederhana",
            "Buatkan latihan soal dari materi ini",
            "Ringkas seluruh materi menjadi 3 poin",
        ]
        return answer, followups

    answer = (
        f"Pertanyaan menarik mengenai **\"{message.strip()[:80]}\"**!{continuity_note}\n\n"
        "- **Langkah Memahami Cepat:** Mulai dari definisi paling sederhana, lalu hubungkan dengan 1 contoh kasus nyata.\n"
        "- **Diskusi Terbuka:** Kamu bebas bertanya apa saja di sini — mulai dari teori kuliah, logika coding, ringkasan buku, hingga latihan soal.\n\n"
        "*Info: Saat ini berjalan di mode offline/fallback lokal. Pasang `GEMINI_API_KEY` (`gemini-2.5-flash`) atau `OPENAI_API_KEY` di `apps/api/.env` untuk jawaban AI generatif penuh.*"
    )
    followups = [
        "Bantu aku membuat rencana belajar 25 menit untuk topik ini",
        "Beri 1 latihan soal untuk menguji pemahamanku",
        "Rangkum konsep dasarnya dengan bahasa pemula",
    ]
    return answer, followups


async def generate_tutor_reply(
    message: str,
    history: List[Dict[str, str]],
    lesson_context: Optional[str] = None,
) -> Tuple[str, List[str], str]:
    """
    AI Tutor multi-turn interaktif berbasis Gemini 2.5 Flash atau OpenAI,
    dengan fallback Bahasa Indonesia terstruktur Markdown jika API key belum diisi.
    """
    system_prompt = TUTOR_SYSTEM_PROMPT
    if lesson_context and lesson_context.strip():
        system_prompt += f"\n\nKonteks materi yang sedang dibuka pengguna:\n{lesson_context.strip()[:3500]}"

    default_followups = [
        "Beri contoh penerapan nyata atau kodenya",
        "Uji pemahamanku dengan 1 soal latihan",
        "Ringkas poin paling penting dalam 3 bullet",
    ]

    gemini_reply = await _call_gemini_chat(message, history, system_prompt)
    if gemini_reply:
        return gemini_reply, default_followups, "gemini"

    openai_reply = await _call_openai_chat(message, history, system_prompt)
    if openai_reply:
        return openai_reply, default_followups, "openai"

    fallback_reply, followups = _build_fallback_tutor_markdown(message, history, lesson_context)
    return fallback_reply, followups, "fallback"
