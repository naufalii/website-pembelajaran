"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { AuthRequiredCard } from "@/components/auth/auth-required-card";
import { CoreLearningCard } from "@/components/dashboard/core-learning-card";
import { DailyQuestsCard } from "@/components/dashboard/daily-quests-card";
import { LeaderboardPodiumCard } from "@/components/dashboard/leaderboard-podium-card";
import { PomodoroEngine } from "@/components/dashboard/pomodoro-engine";
import { StreakCalendarCard } from "@/components/dashboard/streak-calendar-card";
import { XpProgressRing } from "@/components/dashboard/xp-progress-ring";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/api-client";
import { useDashboardQuery, useQuizzesQuery } from "@/lib/queries";
import { useAuthStore } from "@/stores/auth-store";

export default function HomeDashboardPage() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);

  const {
    data: dashboard,
    isLoading,
    isError,
    error,
    refetch,
  } = useDashboardQuery();
  const { data: quizzes = [] } = useQuizzesQuery();

  if (!hydrated || (Boolean(token) && isLoading)) {
    return (
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.28fr)_minmax(240px,0.58fr)_minmax(240px,0.58fr)]">
        <div className="space-y-5">
          <Skeleton className="h-[460px] w-full rounded-2xl" />
          <Skeleton className="h-[260px] w-full rounded-2xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-[250px] w-full rounded-2xl" />
          <Skeleton className="h-[260px] w-full rounded-2xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-[250px] w-full rounded-2xl" />
          <Skeleton className="h-[310px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!token || isUnauthorizedError(error)) {
    return (
      <div className="py-6">
        <AuthRequiredCard
          sessionExpired={sessionExpired || isUnauthorizedError(error)}
          featureName="Beranda & Studio Belajar"
          showCatalogLink
        />
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <Card tone="cream" className="mx-auto max-w-xl p-6 text-center">
        <CardContent className="space-y-4 pt-4">
          <h2 className="font-display text-2xl font-extrabold text-ink">
            Gagal Memuat Halaman Belajar
          </h2>
          <p className="text-sm font-medium text-ink/80">
            Layanan sedang sibuk atau koneksi terputus sementara. Coba muat ulang beberapa saat lagi.
          </p>
          <Button type="button" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Muat Ulang Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  const allQuizzes =
    quizzes.length > 0
      ? quizzes
      : dashboard.daily_quiz
      ? [dashboard.daily_quiz]
      : [];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.28fr)_minmax(240px,0.58fr)_minmax(240px,0.58fr)] items-start">
      {/* Kolom Kiri-Tengah: Core Learning Card + Pomodoro Focus Engine */}
      <section aria-label="Area Belajar Utama" className="space-y-5 min-w-0">
        <CoreLearningCard
          course={dashboard.active_course}
          dailyQuiz={dashboard.daily_quiz}
          quizzes={allQuizzes}
        />
        <PomodoroEngine course={dashboard.active_course} />
      </section>

      {/* Kolom Tengah-Kanan: Streak & Leaderboard Mini Podium */}
      <section aria-label="Progres Mingguan dan Podium" className="space-y-5 min-w-0">
        <StreakCalendarCard
          days={dashboard.streak_calendar}
          currentStreak={dashboard.user.current_streak}
        />
        <LeaderboardPodiumCard entries={dashboard.leaderboard_top} />
      </section>

      {/* Kolom Kanan: XP Progress Ring & Misi Harian */}
      <section aria-label="Statistik XP dan Misi Harian" className="space-y-5 min-w-0">
        <XpProgressRing user={dashboard.user} />
        <DailyQuestsCard quests={dashboard.daily_quests} />
      </section>
    </div>
  );
}
