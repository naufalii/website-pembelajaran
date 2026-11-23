"use client";

import * as React from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { AiTutorRequest, QuizSubmitRequest } from "@fokussprints/shared";
import { CLIENT_CACHE_STALE_MS } from "@/components/providers";
import { useAuthStore } from "@/stores/auth-store";
import {
  apiClient,
  clearClientAuthToken,
  isAbortError,
  isUnauthorizedError,
  setClientAuthToken,
} from "./api-client";

export const QUERY_KEYS = {
  dashboard: ["dashboard"] as const,
  courses: ["courses"] as const,
  courseDetail: (id: string) => ["course", id] as const,
  quizzes: (quizType?: string) => ["quizzes", quizType ?? "all"] as const,
  leaderboard: ["leaderboard"] as const,
  aiDocuments: ["ai-documents"] as const,
  profile: ["profile"] as const,
};

function noRetryOnAuthOrAbort(failureCount: number, error: unknown): boolean {
  if (isUnauthorizedError(error) || isAbortError(error)) return false;
  return failureCount < 1;
}

export function useDashboardQuery() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: ({ signal }) => apiClient.getDashboard(signal),
    enabled: hydrated && Boolean(token),
    staleTime: CLIENT_CACHE_STALE_MS,
    retry: noRetryOnAuthOrAbort,
  });
}

export function useCoursesQuery() {
  const hydrated = useAuthStore((s) => s.hydrated);
  return useQuery({
    queryKey: QUERY_KEYS.courses,
    queryFn: ({ signal }) => apiClient.getCourses(signal),
    enabled: hydrated,
    staleTime: CLIENT_CACHE_STALE_MS,
    retry: noRetryOnAuthOrAbort,
  });
}

export function useQuizzesQuery(quizType?: string) {
  const hydrated = useAuthStore((s) => s.hydrated);
  return useQuery({
    queryKey: QUERY_KEYS.quizzes(quizType),
    queryFn: ({ signal }) => apiClient.getQuizzes(quizType, signal),
    enabled: hydrated,
    staleTime: CLIENT_CACHE_STALE_MS,
    placeholderData: keepPreviousData,
    retry: noRetryOnAuthOrAbort,
  });
}

export function useLeaderboardQuery() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: QUERY_KEYS.leaderboard,
    queryFn: ({ signal }) => apiClient.getLeaderboard(signal),
    enabled: hydrated && Boolean(token),
    staleTime: CLIENT_CACHE_STALE_MS,
    retry: noRetryOnAuthOrAbort,
  });
}

export function useAiDocumentsQuery() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: QUERY_KEYS.aiDocuments,
    queryFn: ({ signal }) => apiClient.getAiDocuments(signal),
    enabled: hydrated && Boolean(token),
    staleTime: CLIENT_CACHE_STALE_MS,
    retry: noRetryOnAuthOrAbort,
  });
}

export function useProfileQuery() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: ({ signal }) => apiClient.getProfileOverview(signal),
    enabled: hydrated && Boolean(token),
    staleTime: CLIENT_CACHE_STALE_MS,
    retry: noRetryOnAuthOrAbort,
  });
}

/**
 * Prefetch paralel berbasis Promise.allSettled saat pengguna mengarahkan kursor ke menu sidebar,
 * sehingga perpindahan antar halaman langsung tampil instan dari cache memori (SWR).
 */
