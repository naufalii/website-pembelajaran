"use client";

import * as React from "react";
import { Award, CheckCircle2, Flame, Lock, ShieldCheck, Timer, UserCheck } from "lucide-react";
import { BrutalAvatar } from "@/components/icons/brutal-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoginMutation, useProfileQuery, useRegisterMutation } from "@/lib/queries";
import { cn, formatNumberID } from "@/lib/utils";

export default function ProfilLencanaPage() {
  const { data: profile, isLoading } = useProfileQuery();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();

  const [authMode, setAuthMode] = React.useState<"login" | "register">("login");
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loginMessage, setLoginMessage] = React.useState<string | null>(null);

  if (isLoading || !profile) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const { user } = profile;
  const span = Math.max(1, user.xp_next_level_target - user.xp_current_level_floor);
  const levelPct = Math.min(
    100,
    Math.max(0, Math.round(((user.xp - user.xp_current_level_floor) / span) * 100))
  );

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMessage(null);
    try {
      if (authMode === "register") {
        const res = await registerMutation.mutateAsync({ fullName, email, password });
        setLoginMessage(`Akun baru ${res.user.full_name} berhasil dibuat & aktif.`);
      } else {
        const res = await loginMutation.mutateAsync({ email, password });
        setLoginMessage(`Berhasil masuk sebagai ${res.user.full_name}.`);
      }
    } catch (err) {
      setLoginMessage(
        err instanceof Error
          ? err.message
          : "Gagal memproses permintaan. Periksa kembali email dan kata sandimu."
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Kartu Profil */}
      <Card accentBorder>
        <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6">
          <div className="flex items-center gap-4">
            <BrutalAvatar seed={user.avatar_seed} name={user.full_name} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-extrabold text-cream">
                  {user.full_name}
                </h2>
                <Badge variant="gold" className="font-mono">
                  Level {user.level}
                </Badge>
              </div>
              <p className="text-sm text-sage">{user.email}</p>
              <div className="mt-3 max-w-xs space-y-1">
                <div className="flex justify-between text-xs font-bold text-sand">
                  <span><span className="font-mono tabular-nums">{formatNumberID(user.xp)}</span> XP</span>
                  <span>Target <span className="font-mono tabular-nums">{formatNumberID(user.xp_next_level_target)}</span> XP</span>
                </div>
                <Progress value={levelPct} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border-2 border-ink bg-forest-bg p-3 text-center">
              <Timer className="mx-auto h-4 w-4 text-sand" aria-hidden="true" />
              <p className="mt-1 font-mono text-lg font-extrabold text-cream">
                {profile.total_pomodoro_completed}
              </p>
              <p className="text-xs text-sage">Sesi Pomodoro</p>
            </div>
            <div className="rounded-xl border-2 border-ink bg-forest-bg p-3 text-center">
              <Flame className="mx-auto h-4 w-4 text-terracotta" aria-hidden="true" />
              <p className="mt-1 font-mono text-lg font-extrabold text-cream">
                {user.current_streak}h
              </p>
              <p className="text-xs text-sage">Streak Aktif</p>
            </div>
            <div className="rounded-xl border-2 border-ink bg-forest-bg p-3 text-center">
              <CheckCircle2 className="mx-auto h-4 w-4 text-mint" aria-hidden="true" />
              <p className="mt-1 font-mono text-lg font-extrabold text-cream">
                {profile.quiz_accuracy_percent}%
              </p>
              <p className="text-xs text-sage">Akurasi Kuis</p>
            </div>
            <div className="rounded-xl border-2 border-ink bg-forest-bg p-3 text-center">
              <ShieldCheck className="mx-auto h-4 w-4 text-sand" aria-hidden="true" />
              <p className="mt-1 font-mono text-lg font-extrabold text-cream">
                {profile.total_focus_minutes}m
              </p>
              <p className="text-xs text-sage">Total Fokus</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Koleksi Lencana */}
      <section aria-label="Koleksi Lencana" className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-sand" aria-hidden="true" />
          <h3 className="font-display text-xl font-extrabold text-cream">
            Koleksi Lencana FokusSprints
          </h3>
        </div>

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
      </section>

      {/* Histori Kuis & Ganti Akun */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Histori Kuis Terakhir</CardTitle>
            <CardDescription>Catatan percobaan kuis beserta pengali XP Focus Mode.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {profile.recent_attempts.length === 0 ? (
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

        <Card>
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
                  onClick={() => setAuthMode("login")}
                >
                  Masuk
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={authMode === "register" ? "default" : "surface"}
                  onClick={() => setAuthMode("register")}
                >
                  Daftar
                </Button>
              </div>
            </div>
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
                <p className="rounded-xl border-2 border-ink bg-cream px-3 py-2 text-xs font-bold text-ink">
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
      </div>
    </div>
  );
}
