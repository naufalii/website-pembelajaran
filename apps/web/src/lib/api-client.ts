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
import { readStoredAuthToken, useAuthStore } from "@/stores/auth-store";
import { demoStore } from "./demo-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly isUnauthorized: boolean;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.isUnauthorized = status === 401;
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.isUnauthorized;
}

export function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export function setClientAuthToken(
  token: string | null,
  refreshToken?: string | null
): void {
  if (token) {
    useAuthStore.getState().setSession(token, refreshToken);
  } else {
    useAuthStore.getState().clearSession("logout");
  }
}

export function clearClientAuthToken(reason: "expired" | "logout" = "logout"): void {
  useAuthStore.getState().clearSession(reason);
}

export function getClientAuthToken(): string | null {
  return readStoredAuthToken();
}

function parseErrorDetail(rawText: string, status: number): string {
  if (rawText) {
    try {
      const parsed: unknown = JSON.parse(rawText);
      if (parsed && typeof parsed === "object" && "detail" in parsed) {
        const detail = (parsed as { detail: unknown }).detail;
        if (typeof detail === "string" && detail.trim()) {
          return detail.trim();
        }
        if (Array.isArray(detail) && detail.length > 0) {
          const first = detail[0];
          if (first && typeof first === "object" && "msg" in first) {
            return String((first as { msg: unknown }).msg);
          }
        }
      }
    } catch {
      return rawText.trim();
    }
  }

  if (status === 401) {
    return "Sesi masuk telah berakhir atau kamu belum masuk akun.";
  }
  return `Permintaan gagal diproses (${status}).`;
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

interface RequestOptions extends RequestInit {
  skipAuthHeader?: boolean;
}

async function requestWithFallback<T>(
  path: string,
  options: RequestOptions,
  schema: ZodParser<T>,
  demoFallback: () => T | Promise<T>
): Promise<T> {
  const { skipAuthHeader, ...fetchOptions } = options;
  const token = skipAuthHeader ? null : getClientAuthToken();
  const headers = new Headers(fetchOptions.headers);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    !(fetchOptions.body instanceof FormData) &&
    !headers.has("Content-Type") &&
    fetchOptions.body
  ) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1${path}`, {
      ...fetchOptions,
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      const detail = parseErrorDetail(errorText, response.status);

      if (response.status === 401) {
        // Hapus token JWT usang dari localStorage & state auth agar tidak terus dikirim ulang
        if (!skipAuthHeader) {
          clearClientAuthToken("expired");
        }
        throw new ApiError(401, detail);
      }

      if (DEMO_ENABLED && response.status >= 500) {
        return await demoFallback();
      }
      throw new ApiError(response.status, detail);
    }

    const rawJson: unknown = await response.json();
    return schema.parse(rawJson);
  } catch (error) {
    if (isAbortError(error) || error instanceof ApiError) {
      throw error;
    }
    if (DEMO_ENABLED) {
      return await demoFallback();
    }
    throw error;
  }
}

export const apiClient = {
  getDashboard(signal?: AbortSignal): Promise<DashboardResponse> {
    return requestWithFallback(
      "/progress/dashboard",
      { method: "GET", signal },
      DashboardResponseSchema,
      () => demoStore.getDashboard()
    );
  },

  getCourses(signal?: AbortSignal): Promise<CourseSummary[]> {
    return requestWithFallback(
      "/courses",
      { method: "GET", signal },
      z.array(CourseSummarySchema),
      () => demoStore.getCourses()
    );
  },

  getCourseDetail(courseId: string, signal?: AbortSignal): Promise<CourseDetail> {
    return requestWithFallback(
      `/courses/${courseId}`,
      { method: "GET", signal },
      CourseDetailSchema,
      () => demoStore.getCourseDetail(courseId)
    );
  },

  getQuizzes(quizType?: string, signal?: AbortSignal): Promise<QuizItem[]> {
    const query = quizType ? `?quiz_type=${encodeURIComponent(quizType)}` : "";
    return requestWithFallback(
      `/quizzes${query}`,
      { method: "GET", signal },
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

  getLeaderboard(signal?: AbortSignal): Promise<LeaderboardResponse> {
    return requestWithFallback(
      "/gamification/leaderboard",
      { method: "GET", signal },
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

  getAiDocuments(signal?: AbortSignal): Promise<AiDocument[]> {
    return requestWithFallback(
      "/lessons/ai/documents",
      { method: "GET", signal },
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

  getProfileOverview(signal?: AbortSignal): Promise<ProfileOverview> {
    return requestWithFallback(
      "/progress/profile",
      { method: "GET", signal },
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
        skipAuthHeader: true,
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
        skipAuthHeader: true,
      },
      AuthTokenResponseSchema,
      () => demoStore.loginDemo(email)
    );
  },
};
