"use client";

import * as React from "react";
import { Check, Flame } from "lucide-react";
import type { StreakDay } from "@fokussprints/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const WEEK_HEADER = ["S", "S", "R", "K", "J", "S", "M"] as const;

export function StreakCalendarCard({
  days,
  currentStreak,
}: {
  days: StreakDay[];
  currentStreak: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Streak &amp; Progres Mingguan</CardTitle>
          <span className="inline-flex items-center gap-1 rounded-lg border-2 border-ink bg-forest-bg px-2 py-0.5 text-xs font-extrabold text-sand">
            <Flame className="h-3.5 w-3.5 fill-sand text-sand" aria-hidden="true" />
            <span className="font-mono tabular-nums">{currentStreak}</span> hari
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 pt-1">
        {/* Header 7 hari S S R K J S M */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {WEEK_HEADER.map((label, idx) => (
            <span
              key={`${label}-${idx}`}
              className="font-mono text-xs font-extrabold text-sage"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Grid kotak 21 hari (3 minggu) */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => (
            <Tooltip key={day.date}>
              <TooltipTrigger asChild>
                <div
                  aria-label={`${day.date}: ${day.completed ? "Selesai" : "Belum aktif"}`}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg border-2 transition-[transform,background-color] duration-150",
                    day.is_today
                      ? day.completed
                        ? "border-cream bg-sand text-ink shadow-brutal-sm"
                        : "border-sand bg-forest-bg text-sand"
                      : day.completed
                      ? "border-ink bg-sand/85 text-ink shadow-brutal-sm"
                      : "border-ink/80 bg-forest-bg text-sage/60"
                  )}
                >
                  {day.completed ? (
                    day.is_today ? (
                      <Flame className="h-4 w-4 fill-terracotta text-ink stroke-[2.2]" aria-hidden="true" />
                    ) : (
                      <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
                    )
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-sage/40" aria-hidden="true" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {day.date} • {day.completed ? `${day.xp_earned} XP` : "Belum ada sesi"}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {currentStreak === 0 && (
          <p className="text-center text-xs font-medium text-sage pt-1">
            Selesaikan 1 sprint Pomodoro atau kuis hari ini untuk memulai streak.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
