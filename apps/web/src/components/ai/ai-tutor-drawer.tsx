"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { AnimatePresence, motion } from "motion/react";
import {
  Bot,
  Maximize2,
  Minimize2,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import type { LessonSummary, TutorHistoryMessage } from "@fokussprints/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAskTutorMutation } from "@/lib/queries";
import { useFocusStore } from "@/stores/focus-store";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  followups?: string[];
}

const INITIAL_WELCOME: ChatMessage = {
  id: "welcome-1",
  role: "assistant",
  content:
    "Halo! Aku **AI Tutor FokusSprints**. Kamu bisa berdiskusi bebas tentang materi kuliah, coding, ringkasan catatan, maupun latihan soal — tidak harus menunggu video dibuka.",
  followups: [
    "Bantu buat jadwal belajar 25 menit yang efektif",
    "Buatkan 1 soal latihan Active Recall untuk pemanasan",
    "Jelaskan konsep teknik Feynman dengan contoh sederhana",
  ],
};

export function AiTutorDrawer({ activeLesson }: { activeLesson?: LessonSummary | null }) {
  const tutorOpen = useFocusStore((s) => s.tutorOpen);
  const setTutorOpen = useFocusStore((s) => s.setTutorOpen);
  const askTutor = useAskTutorMutation();

  const [question, setQuestion] = React.useState("");
  const [expanded, setExpanded] = React.useState(false);
  const [provider, setProvider] = React.useState<"gemini" | "openai" | "fallback" | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([INITIAL_WELCOME]);

  const handleResetChat = () => {
    setMessages([INITIAL_WELCOME]);
    setQuestion("");
  };

  const sendQuestion = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || askTutor.isPending) return;

    const historyPayload: TutorHistoryMessage[] = messages
      .filter((m) => m.id !== "welcome-1")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");

    const lessonContextText = activeLesson
      ? `${activeLesson.title}\n${activeLesson.summary}\n${activeLesson.transcript}`
      : null;

    try {
      const response = await askTutor.mutateAsync({
        message: trimmed,
        history: historyPayload,
        lesson_context: lessonContextText,
        lesson_id: activeLesson?.id ?? null,
      });
      setProvider(response.provider);
      setMessages((prev) => [
        ...prev,
        {
          id: `t-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          followups: response.suggested_followups,
        },
      ]);
    } catch {
      setProvider("fallback");
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            "Maaf, koneksi ke AI Tutor sedang terganggu. Silakan coba kirim pertanyaanmu kembali beberapa saat lagi.",
        },
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuestion(question);
  };

  const providerLabel =
    provider === "gemini" || provider === "openai"
      ? "AI Aktif"
      : provider === "fallback"
      ? "Mode Offline"
      : "Siap Membantu";

  return (
    <>
      {!tutorOpen && (
        <div className="fixed bottom-5 right-5 z-40">
          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={() => setTutorOpen(true)}
            aria-label="Buka panel AI Tutor Kontekstual"
            className="rounded-2xl shadow-brutal-md"
          >
            <Bot className="h-5 w-5" aria-hidden="true" />
            <span>AI Tutor</span>
          </Button>
        </div>
      )}

      <AnimatePresence>
        {tutorOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            aria-label="Panel Chat AI Tutor"
            className={cn(
              "fixed bottom-5 right-5 z-50 flex flex-col overflow-hidden rounded-2xl border-[2.5px] border-ink bg-forest-surface shadow-brutal-md",
              expanded
                ? "h-[min(84vh,680px)] w-[min(94vw,620px)]"
                : "h-[min(76vh,500px)] w-[min(92vw,410px)]"
            )}
          >
            {/* Header Drawer */}
            <div className="flex items-center justify-between gap-2 border-b-[2.5px] border-ink bg-sand px-4 py-3 text-ink">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-cream text-ink">
                  <Bot className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-display text-sm font-extrabold leading-none">
                      AI Tutor FokusSprints
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border border-ink px-1.5 py-0.5 font-sans text-[10px] font-extrabold leading-none",
                        provider === "gemini" || provider === "openai"
                          ? "bg-mint text-ink"
                          : "bg-cream text-ink"
                      )}
                    >
                      {providerLabel}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs font-bold text-ink/75">
                    {activeLesson ? `Konteks: ${activeLesson.title}` : "Diskusi Bebas Multi-Topik"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  title="Reset Obrolan"
                  aria-label="Reset obrolan AI Tutor"
                  onClick={handleResetChat}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-cream text-ink brutal-press cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title={expanded ? "Perkecil Panel" : "Perbesar Panel"}
                  aria-label={expanded ? "Perkecil panel AI Tutor" : "Perbesar panel AI Tutor"}
                  onClick={() => setExpanded((prev) => !prev)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-cream text-ink brutal-press cursor-pointer"
                >
                  {expanded ? (
                    <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Tutup AI Tutor"
                  onClick={() => setTutorOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-cream text-ink brutal-press cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Area Percakapan */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3.5">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      msg.role === "user" ? "flex justify-end" : "flex flex-col items-start gap-2"
                    }
                  >
                    <div
                      className={
                        msg.role === "user"
                          ? "max-w-[85%] rounded-2xl border-2 border-ink bg-sand px-3.5 py-2.5 text-sm font-semibold text-ink shadow-brutal-sm"
                          : "max-w-[94%] rounded-2xl border-2 border-ink bg-cream px-4 py-3 text-sm text-ink shadow-brutal-sm"
                      }
                    >
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="space-y-2 leading-relaxed">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                              strong: ({ children }) => (
                                <strong className="font-extrabold text-ink">{children}</strong>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc space-y-1 pl-4">{children}</ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal space-y-1 pl-4">{children}</ol>
                              ),
                              code: ({ children }) => (
                                <code className="rounded border border-ink/40 bg-sand/50 px-1 py-0.5 font-mono text-xs font-bold text-ink">
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className="overflow-x-auto rounded-xl border-2 border-ink bg-forest-bg p-3 font-mono text-xs text-cream">
                                  {children}
                                </pre>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {msg.role === "assistant" && msg.followups && msg.followups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.followups.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => void sendQuestion(item)}
                            className="inline-flex items-center gap-1 rounded-lg border-2 border-ink bg-forest-bg px-2.5 py-1 text-left text-xs font-semibold text-cream brutal-press hover:bg-forest-elevated cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3 shrink-0 text-sand" aria-hidden="true" />
                            <span>{item}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {askTutor.isPending && (
                  <div className="inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-forest-bg px-3 py-2 text-xs font-bold text-sand">
                    Sedang menyusun jawaban…
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Form */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t-[2.5px] border-ink bg-forest-bg p-3"
            >
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Diskusi materi, coding, atau latihan soal…"
                aria-label="Pesan untuk AI Tutor"
                className="h-10 flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={askTutor.isPending || question.trim().length < 1}
                aria-label="Kirim pesan"
                className="h-10 w-10 shrink-0"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
