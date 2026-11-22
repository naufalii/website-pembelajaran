import type {
  AiDocument,
  AiTutorResponse,
  AuthTokenResponse,
  BadgeItem,
  CourseDetail,
  CourseSummary,
  DailyQuest,
  DashboardResponse,
  FocusCompleteResponse,
  FocusSession,
  LeaderboardEntry,
  LeaderboardResponse,
  LessonSummary,
  ProfileOverview,
  QuestClaimResponse,
  QuizAttemptSummary,
  QuizItem,
  QuizSubmitRequest,
  QuizSubmitResponse,
  StreakDay,
  TutorHistoryMessage,
  UserProfile,
} from "@fokussprints/shared";
import { computeLevelBounds } from "./utils";

const CLEAN_USER_ID = "11111111-1111-4111-8111-111111111100";

function createIsoDaysAgo(daysAgo: number): string {
  const base = new Date(2026, 10, 22);
  base.setDate(base.getDate() - daysAgo);
  return base.toISOString().slice(0, 10);
}

function buildEmptyStreakCalendar(): StreakDay[] {
  const labels = ["S", "S", "R", "K", "J", "S", "M"];
  return Array.from({ length: 21 }, (_, idx) => {
    const daysAgo = 20 - idx;
    const dayIdx = idx % 7;
    return {
      date: createIsoDaysAgo(daysAgo),
      day_label: labels[dayIdx] ?? "S",
      completed: false,
      is_today: daysAgo === 0,
      pomodoro_sessions: 0,
      xp_earned: 0,
    };
  });
}

function createUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
}

interface DemoDbState {
  currentUser: UserProfile;
  courses: CourseDetail[];
  quizzes: QuizItem[];
  quests: DailyQuest[];
  streakCalendar: StreakDay[];
  activeFocusSession: FocusSession | null;
  totalPomodoroCompleted: number;
  totalFocusMinutes: number;
  totalTabViolations: number;
  recentAttempts: QuizAttemptSummary[];
  aiDocuments: AiDocument[];
}

function createInitialState(): DemoDbState {
  return {
    currentUser: {
      id: CLEAN_USER_ID,
      email: "akun@fokussprints.id",
      full_name: "Pengguna FokusSprints",
      avatar_seed: "fokus",
      xp: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
      xp_current_level_floor: 0,
      xp_next_level_target: 300,
    },
    courses: [],
    quizzes: [],
    quests: [],
    streakCalendar: buildEmptyStreakCalendar(),
    activeFocusSession: null,
    totalPomodoroCompleted: 0,
    totalFocusMinutes: 0,
    totalTabViolations: 0,
    recentAttempts: [],
    aiDocuments: [],
  };
}

const demoState: DemoDbState = createInitialState();

function buildLeaderboardEntries(): LeaderboardEntry[] {
  if (demoState.currentUser.xp <= 0) {
    return [];
  }
  return [
    {
      rank: 1,
      user_id: demoState.currentUser.id,
      full_name: demoState.currentUser.full_name,
      avatar_seed: demoState.currentUser.avatar_seed,
      xp: demoState.currentUser.xp,
      level: demoState.currentUser.level,
      current_streak: demoState.currentUser.current_streak,
      is_current_user: true,
    },
  ];
}

function addXpDemo(delta: number): { updatedXp: number; updatedLevel: number; leveledUp: boolean } {
  const oldLevel = demoState.currentUser.level;
  const updatedXp = demoState.currentUser.xp + delta;
  const bounds = computeLevelBounds(updatedXp);
  demoState.currentUser = {
    ...demoState.currentUser,
    xp: updatedXp,
    level: bounds.level,
    xp_current_level_floor: bounds.floorXp,
    xp_next_level_target: bounds.nextXp,
  };
  const todayEntry = demoState.streakCalendar[demoState.streakCalendar.length - 1];
  if (todayEntry && delta > 0) {
    todayEntry.completed = true;
    todayEntry.xp_earned += delta;
    if (demoState.currentUser.current_streak === 0) {
      demoState.currentUser.current_streak = 1;
      demoState.currentUser.longest_streak = Math.max(1, demoState.currentUser.longest_streak);
    }
  }
  return {
    updatedXp,
    updatedLevel: bounds.level,
    leveledUp: bounds.level > oldLevel,
  };
}

