"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import type { FlashcardItem } from "@fokussprints/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function FlashcardDeck3D({ flashcards }: { flashcards: FlashcardItem[] }) {
  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);

  React.useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [flashcards]);

  if (flashcards.length === 0) {
    return (
      <div className="rounded-2xl border-[2.5px] border-ink bg-forest-bg p-6 text-center text-sage">
        Belum ada flashcard pada dokumen ini.
      </div>
    );
  }

  const active = flashcards[index] ?? flashcards[0]!;

  const handlePrev = () => {
    setFlipped(false);
    setIndex((prev) => (prev === 0 ? flashcards.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setFlipped(false);
    setIndex((prev) => (prev + 1) % flashcards.length);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="gold">
          Kartu {index + 1} / {flashcards.length}
        </Badge>
        <Badge variant="surface">{active.tag}</Badge>
      </div>

      <div className="perspective-1000">
        <button
          type="button"
          onClick={() => setFlipped((prev) => !prev)}
          aria-label={flipped ? "Balik ke pertanyaan flashcard" : "Balik ke jawaban flashcard"}
          className="relative block h-64 w-full cursor-pointer text-left focus-visible:outline-none"
        >
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="preserve-3d relative h-full w-full"
          >
            {/* Sisi Depan — Warm Cream Kontras Tinggi */}
            <div className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-2xl border-[2.5px] border-ink bg-cream p-6 text-ink shadow-brutal-md">
              <div className="flex items-center justify-between">
                <span className="rounded-lg border-2 border-ink bg-sand px-2.5 py-0.5 font-display text-xs font-extrabold text-ink">
                  Pertanyaan Recall
                </span>
                <span className="inline-flex items-center gap-1 font-sans text-xs font-bold text-ink/70">
                  <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Klik untuk balik
                </span>
              </div>
              <p className="font-display text-lg sm:text-xl font-extrabold leading-snug text-ink">
                {active.front}
              </p>
              <div className="flex items-center justify-between text-xs font-bold text-ink/70">
                <span>Uji ingatan sebelum membalik kartu</span>
                <span className="font-display">Kartu 3D</span>
              </div>
            </div>

            {/* Sisi Belakang — Sand Gold / Mint Accent */}
            <div
              className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-2xl border-[2.5px] border-ink bg-sand p-6 text-ink shadow-brutal-md"
              style={{ transform: "rotateY(180deg)" }}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-lg border-2 border-ink bg-mint px-2.5 py-0.5 font-display text-xs font-extrabold text-ink">
                  Inti Jawaban
                </span>
                <span className="inline-flex items-center gap-1 font-sans text-xs font-bold text-ink/80">
                  <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Balik lagi
                </span>
              </div>
              <p className="font-sans text-base sm:text-lg font-bold leading-relaxed text-ink">
                {active.back}
              </p>
              <div className="flex items-center justify-between text-xs font-bold text-ink/80">
                <span>Topik: {active.tag}</span>
                <span className="font-display">Active Recall</span>
              </div>
            </div>
          </motion.div>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="surface" size="sm" onClick={handlePrev}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Sebelumnya
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setFlipped((p) => !p)}>
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          {flipped ? "Lihat Soal" : "Lihat Jawaban"}
        </Button>
        <Button type="button" variant="default" size="sm" onClick={handleNext}>
          Berikutnya
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
