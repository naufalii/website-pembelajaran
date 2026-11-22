"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Check, Eye, Sparkles, X } from "lucide-react";
import type { QuizItem, QuizSubmitResponse } from "@fokussprints/shared";
import { QuizMascot } from "@/components/icons/brutal-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubmitQuizMutation } from "@/lib/queries";
import { useFocusStore } from "@/stores/focus-store";
import { cn } from "@/lib/utils";

export function QuizCheckpointPanel({
  quiz,
  badgeLabel = "Kuis Kilat",
  onFinished,
  onSkip,
}: {
  quiz: QuizItem;
  badgeLabel?: string;
  onFinished?: (result: QuizSubmitResponse) => void;
  onSkip?: () => void;
}) {
  const submitMutation = useSubmitQuizMutation();
  const activeSessionId = useFocusStore((s) => s.activeSessionId);
  const xpMultiplier = useFocusStore((s) => s.xpMultiplier);

  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);
  const [selectedBoolean, setSelectedBoolean] = React.useState<boolean | null>(null);
  const [flashcardRevealed, setFlashcardRevealed] = React.useState(false);
  const [result, setResult] = React.useState<QuizSubmitResponse | null>(null);
  const [shakeTick, setShakeTick] = React.useState(0);

  React.useEffect(() => {
    setSelectedOption(null);
    setSelectedBoolean(null);
    setFlashcardRevealed(false);
    setResult(null);
  }, [quiz.id]);

  const payload = quiz.question_payload;
  const mood = result ? (result.is_correct ? "happy" : "oops") : "thinking";

  const canSubmit =
    payload.type === "multiple_choice"
      ? selectedOption !== null
      : payload.type === "true_false"
      ? selectedBoolean !== null
      : flashcardRevealed;

  const handleSubmit = async (selfRecalled?: boolean) => {
    if (submitMutation.isPending) return;
    const response = await submitMutation.mutateAsync({
      quizId: quiz.id,
      body: {
        selected_option_id: selectedOption ?? undefined,
        selected_boolean: selectedBoolean ?? undefined,
        self_recalled: selfRecalled,
        focus_session_id: activeSessionId,
      },
    });
    setResult(response);
    if (!response.is_correct) {
      setShakeTick((prev) => prev + 1);
    }
  };

  return (
    <motion.div
      key={`${quiz.id}-${shakeTick}`}
      initial={{ opacity: 0, y: 8 }}
      animate={
        result && !result.is_correct
          ? { opacity: 1, y: 0, x: [0, -8, 8, -6, 6, 0] }
          : { opacity: 1, y: 0, x: 0 }
      }
      transition={{ duration: 0.35 }}
      className="space-y-4 rounded-2xl border-[2.5px] border-ink bg-cream p-5 text-ink shadow-brutal-sm"
    >
      {/* Header Badge & XP */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="gold">{badgeLabel}</Badge>
          {xpMultiplier === 2 && (
            <Badge variant="danger">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              2x Focus XP Aktif
            </Badge>
          )}
        </div>
        <span className="text-xs font-extrabold text-ink/80">
          <span className="font-mono tabular-nums">+{quiz.xp_reward * xpMultiplier}</span> XP
        </span>
      </div>

      {/* Maskot Mini + Pertanyaan Tegas */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <QuizMascot mood={mood} className="h-20 w-20 self-start sm:self-center" />
        <div className="space-y-1 flex-1">
          <p className="font-display text-xs font-extrabold text-forest-surface">
            {quiz.title}
          </p>
          <h4 className="font-display text-lg sm:text-xl font-extrabold leading-snug text-ink">
            {payload.type === "multiple_choice"
              ? payload.prompt
              : payload.type === "true_false"
              ? payload.statement
              : payload.front_prompt}
          </h4>
        </div>
      </div>

      {/* Pilihan Jawaban Berdasarkan Discriminated Union */}
      {payload.type === "multiple_choice" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {payload.options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            const isCorrectOpt = result && opt.id === payload.correct_option_id;
            const isWrongSelected = result && isSelected && !result.is_correct;

            return (
              <button
                key={opt.id}
                type="button"
                disabled={Boolean(result)}
                onClick={() => setSelectedOption(opt.id)}
                className={cn(
                  "flex items-center justify-between gap-2.5 rounded-xl border-[2.5px] border-ink px-4 py-3 text-left font-sans text-sm font-bold shadow-brutal-sm brutal-press cursor-pointer disabled:cursor-default",
                  isCorrectOpt
                    ? "bg-mint text-ink"
                    : isWrongSelected
                    ? "bg-terracotta text-ink"
                    : isSelected
                    ? "bg-sand text-ink"
                    : "bg-forest-bg text-cream hover:bg-forest-surface"
                )}
              >
                <span className="flex items-start gap-2.5 min-w-0">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-cream font-mono text-xs font-extrabold text-ink">
                    {opt.id}
                  </span>
                  <span className="leading-snug">{opt.text}</span>
                </span>
                {isCorrectOpt && <Check className="h-4 w-4 shrink-0 stroke-[3]" aria-hidden="true" />}
                {isWrongSelected && <X className="h-4 w-4 shrink-0 stroke-[3]" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      {payload.type === "true_false" && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: true, label: "Benar" },
            { value: false, label: "Salah" },
          ].map((choice) => {
            const isSelected = selectedBoolean === choice.value;
            const isCorrectOpt = result && choice.value === payload.is_true;
            const isWrongSelected = result && isSelected && !result.is_correct;

            return (
              <button
                key={String(choice.value)}
                type="button"
                disabled={Boolean(result)}
                onClick={() => setSelectedBoolean(choice.value)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border-[2.5px] border-ink px-4 py-3.5 font-display text-base font-extrabold shadow-brutal-sm brutal-press cursor-pointer",
                  isCorrectOpt
                    ? "bg-mint text-ink"
                    : isWrongSelected
                    ? "bg-terracotta text-ink"
                    : isSelected
                    ? "bg-sand text-ink"
                    : "bg-forest-bg text-cream hover:bg-forest-surface"
                )}
              >
                <span>{choice.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {payload.type === "flashcard_recall" && (
        <div className="space-y-3">
          {payload.hint && (
            <p className="rounded-xl border-2 border-ink bg-sand/40 px-3 py-2 text-xs font-bold text-ink">
              Petunjuk: {payload.hint}
            </p>
          )}
          {flashcardRevealed ? (
            <div className="rounded-xl border-[2.5px] border-ink bg-mint/40 p-4 text-sm font-bold text-ink">
              <p className="font-display text-xs font-extrabold mb-1">Inti Jawaban:</p>
              <p>{payload.back_answer}</p>
            </div>
          ) : (
            <Button
              type="button"
              variant="surface"
              onClick={() => setFlashcardRevealed(true)}
              className="w-full"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Buka Jawaban Recall
            </Button>
          )}
        </div>
      )}

      {/* Feedback Hasil */}
      {result && (
        <div
          className={cn(
            "rounded-xl border-[2.5px] border-ink p-3.5 text-sm font-bold text-ink",
            result.is_correct ? "bg-mint" : "bg-terracotta"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-base font-extrabold">
              {result.is_correct
                ? `Tepat Sekali! +${result.xp_earned} XP`
                : "Belum Tepat — Pelajari Penjelasannya"}
            </span>
            <span className="rounded-lg border-2 border-ink bg-cream px-2 py-0.5 text-xs font-extrabold">
              Peringkat <span className="font-mono tabular-nums">#{result.leaderboard_rank}</span>
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm font-medium text-ink/90">
            {result.explanation}
          </p>
        </div>
      )}

      {/* Tombol Aksi */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {!result ? (
          payload.type === "flashcard_recall" ? (
            <div className="flex flex-wrap items-center gap-2.5 w-full">
              <Button
                type="button"
                disabled={!canSubmit || submitMutation.isPending}
                onClick={() => void handleSubmit(true)}
                className="flex-1"
              >
                Saya Ingat Konsep Ini
              </Button>
              <Button
                type="button"
                variant="surface"
                disabled={!canSubmit || submitMutation.isPending}
                onClick={() => void handleSubmit(false)}
              >
                Perlu Ulang
              </Button>
              {onSkip && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onSkip}
                  className="text-ink hover:text-ink"
                >
                  Lewati
                </Button>
              )}
            </div>
          ) : (
            <>
              <Button
                type="button"
                disabled={!canSubmit || submitMutation.isPending}
                onClick={() => void handleSubmit()}
                size="lg"
                className="flex-1 sm:flex-none sm:min-w-[190px]"
              >
                {submitMutation.isPending ? "Memeriksa..." : "Kunci Jawaban"}
              </Button>
              {onSkip && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onSkip}
                  className="text-ink/80 hover:bg-ink/10 hover:text-ink"
                >
                  Lewati
                </Button>
              )}
            </>
          )
        ) : (
          <Button
            type="button"
            variant="surface"
            onClick={() => onFinished?.(result)}
            className="w-full sm:w-auto"
          >
            Lanjutkan Sesi Belajar
          </Button>
        )}
      </div>
    </motion.div>
  );
}