export const demoStore = {
  getDashboard(): DashboardResponse {
    const entries = buildLeaderboardEntries();
    return {
      user: { ...demoState.currentUser },
      active_course: demoState.courses[0] ?? null,
      daily_quiz: demoState.quizzes[0] ?? null,
      streak_calendar: [...demoState.streakCalendar],
      leaderboard_top: entries.slice(0, 3),
      daily_quests: demoState.quests.map((q) => ({ ...q })),
      active_focus_session: demoState.activeFocusSession
        ? { ...demoState.activeFocusSession }
        : null,
    };
  },

  getCourses(): CourseSummary[] {
    return demoState.courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      category: c.category,
      difficulty: c.difficulty,
      estimated_minutes: c.estimated_minutes,
      lesson_count: c.lesson_count,
      completed_lessons: c.completed_lessons,
    }));
  },

  getCourseDetail(courseId: string): CourseDetail {
    const found = demoState.courses.find((c) => c.id === courseId) ?? demoState.courses[0];
    if (!found) {
      throw new Error("Belum ada kursus yang tersedia.");
    }
    return found;
  },

  getQuizzes(quizType?: string): QuizItem[] {
    if (quizType) {
      return demoState.quizzes.filter((q) => q.quiz_type === quizType);
    }
    return [...demoState.quizzes];
  },

  submitQuiz(quizId: string, body: QuizSubmitRequest): QuizSubmitResponse {
    const quiz = demoState.quizzes.find((q) => q.id === quizId);
    if (!quiz) {
      throw new Error("Kuis tidak ditemukan.");
    }
    const payload = quiz.question_payload;
    let isCorrect = false;
    let explanation = "";

    if (payload.type === "multiple_choice") {
      isCorrect = body.selected_option_id === payload.correct_option_id;
      explanation = payload.explanation;
    } else if (payload.type === "true_false") {
      isCorrect = body.selected_boolean === payload.is_true;
      explanation = payload.explanation;
    } else {
      isCorrect = Boolean(body.self_recalled);
      explanation = payload.back_answer;
    }

    const multiplier =
      demoState.activeFocusSession?.status === "active"
        ? demoState.activeFocusSession.multiplier_active
        : 1;
    const xpEarned = isCorrect ? quiz.xp_reward * multiplier : 0;

    const { updatedXp, updatedLevel, leveledUp } = addXpDemo(xpEarned);
    demoState.recentAttempts.unshift({
      id: createUuid(),
      quiz_title: quiz.title,
      is_correct: isCorrect,
      xp_earned: xpEarned,
      multiplier_applied: multiplier,
      attempted_at: new Date().toISOString(),
    });

    const entries = buildLeaderboardEntries();
    const rank = entries.find((e) => e.is_current_user)?.rank ?? 0;

    return {
      quiz_id: quiz.id,
      is_correct: isCorrect,
      xp_earned: xpEarned,
      multiplier_applied: multiplier,
      explanation,
      updated_xp: updatedXp,
      updated_level: updatedLevel,
      leveled_up: leveledUp,
      leaderboard_rank: Math.max(1, rank),
    };
  },

  updateLessonProgress(
    lessonId: string,
    watchedSeconds: number,
    clearedCheckpointId?: string,
    markCompleted?: boolean
  ): {
    lesson_id: string;
    watched_seconds: number;
    cleared_checkpoints: string[];
    is_completed: boolean;
    xp_awarded: number;
  } {
    let xpAwarded = 0;
    let targetLesson: LessonSummary | undefined;
    for (const course of demoState.courses) {
      const found = course.lessons.find((l) => l.id === lessonId);
      if (found) {
        targetLesson = found;
        found.watched_seconds = Math.max(found.watched_seconds, watchedSeconds);
        if (clearedCheckpointId && !found.cleared_checkpoints.includes(clearedCheckpointId)) {
          found.cleared_checkpoints = [...found.cleared_checkpoints, clearedCheckpointId];
        }
        if (markCompleted && !found.is_completed) {
          found.is_completed = true;
          course.completed_lessons = course.lessons.filter((l) => l.is_completed).length;
          xpAwarded = 25;
          addXpDemo(xpAwarded);
        }
        break;
      }
    }
    return {
      lesson_id: lessonId,
      watched_seconds: targetLesson?.watched_seconds ?? watchedSeconds,
      cleared_checkpoints: targetLesson?.cleared_checkpoints ?? [],
      is_completed: targetLesson?.is_completed ?? false,
      xp_awarded: xpAwarded,
    };
  },

  getLeaderboard(): LeaderboardResponse {
    const entries = buildLeaderboardEntries();
    const selfEntry = entries.find((e) => e.is_current_user);
    return {
      entries,
      current_user_rank: selfEntry?.rank ?? 0,
      current_user_xp: demoState.currentUser.xp,
      source: "memory_zset",
    };
  },

  claimQuest(questId: string): QuestClaimResponse {
    const quest = demoState.quests.find((q) => q.id === questId);
    if (!quest) {
      throw new Error("Misi harian tidak ditemukan.");
    }
    if (!quest.is_completed || quest.is_claimed) {
      return {
        quest_id: quest.id,
        xp_earned: 0,
        updated_xp: demoState.currentUser.xp,
        updated_level: demoState.currentUser.level,
        quest: { ...quest },
      };
    }
    quest.is_claimed = true;
    const { updatedXp, updatedLevel } = addXpDemo(quest.xp_reward);
    return {
      quest_id: quest.id,
      xp_earned: quest.xp_reward,
      updated_xp: updatedXp,
      updated_level: updatedLevel,
      quest: { ...quest },
    };
  },

  startFocus(durationMinutes: number): FocusSession {
    const session: FocusSession = {
      id: createUuid(),
      duration_minutes: durationMinutes,
      tab_violations: 0,
      multiplier_active: 2,
      status: "active",
      started_at: new Date().toISOString(),
      completed_at: null,
    };
    demoState.activeFocusSession = session;
    return { ...session };
  },

  reportViolation(sessionId: string): FocusSession {
    if (demoState.activeFocusSession && demoState.activeFocusSession.id === sessionId) {
      demoState.activeFocusSession.tab_violations += 1;
      demoState.activeFocusSession.multiplier_active = 1;
      demoState.totalTabViolations += 1;
      return { ...demoState.activeFocusSession };
    }
    return {
      id: sessionId,
      duration_minutes: 25,
      tab_violations: 1,
      multiplier_active: 1,
      status: "active",
      started_at: new Date().toISOString(),
      completed_at: null,
    };
  },

  completeFocus(sessionId: string): FocusCompleteResponse {
    const active = demoState.activeFocusSession;
    const multiplier = active ? active.multiplier_active : 2;
    const violations = active ? active.tab_violations : 0;
    const duration = active ? active.duration_minutes : 25;
    const xpEarned = 35 * multiplier;
    const { updatedXp, updatedLevel } = addXpDemo(xpEarned);

    demoState.totalPomodoroCompleted += 1;
    demoState.totalFocusMinutes += duration;

    const completedSession: FocusSession = {
      id: sessionId,
      duration_minutes: duration,
      tab_violations: violations,
      multiplier_active: multiplier,
      status: "completed",
      started_at: active?.started_at ?? new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    demoState.activeFocusSession = null;

    return {
      session: completedSession,
      xp_earned: xpEarned,
      updated_xp: updatedXp,
      updated_level: updatedLevel,
    };
  },

  getAiDocuments(): AiDocument[] {
    return [...demoState.aiDocuments];
  },

  createAiDocument(title: string, text: string, filename?: string): AiDocument {
    const cleanText = text.replace(/\s+/g, " ").trim();
    const sentences = cleanText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 16);

    const bullets =
      sentences.length > 0
        ? sentences.slice(0, 4)
        : [
            `Materi ${title} merangkum inti konsep utama untuk dipelajari dalam blok sprint 25 menit.`,
            "Gunakan teknik Active Recall segera setelah meninjau ringkasan poin ini.",
            "Ulangi kartu flashcard 3D dalam interval 1, 3, dan 7 hari.",
          ];

    const doc: AiDocument = {
      id: createUuid(),
      source_filename: filename ?? null,
      source_type: filename ? "pdf" : "text",
      title: title || "Ringkasan Materi FokusSprints",
      raw_text_excerpt: cleanText.slice(0, 420),
      summary_bullets: bullets,
      flashcards: [
        {
          id: `fc-${Date.now()}-1`,
          front: `Apa gagasan paling utama dalam "${title}"?`,
          back: bullets[0] ?? cleanText.slice(0, 140),
          tag: "Konsep Utama",
        },
        {
          id: `fc-${Date.now()}-2`,
          front: "Bagaimana poin pendukung kedua memperkuat pemahaman materi ini?",
          back: bullets[1] ?? bullets[0] ?? "Menghubungkan teori dengan latihan aktif terukur.",
          tag: "Penerapan",
        },
        {
          id: `fc-${Date.now()}-3`,
          front: "Langkah praktis apa yang sebaiknya diuji di sesi Pomodoro berikutnya?",
          back: bullets[2] ?? "Uji pemahaman tanpa melihat catatan dan catat celah ingatan.",
          tag: "Active Recall",
        },
      ],
      generated_quizzes: [
        {
          type: "multiple_choice",
          prompt: `Berdasarkan dokumen "${title}", pernyataan mana yang paling akurat dengan ringkasan inti?`,
          options: [
            { id: "A", text: (bullets[0] ?? "Fokus terstruktur meningkatkan retensi").slice(0, 95) },
            { id: "B", text: "Membaca pasif tanpa jeda selalu menghasilkan nilai maksimal" },
            { id: "C", text: "Multitasking mempercepat konsolidasi memori" },
            { id: "D", text: "Tidak perlu menguji ulang materi setelah membaca sekali" },
          ],
          correct_option_id: "A",
          explanation: bullets[0] ?? "Pernyataan A sesuai dengan ringkasan utama dokumen.",
        },
        {
          type: "true_false",
          statement: `Menguji ulang konsep dari "${title}" menggunakan flashcard 3D membantu memperkuat retensi aktif.`,
          is_true: true,
          explanation: "Benar! Active Recall melalui flashcard memicu penguatan jalur saraf memori.",
        },
      ],
      created_at: new Date().toISOString(),
    };

    demoState.aiDocuments.unshift(doc);
    return doc;
  },

  askTutor(
    message: string,
    history: TutorHistoryMessage[],
    lessonContext: string | null
  ): AiTutorResponse {
    const prior = history.filter((h) => h.role === "user").slice(-1)[0]?.content;
    const continuity = prior ? `\n\n*Melanjutkan pembahasan tentang "${prior.slice(0, 50)}":*` : "";
    const contextNote = lessonContext
      ? `\n\n- **Konteks Materi Aktif:** ${lessonContext.slice(0, 180)}`
      : "";

    return {
      answer: `Berikut tanggapan untuk pertanyaanmu mengenai **"${message.slice(0, 80)}"**:${continuity}${contextNote}\n\n- **Langkah Cepat:** Pecah konsep ini menjadi 1 definisi inti dan 1 contoh nyata.\n- **Catatan:** Saat ini berada pada mode preview lokal (fallback). Hubungkan backend FastAPI dan pasang \`GEMINI_API_KEY\` untuk respons AI Live.`,
      suggested_followups: [
        "Beri 1 contoh soal latihan dari topik ini",
        "Jelaskan ulang dengan analogi sederhana",
        "Ringkas poin penting dalam 3 bullet",
      ],
      provider: "fallback",
    };
  },

  getProfileOverview(): ProfileOverview {
    const attempts = demoState.recentAttempts;
    const correctCount = attempts.filter((a) => a.is_correct).length;
    const accuracy = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;

    const badges: BadgeItem[] = [
      {
        code: "streak_7",
        title: "Penjaga Api 7 Hari",
        description: "Pertahankan streak belajar minimal 7 hari berturut-turut.",
        unlocked: demoState.currentUser.current_streak >= 7,
        progress_label: `${Math.min(7, demoState.currentUser.current_streak)}/7 Hari`,
        tier: "gold",
      },
      {
        code: "deep_focus_master",
        title: "Arsitek Deep Focus",
        description: "Selesaikan sesi Focus Mode 25 menit dengan multiplier 2x aktif.",
        unlocked: demoState.totalPomodoroCompleted >= 1 && demoState.totalTabViolations === 0,
        progress_label: demoState.totalPomodoroCompleted >= 1 ? "Aktif" : "0/1 Sesi",
        tier: "mint",
      },
      {
        code: "xp_1000",
        title: "Kolektor Seribu XP",
        description: "Kumpulkan total 1.000 XP dari video mikro, kuis, dan misi.",
        unlocked: demoState.currentUser.xp >= 1000,
        progress_label: `${Math.min(1000, demoState.currentUser.xp)}/1.000 XP`,
        tier: "gold",
      },
      {
        code: "quiz_sprinter",
        title: "Sprinter Kuis Kilat",
        description: "Selesaikan minimal 5 kuis interaktif lintas tipe.",
        unlocked: attempts.length >= 5,
        progress_label: `${Math.min(5, attempts.length)}/5 Kuis`,
        tier: "cream",
      },
      {
        code: "ai_alchemist",
        title: "Alkemis Catatan AI",
        description: "Konversi catatan atau PDF menjadi dek 3D Flashcard.",
        unlocked: demoState.aiDocuments.length >= 1,
        progress_label: `${Math.min(1, demoState.aiDocuments.length)}/1 Dokumen`,
        tier: "mint",
      },
      {
        code: "level_6_trailblazer",
        title: "Pelopor Level 6",
        description: "Capai ambang 2.000 XP untuk menembus Level 6.",
        unlocked: demoState.currentUser.xp >= 2000,
        progress_label: `${Math.min(2000, demoState.currentUser.xp)}/2.000 XP`,
        tier: "gold",
      },
    ];

    return {
      user: { ...demoState.currentUser },
      total_pomodoro_completed: demoState.totalPomodoroCompleted,
      total_focus_minutes: demoState.totalFocusMinutes,
      total_quizzes_answered: attempts.length,
      quiz_accuracy_percent: accuracy,
      total_tab_violations: demoState.totalTabViolations,
      badges,
      recent_attempts: [...attempts],
    };
  },

  loginDemo(email: string): AuthTokenResponse {
    demoState.currentUser = {
      ...demoState.currentUser,
      email: email.trim() || "akun@fokussprints.id",
    };
    return {
      access_token: "demo-access-token",
      refresh_token: "demo-refresh-token",
      token_type: "bearer",
      user: { ...demoState.currentUser },
    };
  },
};
