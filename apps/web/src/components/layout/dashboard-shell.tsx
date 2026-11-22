"use client";

import * as React from "react";
import { X } from "lucide-react";
import { AiTutorDrawer } from "@/components/ai/ai-tutor-drawer";
import { FocusViolationModal } from "@/components/focus/focus-violation-modal";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopStatusBar } from "@/components/layout/top-status-bar";
import {
  useCompleteFocusMutation,
  useDashboardQuery,
  useReportViolationMutation,
} from "@/lib/queries";
import { useFocusStore } from "@/stores/focus-store";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { data: dashboard } = useDashboardQuery();

  const isRunning = useFocusStore((s) => s.isRunning);
  const isFocusModeActive = useFocusStore((s) => s.isFocusModeActive);
  const activeSessionId = useFocusStore((s) => s.activeSessionId);
  const activeLessonId = useFocusStore((s) => s.activeLessonId);
  const tickSecond = useFocusStore((s) => s.tickSecond);
  const registerTabViolation = useFocusStore((s) => s.registerTabViolation);
  const finishFocusSession = useFocusStore((s) => s.finishFocusSession);

  const completeFocusMutation = useCompleteFocusMutation();
  const reportViolationMutation = useReportViolationMutation();

  const activeLesson = React.useMemo(() => {
    const lessons = dashboard?.active_course?.lessons ?? [];
    return lessons.find((l) => l.id === activeLessonId) ?? lessons[0] ?? null;
  }, [dashboard, activeLessonId]);

  // Global Pomodoro 1-second ticker
  React.useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      const reachedZero = tickSecond();
      if (reachedZero) {
        if (isFocusModeActive && activeSessionId) {
          void completeFocusMutation
            .mutateAsync(activeSessionId)
            .then((res) => finishFocusSession(res.xp_earned))
            .catch(() => finishFocusSession(70));
        } else {
          finishFocusSession(0);
        }
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [
    isRunning,
    isFocusModeActive,
    activeSessionId,
    tickSecond,
    completeFocusMutation,
    finishFocusSession,
  ]);

  // Global Focus Mode tab-switch violation detector (visibilitychange)
  React.useEffect(() => {
    if (!isFocusModeActive || !isRunning) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        registerTabViolation();
        if (activeSessionId) {
          void reportViolationMutation.mutateAsync(activeSessionId).catch(() => undefined);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [
    isFocusModeActive,
    isRunning,
    activeSessionId,
    registerTabViolation,
    reportViolationMutation,
  ]);

  return (
    <div className="h-screen overflow-hidden bg-forest-bg text-cream">
      {/* Desktop Fixed 250px Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] border-r-[2.5px] border-ink lg:block">
        <SidebarNav user={dashboard?.user} />
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-ink/80"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 h-full w-[265px] border-r-[2.5px] border-ink bg-forest-surface">
            <button
              type="button"
              aria-label="Tutup menu navigasi"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink bg-cream text-ink shadow-brutal-sm brutal-press"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <SidebarNav user={dashboard?.user} onNavigate={() => setMobileMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content Wrapper — Header tetap solid di atas, scroll container terpisah di bawah */}
      <div className="flex h-screen flex-col overflow-hidden lg:pl-[250px]">
        <TopStatusBar
          user={dashboard?.user}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain">
          <main className="mx-auto w-full max-w-[1440px] px-4 pt-6 pb-24 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>

      <FocusViolationModal />
      <AiTutorDrawer activeLesson={activeLesson} />
    </div>
  );
}
