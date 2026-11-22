"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, FileUp, PlayCircle, Zap } from "lucide-react";
import type { CourseDetail, QuizItem } from "@fokussprints/shared";
import { MicroVideoPlayer } from "@/components/dashboard/micro-video-player";
import { QuizCheckpointPanel } from "@/components/dashboard/quiz-checkpoint-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFocusStore } from "@/stores/focus-store";

function EmptyLearningState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-[2.5px] border-dashed border-sand/60 bg-forest-bg px-6 py-10 text-center">
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-sand text-ink shadow-brutal-sm">
        <BookOpen className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-extrabold text-cream">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-xs sm:text-sm text-sage leading-relaxed">
          {description}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        <Button asChild size="sm">
          <Link href="/ai-upload">
            <FileUp className="h-4 w-4" aria-hidden="true" />
            <span>Mulai dari AI Upload PDF</span>
          </Link>
        </Button>
        <Button asChild size="sm" variant="surface">
          <Link href="/kuis">Lihat Katalog Kuis</Link>
        </Button>
      </div>
    </div>
  );
}

export function CoreLearningCard({
  course,
  dailyQuiz,
  quizzes,
}: {
  course: CourseDetail | null;
  dailyQuiz: QuizItem | null;
  quizzes: QuizItem[];
}) {
  const activeLessonId = useFocusStore((s) => s.activeLessonId);
  const setActiveLessonId = useFocusStore((s) => s.setActiveLessonId);
  const [activeTab, setActiveTab] = React.useState<"video" | "quiz">("video");

  const lessons = React.useMemo(() => course?.lessons ?? [], [course]);

  const activeLesson = React.useMemo(() => {
    return lessons.find((l) => l.id === activeLessonId) ?? lessons[0] ?? null;
  }, [lessons, activeLessonId]);

  React.useEffect(() => {
    if (!activeLessonId && lessons[0]) {
      setActiveLessonId(lessons[0].id);
    }
  }, [activeLessonId, lessons, setActiveLessonId]);

  return (
    <Card accentBorder>
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val === "quiz" ? "quiz" : "video")}
      >
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-xs font-bold text-sand">
                {course ? course.category : "Studio Belajar Mikro"}
              </p>
              <CardTitle className="text-xl text-cream">
                {course ? course.title : "Belum Ada Kursus Aktif"}
              </CardTitle>
            </div>

            <TabsList>
              <TabsTrigger value="video">
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                <span>Video Mikro</span>
              </TabsTrigger>
              <TabsTrigger value="quiz">
                <Zap className="h-4 w-4" aria-hidden="true" />
                <span>Kuis Kilat Harian</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <TabsContent value="video" className="mt-0">
            {activeLesson ? (
              <MicroVideoPlayer lesson={activeLesson} quizzes={quizzes} />
            ) : (
              <EmptyLearningState title="Belum Ada Materi Belajar" />
            )}
          </TabsContent>

          <TabsContent value="quiz" className="mt-0">
            {dailyQuiz ? (
              <QuizCheckpointPanel
                quiz={dailyQuiz}
                badgeLabel="Kuis Kilat Harian"
                onFinished={() => setActiveTab("video")}
              />
            ) : (
              <EmptyLearningState title="Belum Ada Kuis Kilat Harian" />
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
