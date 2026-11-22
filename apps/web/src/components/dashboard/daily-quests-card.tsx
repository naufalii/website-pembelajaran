"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import type { DailyQuest } from "@fokussprints/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useClaimQuestMutation } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function DailyQuestsCard({ quests }: { quests: DailyQuest[] }) {
  const claimMutation = useClaimQuestMutation();
  const [sparkleQuestId, setSparkleQuestId] = React.useState<string | null>(null);

  const handleClaim = async (questId: string) => {
    setSparkleQuestId(questId);
    try {
      await claimMutation.mutateAsync(questId);
    } finally {
      window.setTimeout(() => setSparkleQuestId(null), 900);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Misi Harian</CardTitle>
          <span className="text-xs font-bold text-sage">
            <span className="font-mono tabular-nums">
              {quests.filter((q) => q.is_completed).length}/{quests.length}
            </span>{" "}
            Selesai
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 pt-1">
        {quests.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-sand/50 bg-forest-bg px-4 py-7 text-center">
            <p className="font-display text-sm font-extrabold text-cream">
              Belum Ada Misi Harian
            </p>
          </div>
        ) : (
          quests.map((quest) => {
            const canClaim = quest.is_completed && !quest.is_claimed;
            const isSparkling = sparkleQuestId === quest.id;

            return (
              <motion.div
                key={quest.id}
                animate={isSparkling ? { scale: [1, 1.03, 1] } : undefined}
                transition={{ duration: 0.35 }}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border-2 border-ink p-3",
                  quest.is_claimed
                    ? "bg-forest-bg/70 opacity-85"
                    : canClaim
                    ? "bg-forest-elevated border-sand"
                    : "bg-forest-bg"
                )}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Checkbox
                    checked={quest.is_completed}
                    disabled
                    aria-label={`Status misi ${quest.title}`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "font-display text-xs sm:text-sm font-bold leading-snug text-cream",
                        quest.is_claimed && "line-through text-sage"
                      )}
                    >
                      {quest.title}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-sand">
                      <span className="font-mono tabular-nums">+{quest.xp_reward}</span> XP •{" "}
                      <span className="font-mono tabular-nums">
                        {quest.current_count}/{quest.target_count}
                      </span>
                    </p>
                  </div>
                </div>

                {canClaim ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleClaim(quest.id)}
                    disabled={claimMutation.isPending}
                    className="shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Klaim XP
                  </Button>
                ) : quest.is_claimed ? (
                  <span className="shrink-0 rounded-lg border-2 border-ink bg-mint px-2.5 py-1 font-display text-xs font-extrabold text-ink">
                    Diklaim
                  </span>
                ) : null}
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