export function usePrefetchRoute() {
  const queryClient = useQueryClient();

  return React.useCallback(
    (href: string) => {
      const { hydrated, token } = useAuthStore.getState();
      if (!hydrated) return;

      const tasks: Array<Promise<unknown>> = [];

      if (href === "/") {
        tasks.push(
          queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.quizzes(),
            queryFn: ({ signal }) => apiClient.getQuizzes(undefined, signal),
            staleTime: CLIENT_CACHE_STALE_MS,
          })
        );
        if (token) {
          tasks.push(
            queryClient.prefetchQuery({
              queryKey: QUERY_KEYS.dashboard,
              queryFn: ({ signal }) => apiClient.getDashboard(signal),
              staleTime: CLIENT_CACHE_STALE_MS,
            })
          );
        }
      } else if (href === "/kuis") {
        tasks.push(
          queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.courses,
            queryFn: ({ signal }) => apiClient.getCourses(signal),
            staleTime: CLIENT_CACHE_STALE_MS,
          }),
          queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.quizzes(),
            queryFn: ({ signal }) => apiClient.getQuizzes(undefined, signal),
            staleTime: CLIENT_CACHE_STALE_MS,
          })
        );
      } else if (href === "/leaderboard" && token) {
        tasks.push(
          queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.leaderboard,
            queryFn: ({ signal }) => apiClient.getLeaderboard(signal),
            staleTime: CLIENT_CACHE_STALE_MS,
          })
        );
      } else if (href === "/ai-upload" && token) {
        tasks.push(
          queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.aiDocuments,
            queryFn: ({ signal }) => apiClient.getAiDocuments(signal),
            staleTime: CLIENT_CACHE_STALE_MS,
          })
        );
      } else if (href === "/profil" && token) {
        tasks.push(
          queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.profile,
            queryFn: ({ signal }) => apiClient.getProfileOverview(signal),
            staleTime: CLIENT_CACHE_STALE_MS,
          })
        );
      }

      if (tasks.length > 0) {
        void Promise.allSettled(tasks);
      }
    },
    [queryClient]
  );
}

export function useSubmitQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, body }: { quizId: string; body: QuizSubmitRequest }) =>
      apiClient.submitQuiz(quizId, body),
    onSuccess: () => {
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaderboard }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile }),
      ]);
    },
  });
}

export function useUpdateLessonProgressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      lessonId,
      watchedSeconds,
      clearedCheckpointId,
      markCompleted,
    }: {
      lessonId: string;
      watchedSeconds: number;
      clearedCheckpointId?: string;
      markCompleted?: boolean;
    }) =>
      apiClient.updateLessonProgress(lessonId, {
        watched_seconds: watchedSeconds,
        cleared_checkpoint_id: clearedCheckpointId,
        mark_completed: markCompleted,
      }),
    onSuccess: () => {
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.courses }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile }),
      ]);
    },
  });
}

export function useClaimQuestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questId: string) => apiClient.claimQuest(questId),
    onSuccess: () => {
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaderboard }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile }),
      ]);
    },
  });
}

export function useStartFocusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (durationMinutes: number) => apiClient.startFocus(durationMinutes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });
}

export function useReportViolationMutation() {
  return useMutation({
    mutationFn: (sessionId: string) => apiClient.reportFocusViolation(sessionId),
  });
}

export function useCompleteFocusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => apiClient.completeFocus(sessionId),
    onSuccess: () => {
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaderboard }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile }),
      ]);
    },
  });
}

export function useUploadAiDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title?: string; text?: string; file?: File | null }) =>
      apiClient.uploadAiDocument(input),
    onSuccess: () => {
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiDocuments }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile }),
      ]);
    },
  });
}

export function useAskTutorMutation() {
  return useMutation({
    mutationFn: (payload: AiTutorRequest) => apiClient.askTutor(payload),
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.login(email, password),
    onSuccess: (data) => {
      setClientAuthToken(data.access_token, data.refresh_token);
      void queryClient.invalidateQueries();
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      fullName,
      email,
      password,
    }: {
      fullName: string;
      email: string;
      password: string;
    }) => apiClient.register(fullName, email, password),
    onSuccess: (data) => {
      setClientAuthToken(data.access_token, data.refresh_token);
      void queryClient.invalidateQueries();
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return React.useCallback(() => {
    clearClientAuthToken("logout");
    queryClient.removeQueries({ queryKey: QUERY_KEYS.dashboard });
    queryClient.removeQueries({ queryKey: QUERY_KEYS.profile });
    queryClient.removeQueries({ queryKey: QUERY_KEYS.leaderboard });
    queryClient.removeQueries({ queryKey: QUERY_KEYS.aiDocuments });
    void Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.courses }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quizzes() }),
    ]);
  }, [queryClient]);
}
