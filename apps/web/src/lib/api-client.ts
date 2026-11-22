import {
  AiDocumentSchema,
  AiTutorResponseSchema,
  AuthTokenResponseSchema,
  CourseDetailSchema,
  CourseSummarySchema,
  DashboardResponseSchema,
  FocusCompleteResponseSchema,
  FocusSessionSchema,
  LeaderboardResponseSchema,
  ProfileOverviewSchema,
  QuestClaimResponseSchema,
  QuizItemSchema,
  QuizSubmitResponseSchema,
  type AiDocument,
  type AiTutorRequest,
  type AiTutorResponse,
  type AuthTokenResponse,
  type CourseDetail,
  type CourseSummary,
  type DashboardResponse,
  type FocusCompleteResponse,
  type FocusSession,
  type LeaderboardResponse,
  type ProfileOverview,
  type QuestClaimResponse,
  type QuizItem,
  type QuizSubmitRequest,
  type QuizSubmitResponse,
} from "@fokussprints/shared";
import { z } from "zod";
import { demoStore } from "./demo-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

let authTokenMemory: string | null = null;

export function setClientAuthToken(token: string | null): void {
  authTokenMemory = token;
  if (typeof window !== "undefined") {
    if (token) {
      window.localStorage.setItem("fokussprints_token", token);
    } else {
      window.localStorage.removeItem("fokussprints_token");
    }
  }
}

export function getClientAuthToken(): string | null {
  if (authTokenMemory) return authTokenMemory;
  if (typeof window !== "undefined") {
    authTokenMemory = window.localStorage.getItem("fokussprints_token");
  }
  return authTokenMemory;
}

const LessonProgressResponseSchema = z.object({
  lesson_id: z.string(),
  watched_seconds: z.number(),
  cleared_checkpoints: z.array(z.string()),
  is_completed: z.boolean(),
  xp_awarded: z.number(),
});

interface ZodParser<T> {
  parse: (data: unknown) => T;
}

async function requestWithFallback<T>(
  path: string,
  options: RequestInit,
  schema: ZodParser<T>,
  demoFallback: () => T | Promise<T>
): Promise<T> {
  const token = getClientAuthToken();
  const headers = new Headers(options.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (DEMO_ENABLED && response.status >= 500) {
        return await demoFallback();
      }
      throw new Error(errorText || `Permintaan gagal (${response.status})`);
    }

    const rawJson: unknown = await response.json();
    return schema.parse(rawJson);
  } catch (error) {
    if (DEMO_ENABLED) {
      return await demoFallback();
    }
    throw error;
  }
}

