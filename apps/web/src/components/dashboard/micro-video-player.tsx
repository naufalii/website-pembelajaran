"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  FastForward,
  Pause,
  Play,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { LessonSummary, QuizItem } from "@fokussprints/shared";
import { QuizCheckpointPanel } from "@/components/dashboard/quiz-checkpoint-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpdateLessonProgressMutation } from "@/lib/queries";
import { useFocusStore } from "@/stores/focus-store";
import { cn, formatTimer } from "@/lib/utils";

export function MicroVideoPlayer({
  lesson,
  quizzes,
}: {
  lesson: LessonSummary;
  quizzes: QuizItem[];
}) {
  const videoSeconds = useFocusStore((s) => s.videoSeconds);
  const isVideoPlaying = useFocusStore((s) => s.isVideoPlaying);
  const activeCheckpointId = useFocusStore((s) => s.activeCheckpointId);
  const activeCheckpointQuizId = useFocusStore((s) => s.activeCheckpointQuizId);
  const clearedMap = useFocusStore((s) => s.clearedCheckpoints);

  const setVideoSeconds = useFocusStore((s) => s.setVideoSeconds);
  const setVideoPlaying = useFocusStore((s) => s.setVideoPlaying);
  const triggerCheckpoint = useFocusStore((s) => s.triggerCheckpoint);
  const clearCheckpoint = useFocusStore((s) => s.clearCheckpoint);
  const dismissCheckpointQuiz = useFocusStore((s) => s.dismissCheckpointQuiz);

  const updateProgressMutation = useUpdateLessonProgressMutation();

  const clearedCheckpoints = React.useMemo(() => {
    const localCleared = clearedMap[lesson.id] ?? [];
    return Array.from(new Set([...lesson.cleared_checkpoints, ...localCleared]));
  }, [lesson.id, lesson.cleared_checkpoints, clearedMap]);

  // Playback tick + Auto-Pause at checkpoint
  React.useEffect(() => {
    if (!isVideoPlaying || activeCheckpointQuizId) return;
    const timer = window.setInterval(() => {
      const current = useFocusStore.getState().videoSeconds;
      const nextSec = current + 1;

      const hit = lesson.checkpoints.find(
        (cp) => !clearedCheckpoints.includes(cp.id) && nextSec >= cp.at_seconds
      );
      if (hit) {
        setVideoSeconds(hit.at_seconds);
        triggerCheckpoint(hit.id, hit.quiz_id);
        return;
      }

      if (nextSec >= lesson.duration_seconds) {
        setVideoSeconds(lesson.duration_seconds);
        setVideoPlaying(false);
        void updateProgressMutation.mutateAsync({
          lessonId: lesson.id,
          watchedSeconds: lesson.duration_seconds,
          markCompleted: true,
        });
        return;
      }

      setVideoSeconds(nextSec);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    isVideoPlaying,
    activeCheckpointQuizId,
    lesson.id,
    lesson.duration_seconds,
    lesson.checkpoints,
    clearedCheckpoints,
    setVideoSeconds,
    setVideoPlaying,
    triggerCheckpoint,
    updateProgressMutation,
  ]);

  const activeQuiz = React.useMemo(
    () =>
      quizzes.find((q) => q.id === activeCheckpointQuizId) ??
      quizzes.find((q) => q.lesson_id === lesson.id) ??
      quizzes[0],
    [quizzes, activeCheckpointQuizId, lesson.id]
  );

  const nextCheckpoint = React.useMemo(
    () =>
      lesson.checkpoints.find((cp) => !clearedCheckpoints.includes(cp.id)) ??
      lesson.checkpoints[0],
    [lesson.checkpoints, clearedCheckpoints]
  );

  const progressPct = Math.min(
    100,
    Math.round((videoSeconds / Math.max(1, lesson.duration_seconds)) * 100)
  );

  // Split transcript into 3 segments synced to current video second
  const transcriptParts = React.useMemo(() => {
    const sentences = lesson.transcript
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return sentences;
  }, [lesson.transcript]);

  const activeSentenceIdx = Math.min(
    Math.max(0, transcriptParts.length - 1),
    Math.floor((videoSeconds / Math.max(1, lesson.duration_seconds)) * transcriptParts.length)
  );

  const handleTriggerDemoCheckpoint = () => {
    const target = nextCheckpoint;
    if (!target) return;
    setVideoSeconds(target.at_seconds);
    triggerCheckpoint(target.id, target.quiz_id);
  };

  const handleFinishCheckpoint = async () => {
    const cpId = activeCheckpointId;
    if (cpId) {
      clearCheckpoint(lesson.id, cpId);
      const allNowCleared = lesson.checkpoints.every(
        (cp) => cp.id === cpId || clearedCheckpoints.includes(cp.id)
      );
      await updateProgressMutation
        .mutateAsync({
          lessonId: lesson.id,
          watchedSeconds: videoSeconds,
          clearedCheckpointId: cpId,
          markCompleted: allNowCleared,
        })
        .catch(() => undefined);
    } else {
      dismissCheckpointQuiz();
    }
    setVideoPlaying(true);
  };

  const handleSkipCheckpoint = () => {
    if (activeCheckpointId) {
      clearCheckpoint(lesson.id, activeCheckpointId);
    } else {
      dismissCheckpointQuiz();
    }
    setVideoPlaying(true);
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {activeCheckpointQuizId && activeQuiz ? (
          <motion.div
            key="checkpoint-overlay"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            <QuizCheckpointPanel
              quiz={activeQuiz}
              badgeLabel="Auto-Pause Checkpoint"
              onFinished={() => void handleFinishCheckpoint()}
              onSkip={handleSkipCheckpoint}
            />
          </motion.div>
        ) : (
          <motion.div
            key="video-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* 16:9 Interactive Micro-Video Canvas */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-[2.5px] border-ink bg-forest-bg p-5 sm:p-6 shadow-brutal-sm flex flex-col justify-between">
              {/* Top Video Meta */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="gold">
                  Video Mikro #{lesson.order_index} • {Math.round(lesson.duration_seconds / 60)} Menit
                </Badge>
                <div className="flex items-center gap-2">
                  {lesson.is_completed && (
                    <Badge variant="mint">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Selesai
                    </Badge>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-lg border-2 border-ink bg-forest-surface px-2.5 py-1 font-display text-xs font-bold text-cream">
                    <Volume2 className="h-3.5 w-3.5 text-sand" aria-hidden="true" />
                    Audio ID
                  </span>
                </div>
              </div>

              {/* Center Visual Slide + Synced Caption */}
              <div className="my-auto space-y-3 py-3">
                <h3 className="font-display text-lg sm:text-2xl font-extrabold leading-tight text-cream">
                  {lesson.title}
                </h3>
                <div className="rounded-xl border-2 border-ink bg-forest-surface/95 p-3.5 shadow-brutal-sm">
                  <p className="text-xs sm:text-sm font-medium leading-relaxed text-cream">
                    {transcriptParts[activeSentenceIdx] ?? lesson.summary}
                  </p>
                </div>
              </div>

              {/* Bottom Playback Controls & Timeline Checkpoints */}
              <div className="space-y-3">
                {/* Timeline Track dengan Pin Checkpoint Emas */}
                <div className="relative flex h-6 items-center">
                  <div
                    role="slider"
                    aria-label="Timeline video mikro"
                    aria-valuemin={0}
                    aria-valuemax={lesson.duration_seconds}
                    aria-valuenow={videoSeconds}
                    tabIndex={0}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                      setVideoSeconds(Math.round(ratio * lesson.duration_seconds));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight") setVideoSeconds(Math.min(lesson.duration_seconds, videoSeconds + 10));
                      if (e.key === "ArrowLeft") setVideoSeconds(Math.max(0, videoSeconds - 10));
                    }}
                    className="relative h-3.5 w-full cursor-pointer overflow-visible rounded-full border-2 border-ink bg-forest-surface"
                  >
                    <div
                      className="h-full w-full origin-left rounded-full bg-mint transition-transform duration-200"
                      style={{ transform: `scaleX(${progressPct / 100})` }}
                    />
                    {lesson.checkpoints.map((cp) => {
                      const leftPct = Math.min(
                        96,
                        Math.max(4, Math.round((cp.at_seconds / lesson.duration_seconds) * 100))
                      );
                      const isDone = clearedCheckpoints.includes(cp.id);
                      return (
                        <button
                          key={cp.id}
                          type="button"
                          title={`${cp.title} (${formatTimer(cp.at_seconds)})`}
                          aria-label={`Lompat ke ${cp.title}`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setVideoSeconds(cp.at_seconds);
                            triggerCheckpoint(cp.id, cp.quiz_id);
                          }}
                          style={{ left: `${leftPct}%` }}
                          className={cn(
                            "absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink shadow-brutal-sm transition-transform hover:scale-110",
                            isDone ? "bg-mint" : "bg-sand"
                          )}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Controls Row */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setVideoPlaying(!isVideoPlaying)}
                    >
                      {isVideoPlaying ? (
                        <>
                          <Pause className="h-4 w-4" aria-hidden="true" />
                          Jeda Video
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" aria-hidden="true" />
                          Putar Video
                        </>
                      )}
                    </Button>
                    <span className="font-mono text-xs font-bold tabular-nums text-cream">
                      {formatTimer(videoSeconds)} / {formatTimer(lesson.duration_seconds)}
                    </span>
                  </div>

                  {nextCheckpoint && (
                    <Button
                      type="button"
                      size="sm"
                      variant="cream"
                      onClick={handleTriggerDemoCheckpoint}
                    >
                      <FastForward className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Uji Checkpoint Kuis</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Ringkasan Singkat & Status Checkpoint */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-forest-bg px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-sand inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Ringkasan Materi
                </p>
                <p className="mt-0.5 text-xs sm:text-sm text-sage leading-snug">
                  {lesson.summary}
                </p>
              </div>
              <div className="shrink-0 text-xs font-extrabold text-cream">
                <span className="font-mono tabular-nums">
                  {clearedCheckpoints.length}/{lesson.checkpoints.length}
                </span>{" "}
                Checkpoint
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
