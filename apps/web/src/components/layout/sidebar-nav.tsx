"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  FileUp,
  Home,
  Trophy,
  Zap,
} from "lucide-react";
import type { UserProfile } from "@fokussprints/shared";
import { BrandMascotIcon, BrutalAvatar } from "@/components/icons/brutal-icons";
import { Progress } from "@/components/ui/progress";
import { usePrefetchRoute } from "@/lib/queries";
import { cn, formatNumberID } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Beranda & Belajar", icon: Home },
  { href: "/kuis", label: "Kuis & Sprint", icon: Zap },
  { href: "/ai-upload", label: "AI Upload PDF", icon: FileUp },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profil", label: "Lencana & Profil", icon: Award },
] as const;

export function SidebarNav({
  user,
  onNavigate,
}: {
  user?: UserProfile;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const prefetchRoute = usePrefetchRoute();

  const floorXp = user?.xp_current_level_floor ?? 0;
  const nextXp = user?.xp_next_level_target ?? 300;
  const currentXp = user?.xp ?? 0;
  const span = Math.max(1, nextXp - floorXp);
  const pct =
    currentXp === 0
      ? 0
      : Math.min(100, Math.max(0, Math.round(((currentXp - floorXp) / span) * 100)));

  return (
    <div className="flex h-full flex-col justify-between bg-forest-surface p-4">
      <div className="space-y-6">
        {/* Top Brand */}
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-forest-bg px-3.5 py-3 shadow-brutal-sm brutal-press"
        >
          <BrandMascotIcon className="h-9 w-9" />
          <div>
            <span className="block font-display text-lg font-extrabold leading-none tracking-tight text-cream">
              FokusSprints
            </span>
            <span className="mt-1 block text-xs font-semibold text-sage">
              Belajar Mikro & Fokus
            </span>
          </div>
        </Link>

        {/* Navigation Pills */}
        <nav aria-label="Navigasi utama" className="space-y-2.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                onMouseEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-[2.5px] px-3.5 py-2.5 font-display text-sm font-extrabold brutal-press",
                  isActive
                    ? "border-ink bg-sand text-ink shadow-brutal-sm"
                    : "border-ink bg-forest-bg text-cream shadow-brutal-sm hover:bg-forest-elevated hover:border-sand/70"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 stroke-[2.5]" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom-Left Docked User Level Card */}
      <Link
        href={user ? "/profil" : "/profil?tab=masuk"}
        onClick={onNavigate}
        onMouseEnter={() => prefetchRoute("/profil")}
        onFocus={() => prefetchRoute("/profil")}
        className="mt-6 block rounded-2xl border-[2.5px] border-ink bg-forest-bg p-3.5 shadow-brutal-sm brutal-press"
      >
        <div className="flex items-center gap-3">
          <BrutalAvatar
            seed={user?.avatar_seed ?? "fokus"}
            name={user?.full_name ?? "Masuk Akun"}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-extrabold text-cream">
              {user ? user.full_name : "Belum Masuk"}
            </p>
            {user ? (
              <div className="mt-0.5 flex items-center justify-between">
                <span className="font-display text-xs font-bold text-sand">
                  Level <span className="font-mono tabular-nums">{user.level}</span>
                </span>
                <span className="text-xs font-semibold text-sage">
                  <span className="font-mono tabular-nums">{formatNumberID(currentXp)}</span> XP
                </span>
              </div>
            ) : (
              <p className="mt-0.5 text-xs font-bold text-sand">
                Masuk atau daftar akun
              </p>
            )}
          </div>
        </div>
        {user && (
          <div className="mt-3">
            <Progress value={pct} aria-label="Progres level pengguna" className="h-3" />
          </div>
        )}
      </Link>
    </div>
  );
}
