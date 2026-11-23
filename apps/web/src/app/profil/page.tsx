"use client";

import * as React from "react";
import {
  Award,
  CheckCircle2,
  Flame,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Timer,
  UserCheck,
} from "lucide-react";
import { BrutalAvatar } from "@/components/icons/brutal-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/api-client";
import {
  useDashboardQuery,
  useLoginMutation,
  useLogout,
  useProfileQuery,
  useRegisterMutation,
} from "@/lib/queries";
import { useAuthStore } from "@/stores/auth-store";
import { cn, formatNumberID } from "@/lib/utils";

const BADGE_SKELETON_SLOTS = [0, 1, 2, 3, 4, 5] as const;
const ATTEMPT_SKELETON_SLOTS = [0, 1, 2, 3] as const;

export default function ProfilLencanaPage() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);

  // Gunakan cache dashboard?.user agar identitas profil tampil instan (<100ms) tanpa menunggu API profil
  const { data: dashboard } = useDashboardQuery();
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError,
    error,
    refetch,
  } = useProfileQuery();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logout = useLogout();

  const [authMode, setAuthMode] = React.useState<"login" | "register">("login");
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loginMessage, setLoginMessage] = React.useState<string | null>(null);
  const [loginIsError, setLoginIsError] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "daftar" || tab === "register") {
      setAuthMode("register");
    } else if (tab === "masuk" || tab === "login") {
      setAuthMode("login");
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMessage(null);
    setLoginIsError(false);
    try {
      if (authMode === "register") {
        const res = await registerMutation.mutateAsync({ fullName, email, password });
        setLoginMessage(`Akun baru ${res.user.full_name} berhasil dibuat & aktif.`);
      } else {
        const res = await loginMutation.mutateAsync({ email, password });
        setLoginMessage(`Berhasil masuk sebagai ${res.user.full_name}.`);
      }
      setPassword("");
    } catch (err) {
      setLoginIsError(true);
      setLoginMessage(
        err instanceof Error
          ? err.message
          : "Gagal memproses permintaan. Periksa kembali email dan kata sandimu."
      );
    }
  };

  const renderAuthCard = (accentBorder = false) => (
    <Card accentBorder={accentBorder}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-sand" aria-hidden="true" />
            <span>{authMode === "login" ? "Masuk Akun" : "Daftar Akun Baru"}</span>
          </CardTitle>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={authMode === "login" ? "default" : "surface"}
              onClick={() => {
                setAuthMode("login");
                setLoginMessage(null);
              }}
            >
              Masuk
            </Button>
            <Button
              type="button"
              size="sm"
              variant={authMode === "register" ? "default" : "surface"}
              onClick={() => {
                setAuthMode("register");
                setLoginMessage(null);
              }}
            >
              Daftar
            </Button>
          </div>
        </div>
        <CardDescription>
          {authMode === "login"
            ? "Masuk untuk membuka progres belajar, XP, streak, dan koleksi lencanamu."
            : "Buat akun FokusSprints baru untuk mulai mencatat progres harian."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleAuthSubmit(e)} className="space-y-3">
          {authMode === "register" && (
            <div>
              <label htmlFor="reg-name" className="mb-1 block text-xs font-bold text-cream">
                Nama Lengkap
              </label>
              <Input
                id="reg-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="login-email" className="mb-1 block text-xs font-bold text-cream">
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
            />
          </div>
          <div>
            <label htmlFor="login-pass" className="mb-1 block text-xs font-bold text-cream">
              Kata Sandi
            </label>
            <Input
              id="login-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              required
            />
          </div>
          {loginMessage && (
            <p
              className={cn(
                "rounded-xl border-2 border-ink px-3 py-2 text-xs font-bold text-ink",
                loginIsError ? "bg-terracotta" : "bg-mint"
              )}
            >
              {loginMessage}
            </p>
          )}
          <Button
            type="submit"
            disabled={loginMutation.isPending || registerMutation.isPending}
            className="w-full"
          >
            {loginMutation.isPending || registerMutation.isPending
              ? "Memproses…"
              : authMode === "register"
              ? "Daftar"
              : "Masuk"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  // Non-blocking: saat belum login (atau sesi berakhir), langsung tampilkan kartu Masuk Akun tanpa loader
  const isUnauthenticated = !hydrated || !token || isUnauthorizedError(error);
  if (isUnauthenticated) {
    const expired = hydrated && (sessionExpired || isUnauthorizedError(error));
    return (
      <div className="mx-auto max-w-xl space-y-5 py-2">
        <Card tone="cream">
          <CardContent className="flex items-start gap-3.5 p-5">
            <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-sand text-ink shadow-brutal-sm">
              <Lock className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold text-ink">
                {expired ? "Sesi Berakhir" : "Belum Masuk Akun"}
              </h2>
              <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-ink/80">
                {expired
                  ? "Sesi masukmu sudah berakhir. Silakan masuk kembali di bawah ini untuk melihat lencana dan melanjutkan progres belajarmu."
                  : "Masuk atau daftar akun FokusSprints di bawah ini untuk membuka statistik fokus, koleksi lencana, dan papan peringkat."}
              </p>
            </div>
          </CardContent>
        </Card>

        {renderAuthCard(true)}
      </div>
    );
  }

  // Non-blocking render untuk pengguna login: struktur halaman & kartu Masuk Akun langsung tampil <100ms,
  // sementara data dinamis (statistik detail, lencana, histori kuis) memakai skeleton ringan lokal.
  const activeUser = profile?.user ?? dashboard?.user ?? null;
  const isFetchingDynamic = isLoadingProfile && !profile;
  const span = activeUser
    ? Math.max(1, activeUser.xp_next_level_target - activeUser.xp_current_level_floor)
    : 1;
  const levelPct = activeUser
    ? Math.min(
        100,
        Math.max(0, Math.round(((activeUser.xp - activeUser.xp_current_level_floor) / span) * 100))
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Kartu Profil (Instan dari cache dashboard.user / skeleton lokal ringan) */}
      <Card accentBorder>
        <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6">
          {activeUser ? (
            <div className="flex items-center gap-4">
              <BrutalAvatar seed={activeUser.avatar_seed} name={activeUser.full_name} size="lg" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-extrabold text-cream">
                    {activeUser.full_name}
                  </h2>
                  <Badge variant="gold" className="font-mono">
                    Level {activeUser.level}
                  </Badge>
                </div>
                <p className="text-sm text-sage">{activeUser.email}</p>
                <div className="mt-3 max-w-xs space-y-1">
                  <div className="flex justify-between text-xs font-bold text-sand">
                    <span>
                      <span className="font-mono tabular-nums">{formatNumberID(activeUser.xp)}</span> XP
                    </span>
                    <span>
                      Target{" "}
                      <span className="font-mono tabular-nums">
                        {formatNumberID(activeUser.xp_next_level_target)}
                      </span>{" "}
                      XP
                    </span>
                  </div>
                  <Progress value={levelPct} />
                </div>
                <div className="mt-3">
                  <Button type="button" size="sm" variant="surface" onClick={logout}>
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Keluar Akun</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-44 rounded-lg" />
                <Skeleton className="h-4 w-52 rounded-lg" />
                <Skeleton className="h-3 w-60 rounded-full" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border-2 border-ink bg-forest-bg p-3 text-center">
              <Timer className="mx-auto h-4 w-4 text-sand" aria-hidden="true" />
              {profile ? (
                <p className="mt-1 font-mono text-lg font-extrabold text-cream">
                  {profile.total_pomodoro_completed}
                </p>
              ) : (
                <Skeleton className="mx-auto mt-1.5 h-6 w-10 rounded-md" />
              )}
              <p className="text-xs text-sage">Sesi Pomodoro</p>
            </div>
            <div className="rounded-xl border-2 border-ink bg-forest-bg p-3 text-center">
              <Flame className="mx-auto h-4 w-4 text-terracotta" aria-hidden="true" />
              {activeUser ? (
                <p className="mt-1 font-mono text-lg font-extrabold text-cream">
                  {activeUser.current_streak}h
                </p>
              ) : (
                <Skeleton className="mx-auto mt-1.5 h-6 w-10 rounded-md" />
              )}
              <p className="text-xs text-sage">Streak Aktif</p>
            </div>
            <div className="rounded-xl border-2 border-ink bg-forest-bg p-3 text-center">
              <CheckCircle2 className="mx-auto h-4 w-4 text-mint" aria-hidden="true" />
              {profile ? (
                <p className="mt-1 font-mono text-lg font-extrabold text-cream">
                  {profile.quiz_accuracy_percent}%
                </p>
              ) : (
                <Skeleton className="mx-auto mt-1.5 h-6 w-12 rounded-md" />
              )}
              <p className="text-xs text-sage">Akurasi Kuis</p>
            </div>
            <div className="rounded-xl border-2 border-ink bg-forest-bg p-3 text-center">
              <ShieldCheck className="mx-auto h-4 w-4 text-sand" aria-hidden="true" />
              {profile ? (
                <p className="mt-1 font-mono text-lg font-extrabold text-cream">
                  {profile.total_focus_minutes}m
                </p>
              ) : (
                <Skeleton className="mx-auto mt-1.5 h-6 w-12 rounded-md" />
              )}
              <p className="text-xs text-sage">Total Fokus</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isError && !profile && (
        <Card tone="cream">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-xs sm:text-sm font-bold text-ink">
              Gagal memuat statistik lencana &amp; histori kuis. Kartu masuk akun tetap siap digunakan.
            </p>
            <Button type="button" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Muat Ulang
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Koleksi Lencana — Skeleton lokal hanya pada grid lencana saat loading */}
      <section aria-label="Koleksi Lencana" className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-sand" aria-hidden="true" />
          <h3 className="font-display text-xl font-extrabold text-cream">
            Koleksi Lencana FokusSprints
          </h3>
        </div>

        {isFetchingDynamic ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BADGE_SKELETON_SLOTS.map((slot) => (
              <Skeleton key={slot} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        ) : profile ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.badges.map((badge) => (
              <Card
                key={badge.code}
                className={cn(
                  badge.unlocked
                    ? badge.tier === "gold"
                      ? "bg-sand text-ink"
                      : badge.tier === "mint"
                      ? "bg-mint text-ink"
                      : "bg-cream text-ink"
                    : "bg-forest-surface text-cream opacity-75"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink",
                        badge.unlocked ? "bg-cream text-ink" : "bg-forest-bg text-sage"
                      )}
                    >
                      {badge.unlocked ? (
                        <Award className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Lock className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "rounded-lg border-2 border-ink px-2.5 py-0.5 font-mono text-xs font-extrabold",
                        badge.unlocked ? "bg-cream text-ink" : "bg-forest-bg text-sage"
                      )}
                    >
                      {badge.progress_label}
                    </span>
                  </div>
                  <CardTitle className="pt-2 text-lg">{badge.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p
                    className={cn(
                      "text-xs sm:text-sm font-medium leading-relaxed",
                      badge.unlocked ? "text-ink/85" : "text-sage"
                    )}
                  >
                    {badge.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </section>

      {/* Histori Kuis (skeleton ringan lokal) & Kartu Masuk Akun (selalu instan tanpa menunggu fetch) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Histori Kuis Terakhir</CardTitle>
            <CardDescription>Catatan percobaan kuis beserta pengali XP Focus Mode.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {isFetchingDynamic ? (
              ATTEMPT_SKELETON_SLOTS.map((slot) => (
                <Skeleton key={slot} className="h-14 w-full rounded-xl" />
              ))
            ) : !profile || profile.recent_attempts.length === 0 ? (
              <p className="text-sm text-sage">Belum ada riwayat kuis yang diselesaikan.</p>
            ) : (
              profile.recent_attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-forest-bg px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold text-cream">
                      {attempt.quiz_title}
                    </p>
                    <p className="text-xs text-sage">
                      Multiplier <span className="font-mono tabular-nums">{attempt.multiplier_applied}</span>x
                    </p>
                  </div>
                  <Badge variant={attempt.is_correct ? "mint" : "danger"} className="font-mono">
                    {attempt.is_correct ? `+${attempt.xp_earned} XP` : "0 XP"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {renderAuthCard(false)}
      </div>
    </div>
  );
}
