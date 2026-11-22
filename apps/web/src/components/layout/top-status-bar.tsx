"use client";

import * as React from "react";
import { Flame, Lock, Menu, Play, ShieldCheck } from "lucide-react";
import type { UserProfile } from "@fokussprints/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStartFocusMutation } from "@/lib/queries";
import { useFocusStore } from "@/stores/focus-store";
import { formatTimer } from "@/lib/utils";

export function TopStatusBar({
  user,
  onOpenMobileMenu,
}: {
  user?: UserProfile;
  onOpenMobileMenu: () => void;
}) {
  const isFocusModeActive = useFocusStore((s) => s.isFocusModeActive);
  const remainingSeconds = useFocusStore((s) => s.remainingSeconds);
  const xpMultiplier = useFocusStore((s) => s.xpMultiplier);
  const startFocusMode = useFocusStore((s) => s.startFocusMode);
  const startFocusMutation = useStartFocusMutation();

  const firstName = (user?.full_name ?? "Pelajar").split(" ")[0] ?? "Pelajar";
  const streakCount = user?.current_streak ?? 0;

  const handleQuickFocus = async () => {
    if (isFocusModeActive) return;
    try {
      const session = await startFocusMutation.mutateAsync(25);
      startFocusMode(session.id, 25);
    } catch {
      startFocusMode("local-focus-session", 25);
    }
  };

  return (
    <header className="relative z-40 shrink-0 border-b-2 border-ink bg-forest-bg px-4 py-3.5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
        {/* Kiri: Hamburger Mobile + Sapaan Personal */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            type="button"
            variant="surface"
            size="icon"
            onClick={onOpenMobileMenu}
            aria-label="Buka menu navigasi"
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-cream truncate">
              Selamat Belajar, {firstName}!
            </h1>
            <p className="text-xs sm:text-sm font-medium text-sage">
              Target harian: tuntaskan 1 video mikro &amp; 1 sprint fokus 25 menit.
            </p>
          </div>
        </div>

        {/* Kanan: Badge Streak + Tombol/Badge FOCUS MODE */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="gold" className="h-10 px-3.5 text-xs sm:text-sm">
            <Flame className="h-4 w-4 fill-terracotta text-ink" aria-hidden="true" />
            <span>{streakCount} Hari Streak</span>
          </Badge>

          {isFocusModeActive ? (
            <div
              role="status"
              aria-live="polite"
              className="inline-flex h-10 items-center gap-2 rounded-xl border-[2.5px] border-ink bg-terracotta px-3.5 font-display text-xs sm:text-sm font-extrabold text-ink shadow-brutal-sm"
            >
              <Lock className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden="true" />
              <span>
                FOCUS MODE AKTIF • {xpMultiplier}x XP
              </span>
              <span className="rounded-lg border-2 border-ink bg-cream px-2 py-0.5 font-mono text-xs font-extrabold tabular-nums text-ink">
                {formatTimer(remainingSeconds)}
              </span>
            </div>
          ) : (
            <Button
              type="button"
              variant="surface"
              onClick={() => void handleQuickFocus()}
              disabled={startFocusMutation.isPending}
              className="h-10 border-sand/80"
            >
              {startFocusMutation.isPending ? (
                <ShieldCheck className="h-4 w-4 text-sand" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4 fill-sand text-sand" aria-hidden="true" />
              )}
              <span className="font-mono">Mulai Fokus 25:00</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
