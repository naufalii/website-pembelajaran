"use client";

import * as React from "react";
import { motion } from "motion/react";
import type { UserProfile } from "@fokussprints/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GeometricStar } from "@/components/icons/brutal-icons";
import { formatNumberID } from "@/lib/utils";

export function XpProgressRing({ user }: { user: UserProfile }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  const span = Math.max(1, user.xp_next_level_target - user.xp_current_level_floor);
  const progressRatio =
    user.xp === 0
      ? 0
      : Math.min(1, Math.max(0.04, (user.xp - user.xp_current_level_floor) / span));
  const targetOffset = circumference * (1 - progressRatio);

  return (
    <Card accentBorder className="flex flex-col justify-between">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>XP Progress Ring</CardTitle>
          <span className="text-xs font-bold text-sand">
            +<span className="font-mono tabular-nums">{formatNumberID(Math.max(0, user.xp_next_level_target - user.xp))}</span> XP lagi
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center pt-1 pb-5">
        <div className="relative flex h-40 w-40 items-center justify-center">
          <svg
            viewBox="0 0 144 144"
            className="h-full w-full -rotate-90"
            role="img"
            aria-label={`Progres XP ${user.xp} dari ${user.xp_next_level_target}`}
          >
            {/* Outer dark outline */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth="18"
            />
            {/* Track background */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              fill="none"
              stroke="var(--color-bg)"
              strokeWidth="12"
            />
            {/* Animated progress arc */}
            <motion.circle
              cx="72"
              cy="72"
              r={radius}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: targetOffset }}
              transition={{ duration: 0.75, ease: "easeOut" }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-2xl font-extrabold tracking-tight tabular-nums text-cream">
              {formatNumberID(user.xp)}
            </span>
            <span className="text-xs font-bold text-sage">
              / <span className="font-mono tabular-nums">{formatNumberID(user.xp_next_level_target)}</span> XP
            </span>
          </div>
        </div>

        <div className="-mt-2 flex items-center gap-3">
          <GeometricStar variant="mint" className="h-4 w-4" />
          <Badge variant="gold" className="px-4 py-1 text-sm">
            Lv. <span className="font-mono tabular-nums">{user.level}</span>
          </Badge>
          <GeometricStar variant="cream" className="h-5 w-5" />
          <GeometricStar variant="gold" className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
