"use client";

import * as React from "react";
import {
  Bot,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Timer,
} from "lucide-react";
import type { CourseDetail } from "@fokussprints/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStartFocusMutation } from "@/lib/queries";
import { type PomodoroMode, useFocusStore } from "@/stores/focus-store";
import { cn, formatTimer } from "@/lib/utils";

const PRESETS: Array<{ id: PomodoroMode; label: string; minutes: number }> = [
  { id: "focus", label: "Fokus 25:00", minutes: 25 },
  { id: "break", label: "Rehat 05:00", minutes: 5 },
  { id: "quick_test", label: "Uji 00:10", minutes: 1 },
];

export function PomodoroEngine({ course }: { course: CourseDetail | null }) {
  const mode = useFocusStore((s) => s.mode);
  const remainingSeconds = useFocusStore((s) => s.remainingSeconds);
  const isRunning = useFocusStore((s) => s.isRunning);
  const isFocusModeActive = useFocusStore((s) => s.isFocusModeActive);
  const xpMultiplier = useFocusStore((s) => s.xpMultiplier);
  const lastCompletionXp = useFocusStore((s) => s.lastCompletionXp);
  const activeLessonId = useFocusStore((s) => s.activeLessonId);

  const setPomodoroPreset = useFocusStore((s) => s.setPomodoroPreset);
  const startFocusMode = useFocusStore((s) => s.startFocusMode);
  const pauseTimer = useFocusStore((s) => s.pauseTimer);
  const resumeTimer = useFocusStore((s) => s.resumeTimer);
  const resetTimer = useFocusStore((s) => s.resetTimer);
  const clearLastCompletionXp = useFocusStore((s) => s.clearLastCompletionXp);
  const setActiveLessonId = useFocusStore((s) => s.setActiveLessonId);
  const setTutorOpen = useFocusStore((s) => s.setTutorOpen);

  const startFocusMutation = useStartFocusMutation();

  const handleStartOrToggle = async () => {
    if (isRunning) {
      pauseTimer();
      return;
    }
    if (isFocusModeActive) {
      resumeTimer();
      return;
    }
    const mins = mode === "break" ? 5 : mode === "quick_test" ? 1 : 25;
    try {
      const session = await startFocusMutation.mutateAsync(mins);
      startFocusMode(session.id, mins);
    } catch {
      startFocusMode("local-focus-session", mins);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-sand" aria-hidden="true" />
            <CardTitle>Pomodoro Focus Engine</CardTitle>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isFocusModeActive && (
              <Badge variant={xpMultiplier === 2 ? "mint" : "danger"}>
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {xpMultiplier}x XP Aktif
              </Badge>
            )}
            <Button
              type="button"
              size="sm"
              variant="surface"
              onClick={() => setTutorOpen(true)}
            >
              <Bot className="h-4 w-4 text-sand" aria-hidden="true" />
              <span>AI Tutor</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Timer Display & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-[2.5px] border-ink bg-forest-bg p-4">
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setPomodoroPreset(p.id)}
                  className={cn(
                    "rounded-lg border-2 border-ink px-2.5 py-1 font-mono text-xs font-extrabold brutal-press disabled:opacity-50",
                    mode === p.id ? "bg-sand text-ink" : "bg-forest-surface text-sage hover:text-cream"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums text-cream">
              {formatTimer(remainingSeconds)}
            </p>
            <p className="mt-1 text-xs font-medium text-sage">
              {isFocusModeActive
                ? "Jangan pindah tab browser agar bonus 2x XP tetap utuh."
                : "Mulai sprint untuk mengaktifkan kunci fokus & bonus 2x XP."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              size="lg"
              variant={isRunning ? "danger" : "default"}
              disabled={startFocusMutation.isPending}
              onClick={() => void handleStartOrToggle()}
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  Jeda
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {isFocusModeActive ? "Lanjut" : "Mulai Sprint"}
                </>
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="surface"
              aria-label="Reset timer Pomodoro"
              onClick={resetTimer}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {lastCompletionXp !== null && lastCompletionXp > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-mint px-4 py-2.5 text-ink">
            <span className="font-display text-sm font-extrabold">
              Sesi Pomodoro tuntas! Kamu meraih +{lastCompletionXp} XP &amp; progres Misi Harian bertambah.
            </span>
            <button
              type="button"
              onClick={clearLastCompletionXp}
              className="rounded-lg border-2 border-ink bg-cream px-2 py-0.5 text-xs font-extrabold"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Alur Belajar Sesi Ini */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-extrabold text-cream">
              Alur Belajar Sesi Ini
            </h3>
            <span className="text-xs font-bold text-sage">
              <span className="font-mono tabular-nums">
                {(course?.lessons ?? []).filter((l) => l.is_completed).length}/
                {(course?.lessons ?? []).length}
              </span>{" "}
              Video
            </span>
          </div>

          {!course || course.lessons.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-sand/50 bg-forest-bg p-4 text-center text-xs font-medium text-sage">
              Belum ada modul video pada sesi ini. Timer Pomodoro di atas tetap siap dijalankan untuk sesi fokus bebas.
            </div>
          ) : (
            <div
              className={cn(
                "grid grid-cols-1 gap-2.5",
                course.lessons.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-3"
              )}
            >
              {course.lessons.map((lesson) => {
                const isSelected = (activeLessonId ?? course.lessons[0]?.id) === lesson.id;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setActiveLessonId(lesson.id)}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border-2 border-ink p-3 text-left brutal-press cursor-pointer",
                      isSelected
                        ? "bg-sand text-ink shadow-brutal-sm"
                        : "bg-forest-bg text-cream hover:bg-forest-elevated"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "font-display text-xs font-extrabold",
                          isSelected ? "text-ink/80" : "text-sand"
                        )}
                      >
                        Modul {lesson.order_index}
                      </span>
                      {lesson.is_completed && (
                        <CheckCircle2 className="h-4 w-4 text-mint shrink-0" aria-hidden="true" />
                      )}
                    </div>
                    <p className="mt-1.5 font-display text-xs font-extrabold leading-snug line-clamp-2">
                      {lesson.title}
                    </p>
                    <span
                      className={cn(
                        "mt-2 text-xs font-bold",
                        isSelected ? "text-ink/75" : "text-sage"
                      )}
                    >
                      <span className="font-mono tabular-nums">
                        {formatTimer(lesson.duration_seconds)}
                      </span>{" "}
                      • {lesson.checkpoints.length} Checkpoint
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
