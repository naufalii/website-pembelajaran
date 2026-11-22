"use client";

import { create } from "zustand";

export type PomodoroMode = "focus" | "break" | "quick_test";

interface FocusState {
  // Pomodoro & Focus Mode State
  mode: PomodoroMode;
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isFocusModeActive: boolean;
  activeSessionId: string | null;
  xpMultiplier: 1 | 2;
  tabViolations: number;
  violationModalOpen: boolean;
  lastCompletionXp: number | null;

  // Video & Learning Flow State
  activeLessonId: string | null;
  videoSeconds: number;
  isVideoPlaying: boolean;
  activeCheckpointQuizId: string | null;
  activeCheckpointId: string | null;
  clearedCheckpoints: Record<string, string[]>;

  // Global AI Tutor Drawer
  tutorOpen: boolean;

  // Actions
  setActiveLessonId: (lessonId: string) => void;
  setVideoSeconds: (seconds: number) => void;
  setVideoPlaying: (playing: boolean) => void;
  triggerCheckpoint: (checkpointId: string, quizId: string) => void;
  clearCheckpoint: (lessonId: string, checkpointId: string) => void;
  dismissCheckpointQuiz: () => void;

  setPomodoroPreset: (mode: PomodoroMode) => void;
  startFocusMode: (sessionId: string, durationMinutes: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  tickSecond: () => boolean; // returns true when countdown hits 0
  registerTabViolation: () => void;
  closeViolationModal: () => void;
  finishFocusSession: (xpEarned: number) => void;
  clearLastCompletionXp: () => void;

  setTutorOpen: (open: boolean) => void;
}

const PRESET_SECONDS: Record<PomodoroMode, number> = {
  focus: 25 * 60,
  break: 5 * 60,
  quick_test: 10,
};

export const useFocusStore = create<FocusState>((set, get) => ({
  mode: "focus",
  durationSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  isRunning: false,
  isFocusModeActive: false,
  activeSessionId: null,
  xpMultiplier: 1,
  tabViolations: 0,
  violationModalOpen: false,
  lastCompletionXp: null,

  activeLessonId: null,
  videoSeconds: 0,
  isVideoPlaying: false,
  activeCheckpointQuizId: null,
  activeCheckpointId: null,
  clearedCheckpoints: {},

  tutorOpen: false,

  setActiveLessonId: (lessonId) =>
    set({
      activeLessonId: lessonId,
      videoSeconds: 0,
      isVideoPlaying: false,
      activeCheckpointId: null,
      activeCheckpointQuizId: null,
    }),

  setVideoSeconds: (seconds) => set({ videoSeconds: Math.max(0, seconds) }),
  setVideoPlaying: (playing) => set({ isVideoPlaying: playing }),

  triggerCheckpoint: (checkpointId, quizId) =>
    set({
      isVideoPlaying: false,
      activeCheckpointId: checkpointId,
      activeCheckpointQuizId: quizId,
    }),

  clearCheckpoint: (lessonId, checkpointId) =>
    set((state) => {
      const existing = state.clearedCheckpoints[lessonId] ?? [];
      const updated = existing.includes(checkpointId) ? existing : [...existing, checkpointId];
      return {
        clearedCheckpoints: {
          ...state.clearedCheckpoints,
          [lessonId]: updated,
        },
        activeCheckpointId: null,
        activeCheckpointQuizId: null,
      };
    }),

  dismissCheckpointQuiz: () =>
    set({
      activeCheckpointId: null,
      activeCheckpointQuizId: null,
    }),

  setPomodoroPreset: (mode) => {
    const secs = PRESET_SECONDS[mode];
    set({
      mode,
      durationSeconds: secs,
      remainingSeconds: secs,
      isRunning: false,
      isFocusModeActive: false,
      activeSessionId: null,
      xpMultiplier: 1,
    });
  },

  startFocusMode: (sessionId, durationMinutes) => {
    const state = get();
    const targetSecs = state.mode === "quick_test" ? 10 : durationMinutes * 60;
    set({
      activeSessionId: sessionId,
      durationSeconds: targetSecs,
      remainingSeconds: state.remainingSeconds > 0 && state.activeSessionId === sessionId ? state.remainingSeconds : targetSecs,
      isRunning: true,
      isFocusModeActive: true,
      xpMultiplier: 2,
      tabViolations: 0,
      violationModalOpen: false,
      lastCompletionXp: null,
    });
  },

  pauseTimer: () => set({ isRunning: false }),

  resumeTimer: () => set({ isRunning: true }),

  resetTimer: () => {
    const state = get();
    const secs = PRESET_SECONDS[state.mode];
    set({
      durationSeconds: secs,
      remainingSeconds: secs,
      isRunning: false,
      isFocusModeActive: false,
      activeSessionId: null,
      xpMultiplier: 1,
      tabViolations: 0,
      violationModalOpen: false,
    });
  },

  tickSecond: () => {
    const state = get();
    if (!state.isRunning) return false;
    if (state.remainingSeconds <= 1) {
      set({ remainingSeconds: 0, isRunning: false });
      return true;
    }
    set({ remainingSeconds: state.remainingSeconds - 1 });
    return false;
  },

  registerTabViolation: () =>
    set((state) => ({
      tabViolations: state.tabViolations + 1,
      xpMultiplier: 1,
      violationModalOpen: true,
    })),

  closeViolationModal: () => set({ violationModalOpen: false }),

  finishFocusSession: (xpEarned) => {
    const state = get();
    const secs = PRESET_SECONDS[state.mode];
    set({
      isRunning: false,
      isFocusModeActive: false,
      activeSessionId: null,
      xpMultiplier: 1,
      remainingSeconds: secs,
      durationSeconds: secs,
      lastCompletionXp: xpEarned,
    });
  },

  clearLastCompletionXp: () => set({ lastCompletionXp: null }),

  setTutorOpen: (open) => set({ tutorOpen: open }),
}));
