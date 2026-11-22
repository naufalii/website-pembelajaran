"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Clock, Layers, Play, Zap } from "lucide-react";
import type { QuizType } from "@fokussprints/shared";
import { QuizCheckpointPanel } from "@/components/dashboard/quiz-checkpoint-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoursesQuery, useQuizzesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

const TYPE_FILTERS: Array<{ id: "all" | QuizType; label: string }> = [
  { id: "all", label: "Semua Kuis" },
  { id: "multiple_choice", label: "Pilihan Ganda 2x2" },
  { id: "true_false", label: "Benar / Salah" },
  { id: "flashcard_recall", label: "Flashcard Recall" },
];

export default function KuisSprintPage() {
  const [filterType, setFilterType] = React.useState<"all" | QuizType>("all");
  const [activeQuizIndex, setActiveQuizIndex] = React.useState(0);

  const { data: courses = [], isLoading: loadingCourses } = useCoursesQuery();
  const { data: quizzes = [], isLoading: loadingQuizzes } = useQuizzesQuery(
    filterType === "all" ? undefined : filterType
  );

  React.useEffect(() => {
    setActiveQuizIndex(0);
  }, [filterType]);

  const activeQuiz = quizzes[activeQuizIndex] ?? quizzes[0];

  return (
    <div className="space-y-6">
      {/* Header & Filter Sprint */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">
            Katalog Modul &amp; Kuis Sprint
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              className={cn(
                "rounded-xl border-[2.5px] border-ink px-3.5 py-2 font-display text-xs font-extrabold brutal-press cursor-pointer",
                filterType === f.id
                  ? "bg-sand text-ink shadow-brutal-sm"
                  : "bg-forest-surface text-cream hover:bg-forest-elevated"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Active Quiz Runner + Quiz Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] items-start">
        <div className="space-y-4">
          {loadingQuizzes ? (
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          ) : activeQuiz ? (
            <QuizCheckpointPanel
              quiz={activeQuiz}
              badgeLabel={`Sprint ${activeQuizIndex + 1} dari ${quizzes.length}`}
              onFinished={() => {
                if (quizzes.length > 1) {
                  setActiveQuizIndex((prev) => (prev + 1) % quizzes.length);
                }
              }}
              onSkip={() => {
                if (quizzes.length > 1) {
                  setActiveQuizIndex((prev) => (prev + 1) % quizzes.length);
                }
              }}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-4 px-8 py-10 text-center">
                <p className="font-display text-lg font-extrabold text-cream">
                  Belum Ada Soal Kuis
                </p>
                <Button asChild size="sm">
                  <Link href="/ai-upload">Buat Kuis dari AI Upload PDF</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Antrean Soal Kuis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-sand" aria-hidden="true" />
                <span>Daftar Kuis Cepat</span>
              </CardTitle>
              <Badge variant="surface">{quizzes.length} Soal</Badge>
            </div>
            <CardDescription>Pilih soal manapun untuk langsung diuji.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 max-h-[460px] overflow-y-auto pr-2">
            {quizzes.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-sand/50 bg-forest-bg p-4 text-center text-xs text-sage">
                Belum ada soal tersedia. Buat soal baru melalui menu AI Upload PDF.
              </p>
            ) : (
              quizzes.map((item, idx) => {
                const isSelected = idx === activeQuizIndex;
                const typeLabel =
                  item.quiz_type === "multiple_choice"
                    ? "Pilihan 2x2"
                    : item.quiz_type === "true_false"
                    ? "Benar/Salah"
                    : "Flashcard Recall";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveQuizIndex(idx)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border-2 border-ink p-3 text-left brutal-press cursor-pointer",
                      isSelected
                        ? "bg-sand text-ink shadow-brutal-sm"
                        : "bg-forest-bg text-cream hover:bg-forest-elevated"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-extrabold">
                        {item.title}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-xs font-bold",
                          isSelected ? "text-ink/75" : "text-sage"
                        )}
                      >
                        {typeLabel} • <span className="font-mono tabular-nums">+{item.xp_reward}</span> XP
                      </p>
                    </div>
                    <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Katalog Kursus Micro-Learning */}
      <section aria-label="Katalog Modul Micro-Learning" className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-sand" aria-hidden="true" />
          <h3 className="font-display text-xl font-extrabold text-cream">
            Modul Micro-Learning Tersedia
          </h3>
        </div>

        {loadingCourses ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center px-8 py-9 text-center">
              <p className="font-display text-base font-extrabold text-cream">
                Belum Ada Modul Micro-Learning
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <Card key={course.id} accentBorder>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="gold">{course.category}</Badge>
                    <Badge variant="surface">{course.difficulty}</Badge>
                  </div>
                  <CardTitle className="pt-1 text-xl">{course.title}</CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0">
                  <div className="flex items-center gap-4 text-xs font-bold text-sand">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="h-4 w-4" aria-hidden="true" />
                      <span className="font-mono tabular-nums">{course.lesson_count}</span> Video Mikro
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      <span className="font-mono tabular-nums">{course.estimated_minutes}</span> Menit
                    </span>
                  </div>
                  <Button asChild size="sm">
                    <Link href="/">Buka di Studio Belajar</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
