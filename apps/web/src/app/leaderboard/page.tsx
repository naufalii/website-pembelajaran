"use client";

import * as React from "react";
import { Crown, Flame, RefreshCw, Trophy } from "lucide-react";
import { BrutalAvatar } from "@/components/icons/brutal-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaderboardQuery } from "@/lib/queries";
import { cn, formatNumberID } from "@/lib/utils";

export default function LeaderboardPage() {
  const { data, isLoading, isError, refetch } = useLeaderboardQuery();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card tone="cream" className="mx-auto max-w-lg p-6 text-center">
        <CardContent className="space-y-4 pt-4">
          <p className="font-display text-xl font-extrabold text-ink">
            Gagal memuat papan peringkat
          </p>
          <Button type="button" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  const topThree = data.entries.slice(0, 3);
  const podiumOrder = [
    { entry: topThree[1], rank: 2, heightClass: "h-28", bgClass: "bg-forest-elevated text-cream" },
    { entry: topThree[0], rank: 1, heightClass: "h-36", bgClass: "bg-sand text-ink" },
    { entry: topThree[2], rank: 3, heightClass: "h-24", bgClass: "bg-sage/30 text-cream" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">
            Papan Peringkat Mingguan Real-Time
          </h2>
          <p className="text-sm text-sage">
            Peringkat XP aktif diperbarui otomatis setiap kali kamu menyelesaikan kuis, misi, dan sesi Pomodoro.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="gold">
            Peringkat Kamu:{" "}
            <span className="font-mono tabular-nums">
              {data.current_user_rank > 0 ? `#${data.current_user_rank}` : "Belum Masuk"}
            </span>
          </Badge>
        </div>
      </div>

      {data.entries.length === 0 ? (
        <Card accentBorder>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-sand text-ink shadow-brutal-sm">
              <Trophy className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl font-extrabold text-cream">
              Papan Peringkat Masih Kosong
            </h3>
            <p className="mt-1.5 max-w-md text-sm text-sage leading-relaxed">
              Belum ada peserta yang mengumpulkan XP minggu ini. Mulai sesi Pomodoro 25 menit atau selesaikan kuis pertama untuk menempati Podium #1!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Podium 3 Besar */}
      <Card accentBorder>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-sand" aria-hidden="true" />
            <span>Podium 3 Besar Minggu Ini</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mx-auto grid max-w-2xl grid-cols-3 items-end gap-4 pt-4">
            {podiumOrder.map((slot) => {
              if (!slot.entry) return <div key={slot.rank} />;
              return (
                <div key={slot.entry.user_id} className="flex flex-col items-center gap-2">
                  {slot.rank === 1 && (
                    <Crown className="h-6 w-6 fill-sand text-sand" aria-hidden="true" />
                  )}
                  <BrutalAvatar
                    seed={slot.entry.avatar_seed}
                    name={slot.entry.full_name}
                    size={slot.rank === 1 ? "lg" : "md"}
                  />
                  <div className="text-center">
                    <p className="font-display text-sm font-extrabold text-cream">
                      {slot.entry.full_name}
                    </p>
                    <p className="text-xs font-bold text-sage">
                      Lv. <span className="font-mono tabular-nums">{slot.entry.level}</span>
                    </p>
                  </div>

                  <div
                    className={cn(
                      "flex w-full flex-col items-center justify-center rounded-t-2xl border-[2.5px] border-ink p-3 shadow-brutal-sm",
                      slot.heightClass,
                      slot.bgClass
                    )}
                  >
                    <span className="font-display text-2xl font-extrabold">#{slot.rank}</span>
                    <span className="mt-1 text-sm font-extrabold">
                      <span className="font-mono tabular-nums">{formatNumberID(slot.entry.xp)}</span> XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daftar Peringkat Lengkap */}
      <Card>
        <CardHeader>
          <CardTitle>Seluruh Peserta ({data.entries.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {data.entries.map((entry) => (
            <div
              key={entry.user_id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-xl border-[2.5px] border-ink px-4 py-3 shadow-brutal-sm",
                entry.is_current_user
                  ? "bg-sand text-ink"
                  : "bg-forest-bg text-cream"
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink font-mono text-sm font-extrabold",
                    entry.rank === 1
                      ? "bg-cream text-ink"
                      : entry.is_current_user
                      ? "bg-forest-bg text-cream"
                      : "bg-forest-surface text-sand"
                  )}
                >
                  #{entry.rank}
                </span>
                <BrutalAvatar seed={entry.avatar_seed} name={entry.full_name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-extrabold">
                    {entry.full_name} {entry.is_current_user ? "(Kamu)" : ""}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-bold",
                      entry.is_current_user ? "text-ink/80" : "text-sage"
                    )}
                  >
                    Level <span className="font-mono tabular-nums">{entry.level}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border-2 border-ink px-2.5 py-1 text-xs font-extrabold",
                    entry.is_current_user ? "bg-cream text-ink" : "bg-forest-surface text-sand"
                  )}
                >
                  <Flame className="h-3.5 w-3.5 text-terracotta" aria-hidden="true" />
                  <span className="font-mono tabular-nums">{entry.current_streak}</span> hari
                </span>
                <span className="font-mono text-base font-extrabold tabular-nums">
                  {formatNumberID(entry.xp)} XP
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
