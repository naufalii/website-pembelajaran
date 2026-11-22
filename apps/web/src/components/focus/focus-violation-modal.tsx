"use client";

import * as React from "react";
import { motion } from "motion/react";
import { AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFocusStore } from "@/stores/focus-store";

export function FocusViolationModal() {
  const open = useFocusStore((s) => s.violationModalOpen);
  const violations = useFocusStore((s) => s.tabViolations);
  const closeViolationModal = useFocusStore((s) => s.closeViolationModal);

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? closeViolationModal() : undefined)}>
      <DialogContent tone="danger" className="max-w-md">
        <motion.div
          key={violations}
          initial={{ x: -8 }}
          animate={{ x: [0, -10, 10, -8, 8, -4, 4, 0] }}
          transition={{ duration: 0.45 }}
          className="space-y-4"
        >
          <DialogHeader>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border-[2.5px] border-ink bg-cream text-terracotta shadow-brutal-sm">
              <ShieldAlert className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
            </div>
            <DialogTitle className="text-2xl font-extrabold text-ink">
              Fokus Terputus!
            </DialogTitle>
            <DialogDescription className="font-semibold text-ink/90">
              Kamu terdeteksi berpindah tab browser saat Focus Mode aktif. Bonus{" "}
              <span className="inline-flex items-center gap-1 rounded-md border-2 border-ink bg-cream px-1.5 py-0.5 font-display text-xs font-extrabold text-ink">
                2x XP Multiplier
              </span>{" "}
              untuk sesi ini otomatis hangus menjadi 1x XP normal.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border-[2.5px] border-ink bg-cream p-3.5 text-ink shadow-brutal-sm">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-terracotta" aria-hidden="true" />
                Pelanggaran tab tercatat
              </span>
              <span className="font-mono text-base font-extrabold">{violations}x</span>
            </div>
            <p className="mt-1.5 text-xs font-medium text-ink/80">
              Tetap di halaman FokusSprints sampai timer 25:00 selesai untuk mengklaim lencana Fokus Penuh pada sprint berikutnya.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="cream"
              onClick={closeViolationModal}
              className="w-full"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Kembali ke Mode Belajar
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