export const apiClient = {
  getDashboard(): Promise<DashboardResponse> {
    return requestWithFallback(
      "/progress/dashboard",
      { method: "GET" },
      DashboardResponseSchema,
      () => demoStore.getDashboard()
    );
  },

  getCourses(): Promise<CourseSummary[]> {
    return requestWithFallback(
      "/courses",
      { method: "GET" },
      z.array(CourseSummarySchema),
      () => demoStore.getCourses()
    );
  },

  getCourseDetail(courseId: string): Promise<CourseDetail> {
    return requestWithFallback(
      `/courses/${courseId}`,
      { method: "GET" },
      CourseDetailSchema,
      () => demoStore.getCourseDetail(courseId)
    );
  },

  getQuizzes(quizType?: string): Promise<QuizItem[]> {
    const query = quizType ? `?quiz_type=${encodeURIComponent(quizType)}` : "";
    return requestWithFallback(
      `/quizzes${query}`,
      { method: "GET" },
      z.array(QuizItemSchema),
      () => demoStore.getQuizzes(quizType)
    );
  },

  submitQuiz(quizId: string, body: QuizSubmitRequest): Promise<QuizSubmitResponse> {
    return requestWithFallback(
      `/quizzes/${quizId}/submit`,
      { method: "POST", body: JSON.stringify(body) },
      QuizSubmitResponseSchema,
      () => demoStore.submitQuiz(quizId, body)
    );
  },

  updateLessonProgress(
    lessonId: string,
    payload: {
      watched_seconds: number;
      cleared_checkpoint_id?: string;
      mark_completed?: boolean;
    }
  ): Promise<z.infer<typeof LessonProgressResponseSchema>> {
    return requestWithFallback(
      `/lessons/${lessonId}/progress`,
      { method: "POST", body: JSON.stringify(payload) },
      LessonProgressResponseSchema,
      () =>
        demoStore.updateLessonProgress(
          lessonId,
          payload.watched_seconds,
          payload.cleared_checkpoint_id,
          payload.mark_completed
        )
    );
  },

  getLeaderboard(): Promise<LeaderboardResponse> {
    return requestWithFallback(
      "/gamification/leaderboard",
      { method: "GET" },
      LeaderboardResponseSchema,
      () => demoStore.getLeaderboard()
    );
  },

  claimQuest(questId: string): Promise<QuestClaimResponse> {
    return requestWithFallback(
      `/gamification/quests/${questId}/claim`,
      { method: "POST" },
      QuestClaimResponseSchema,
      () => demoStore.claimQuest(questId)
    );
  },

  startFocus(durationMinutes: number): Promise<FocusSession> {
    return requestWithFallback(
      "/gamification/focus/start",
      {
        method: "POST",
        body: JSON.stringify({ duration_minutes: durationMinutes }),
      },
      FocusSessionSchema,
      () => demoStore.startFocus(durationMinutes)
    );
  },

  reportFocusViolation(sessionId: string): Promise<FocusSession> {
    return requestWithFallback(
      `/gamification/focus/${sessionId}/violation`,
      { method: "POST" },
      FocusSessionSchema,
      () => demoStore.reportViolation(sessionId)
    );
  },

  completeFocus(sessionId: string): Promise<FocusCompleteResponse> {
    return requestWithFallback(
      `/gamification/focus/${sessionId}/complete`,
      { method: "POST" },
      FocusCompleteResponseSchema,
      () => demoStore.completeFocus(sessionId)
    );
  },

  getAiDocuments(): Promise<AiDocument[]> {
    return requestWithFallback(
      "/lessons/ai/documents",
      { method: "GET" },
      z.array(AiDocumentSchema),
      () => demoStore.getAiDocuments()
    );
  },

  uploadAiDocument(input: {
    title?: string;
    text?: string;
    file?: File | null;
  }): Promise<AiDocument> {
    if (input.file) {
      const formData = new FormData();
      if (input.title) formData.append("title", input.title);
      if (input.text) formData.append("text", input.text);
      formData.append("file", input.file);

      return requestWithFallback(
        "/lessons/ai/documents",
        { method: "POST", body: formData },
        AiDocumentSchema,
        async () => {
          const textFromFile = input.file ? await input.file.text().catch(() => "") : "";
          return demoStore.createAiDocument(
            input.title || input.file?.name.replace(/\.pdf$/i, "") || "Catatan PDF",
            textFromFile.length > 30
              ? textFromFile
              : `Ringkasan otomatis dari berkas ${input.file?.name ?? "materi.pdf"}. Fokus pembelajaran meliputi konsep inti, penerapan terstruktur, dan pengulangan aktif.`,
            input.file?.name
          );
        }
      );
    }

    return requestWithFallback(
      "/lessons/ai/documents",
      {
        method: "POST",
        body: JSON.stringify({
          title: input.title,
          text: input.text ?? "",
        }),
      },
      AiDocumentSchema,
      () => demoStore.createAiDocument(input.title || "Catatan Belajar", input.text || "")
    );
  },

  askTutor(payload: AiTutorRequest): Promise<AiTutorResponse> {
    return requestWithFallback(
      "/lessons/ai/tutor",
      { method: "POST", body: JSON.stringify(payload) },
      AiTutorResponseSchema,
      () =>
        demoStore.askTutor(
          payload.message,
          payload.history ?? [],
          payload.lesson_context ?? null
        )
    );
  },

  getProfileOverview(): Promise<ProfileOverview> {
    return requestWithFallback(
      "/progress/profile",
      { method: "GET" },
      ProfileOverviewSchema,
      () => demoStore.getProfileOverview()
    );
  },

  login(email: string, password: string): Promise<AuthTokenResponse> {
    return requestWithFallback(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
      AuthTokenResponseSchema,
      () => demoStore.loginDemo(email)
    );
  },

  register(fullName: string, email: string, password: string): Promise<AuthTokenResponse> {
    return requestWithFallback(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ full_name: fullName, email, password }),
      },
      AuthTokenResponseSchema,
      () => demoStore.loginDemo(email)
    );
  },
};
