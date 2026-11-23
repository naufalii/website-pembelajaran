"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AuthRequiredCard({
  sessionExpired = false,
  featureName = "halaman belajar personal",
  showCatalogLink = true,
}: {
  sessionExpired?: boolean;
  featureName?: string;
  showCatalogLink?: boolean;
}) {
  return (
    <Card accentBorder className="mx-auto max-w-xl">
      <CardContent className="flex flex-col items-center justify-center px-6 py-10 text-center sm:px-8">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border-[2.5px] border-ink bg-sand text-ink shadow-brutal-sm">
          <Lock className="h-7 w-7 stroke-[2.5]" aria-hidden="true" />
        </div>

        <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">
          {sessionExpired ? "Sesi Berakhir" : "Belum Masuk Akun"}
        </h2>

        <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-sage">
          {sessionExpired
            ? "Sesi masukmu sudah berakhir demi keamanan akun. Masuk kembali untuk melanjutkan progres belajar, XP, dan misi harianmu."
            : `Masuk ke akun FokusSprints terlebih dahulu untuk membuka ${featureName} serta menyimpan XP, streak, dan riwayat kuis.`}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/profil?tab=masuk">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>Masuk Akun</span>
            </Link>
          </Button>

          {showCatalogLink && (
            <Button asChild size="lg" variant="surface">
              <Link href="/kuis">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span>Jelajahi Katalog Kuis</span>
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
