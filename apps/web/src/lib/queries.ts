"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AiTutorRequest, QuizSubmitRequest } from "@fokussprints/shared";
import { apiClient, setClientAuthToken } from "./api-client";

export const QUERY_KEYS = {
  dashboard: ["dashboard"] as const,
  courses: ["courses"] as const,
  courseDetail: (id: string) => ["course", id] as const,
  quizzes: (quizType?: string) => ["quizzes", quizType ?? "all"] as const,
  leaderboard: ["leaderboard"] as const,
  aiDocuments: ["ai-documents"] as const,
  profile: ["profile"] as const,
};

export function useDashboardQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: () => apiClient.getDashboard(),
  });
}

export function useCoursesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.courses,
    queryFn: () => apiClient.getCourses(),
  });
}

export function useQuizzesQuery(quizType?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.quizzes(quizType),
    queryFn: () => apiClient.getQuizzes(quizType),
  });
}

export function useLeaderboardQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.leaderboard,
    queryFn: () => apiClient.getLeaderboard(),
  });
}

export function useAiDocumentsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.aiDocuments,
    queryFn: () => apiClient.getAiDocuments(),
  });
}

export function useProfileQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: () => apiClient.getProfileOverview(),
  });
}

export function useSubmitQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, body }: { quizId: string; body: QuizSubmitRequest }) =>
      apiClient.submitQuiz(quizId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaderboard });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
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
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.courses });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
    },
  });
}

export function useClaimQuestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questId: string) => apiClient.claimQuest(questId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaderboard });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
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
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaderboard });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
    },
  });
}

export function useUploadAiDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title?: string; text?: string; file?: File | null }) =>
      apiClient.uploadAiDocument(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiDocuments });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
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
      setClientAuthToken(data.access_token);
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
      setClientAuthToken(data.access_token);
      void queryClient.invalidateQueries();
    },
  });
}
