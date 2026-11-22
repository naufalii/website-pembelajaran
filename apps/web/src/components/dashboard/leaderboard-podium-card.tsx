"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Crown } from "lucide-react";
import type { LeaderboardEntry } from "@fokussprints/shared";
import { BrutalAvatar } from "@/components/icons/brutal-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatNumberID } from "@/lib/utils";

export function LeaderboardPodiumCard({ entries }: { entries: LeaderboardEntry[] }) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  // Urutan visual podium: Juara 2 (kiri), Juara 1 (tengah paling tinggi), Juara 3 (kanan)
  const podiumSlots = [
    { entry: second, rank: 2, heightClass: "h-20", toneClass: "bg-forest-elevated text-cream" },
    { entry: first, rank: 1, heightClass: "h-28", toneClass: "bg-sand text-ink" },
    { entry: third, rank: 3, heightClass: "h-16", toneClass: "bg-sage/30 text-cream" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Leaderboard</CardTitle>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1 rounded-lg border-2 border-ink bg-forest-bg px-2.5 py-1 font-display text-xs font-bold text-sand brutal-press"
          >
            <span>Lihat Semua</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {entries.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-sand/50 bg-forest-bg px-4 py-7 text-center">
            <p className="font-display text-sm font-extrabold text-cream">
              Podium Masih Kosong
            </p>
            <p className="mt-1 text-xs text-sage">
              Raih XP pertamamu lewat Pomodoro atau kuis untuk naik ke podium #1.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 items-end gap-2.5">
            {podiumSlots.map((slot) => {
              if (!slot.entry) return <div key={slot.rank} />;
              const firstName = slot.entry.full_name.split(" ")[0] ?? slot.entry.full_name;
              return (
                <div key={slot.entry.user_id} className="flex flex-col items-center gap-2">
                  <div className="relative flex flex-col items-center">
                    {slot.rank === 1 && (
                      <Crown
                        className="mb-1 h-4 w-4 fill-sand text-sand"
                        aria-hidden="true"
                      />
                    )}
                    <BrutalAvatar
                      seed={slot.entry.avatar_seed}
                      name={slot.entry.full_name}
                      size={slot.rank === 1 ? "md" : "sm"}
                      className={
                        slot.entry.is_current_user
                          ? "ring-2 ring-mint ring-offset-2 ring-offset-forest-surface"
                          : ""
                      }
                    />
                  </div>
                  <span className="max-w-full truncate font-display text-xs font-extrabold text-cream">
                    {slot.entry.is_current_user ? `${firstName} (Kamu)` : firstName}
                  </span>

                  <div
                    className={cn(
                      "flex w-full flex-col items-center justify-center rounded-t-xl border-[2.5px] border-ink px-1 py-2 shadow-brutal-sm",
                      slot.heightClass,
                      slot.toneClass
                    )}
                  >
                    <span className="font-display text-lg font-extrabold leading-none">
                      #{slot.rank}
                    </span>
                    <span className="mt-1 font-mono text-[11px] font-bold tabular-nums opacity-90">
                      {formatNumberID(slot.entry.xp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
