"use client";

import * as React from "react";
import { Check, FileText, FileUp, Sparkles, UploadCloud } from "lucide-react";
import type { AiDocument } from "@fokussprints/shared";
import { FlashcardDeck3D } from "@/components/ai/flashcard-deck-3d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAiDocumentsQuery, useUploadAiDocumentMutation } from "@/lib/queries";
import { cn } from "@/lib/utils";

const SAMPLE_NOTES = `Teknik Pomodoro dan Active Recall adalah kombinasi paling efektif untuk deep learning.
Dengan membatasi satu sprint belajar pada durasi 25 menit tanpa berpindah tab browser, korteks prefrontal dapat memproses konsep baru secara utuh.
Setiap akhir blok 25 menit, uji ingatanmu dengan menutup catatan dan menuliskan 3 poin paling penting menggunakan bahasamu sendiri.`;

export default function AiUploadPage() {
  const { data: documents = [] } = useAiDocumentsQuery();
  const uploadMutation = useUploadAiDocumentMutation();

  const [inputMode, setInputMode] = React.useState<"pdf" | "text">("pdf");
  const [title, setTitle] = React.useState("");
  const [notesText, setNotesText] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pickedQuizAnswer, setPickedQuizAnswer] = React.useState<Record<number, string>>({});

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeDoc: AiDocument | undefined = React.useMemo(() => {
    if (selectedDocId) {
      return documents.find((d) => d.id === selectedDocId) ?? documents[0];
    }
    return documents[0];
  }, [documents, selectedDocId]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (inputMode === "pdf" && !selectedFile) {
      setFormError("Pilih atau tarik berkas PDF terlebih dahulu.");
      return;
    }
    if (inputMode === "text" && notesText.trim().length < 20) {
      setFormError("Tempel catatan minimal 20 karakter agar AI dapat merangkumnya.");
      return;
    }

    try {
      const created = await uploadMutation.mutateAsync({
        title: title.trim() || undefined,
        text: inputMode === "text" ? notesText.trim() : undefined,
        file: inputMode === "pdf" ? selectedFile : null,
      });
      setSelectedDocId(created.id);
      setPickedQuizAnswer({});
      setTitle("");
      setSelectedFile(null);
      setNotesText("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal memproses dokumen.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">
            AI Upload PDF &amp; Catatan ke 3D Flashcard
          </h2>
          <p className="text-sm text-sage">
            Ubah dokumen kuliah atau catatan rapat menjadi ringkasan poin, dek kartu 3D, dan kuis otomatis.
          </p>
        </div>
        <Badge variant="gold">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Ekstraktor Cerdas
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] items-start">
        {/* Panel Kiri: Dropzone PDF / Input Teks */}
        <div className="space-y-5">
          <Card accentBorder>
            <CardHeader>
              <CardTitle>Unggah Sumber Materi</CardTitle>
              <CardDescription>
                Dukung berkas PDF atau tempel teks catatan secara langsung.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void handleGenerate(e)} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="doc-title"
                    className="block font-display text-xs font-extrabold text-cream"
                  >
                    Judul Materi (Opsional)
                  </label>
                  <Input
                    id="doc-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Ringkasan Sistem Terdistribusi Bab 4"
                  />
                </div>

                <Tabs
                  value={inputMode}
                  onValueChange={(v) => setInputMode(v === "text" ? "text" : "pdf")}
                >
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="pdf">
                      <FileUp className="h-4 w-4" aria-hidden="true" />
                      Upload PDF
                    </TabsTrigger>
                    <TabsTrigger value="text">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      Tempel Catatan
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pdf">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const dropped = e.dataTransfer.files[0];
                        if (dropped) setSelectedFile(dropped);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-2xl border-[2.5px] border-dashed p-6 text-center transition-[background-color,border-color] duration-150",
                        isDragging
                          ? "border-sand bg-forest-elevated"
                          : "border-sand/70 bg-forest-bg"
                      )}
                    >
                      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-sand text-ink shadow-brutal-sm">
                        <UploadCloud className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <p className="font-display text-sm font-extrabold text-cream">
                        {selectedFile ? selectedFile.name : "Tarik & lepas file PDF di sini"}
                      </p>
                      <p className="mt-1 text-xs text-sage">
                        Atau pilih file .pdf / .txt dari perangkatmu (maks 10 MB)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,application/pdf,text/plain"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setSelectedFile(f);
                        }}
                      />
                      <Button
                        type="button"
                        variant="surface"
                        size="sm"
                        className="mt-4"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Pilih Berkas
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="text" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="notes-textarea"
                        className="font-display text-xs font-extrabold text-cream"
                      >
                        Isi Catatan Belajar
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setTitle("Strategi Deep Learning & Active Recall");
                          setNotesText(SAMPLE_NOTES);
                        }}
                        className="font-display text-xs font-bold text-sand underline cursor-pointer"
                      >
                        Isi Contoh Catatan
                      </button>
                    </div>
                    <textarea
                      id="notes-textarea"
                      rows={6}
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Tempel ringkasan kuliah, transkrip, atau poin penting di sini..."
                      className="w-full rounded-xl border-[2.5px] border-ink bg-forest-bg p-3.5 text-sm text-cream placeholder:text-sage shadow-brutal-sm focus-visible:border-sand focus-visible:outline-none"
                    />
                  </TabsContent>
                </Tabs>

                {formError && (
                  <p className="rounded-xl border-2 border-ink bg-terracotta px-3 py-2 text-xs font-extrabold text-ink">
                    {formError}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={uploadMutation.isPending}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {uploadMutation.isPending
                    ? "Mengekstrak Ringkasan & 3D Flashcard..."
                    : "Hasilkan Ringkasan & Flashcard"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Riwayat Dokumen */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Dokumen Tersimpan ({documents.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-1">
              {documents.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-sand/50 bg-forest-bg p-4 text-center text-xs text-sage">
                  Belum ada dokumen AI yang dikonversi. Unggah PDF atau tempel catatanmu di atas.
                </div>
              ) : (
                documents.map((doc) => {
                  const isSelected = activeDoc?.id === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setPickedQuizAnswer({});
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl border-2 border-ink px-3.5 py-2.5 text-left brutal-press cursor-pointer",
                        isSelected
                          ? "bg-sand text-ink shadow-brutal-sm"
                          : "bg-forest-bg text-cream hover:bg-forest-elevated"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-extrabold">{doc.title}</p>
                        <p
                          className={cn(
                            "text-xs font-bold",
                            isSelected ? "text-ink/75" : "text-sage"
                          )}
                        >
                          <span className="font-mono tabular-nums">{doc.flashcards.length}</span> Flashcard • {doc.source_type.toUpperCase()}
                        </p>
                      </div>
                      <Badge variant={isSelected ? "cream" : "surface"}>Buka</Badge>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel Kanan: Output Ringkasan + 3D Flip Flashcard + Kuis Otomatis */}
        <div className="space-y-5">
          {activeDoc ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="mint">Ringkasan Poin AI</Badge>
                    <span className="font-mono text-xs font-bold text-sage">
                      {activeDoc.source_filename ?? "Catatan Teks"}
                    </span>
                  </div>
                  <CardTitle className="pt-1 text-xl">{activeDoc.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-0">
                  <ul className="space-y-2">
                    {activeDoc.summary_bullets.map((bullet, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 rounded-xl border-2 border-ink bg-forest-bg p-3 text-sm text-cream"
                      >
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-sand font-mono text-xs font-extrabold text-ink">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dek 3D Flashcard Interaktif</CardTitle>
                  <CardDescription>
                    Klik kartu Warm Cream untuk membalik dan menguji Active Recall.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FlashcardDeck3D flashcards={activeDoc.flashcards} />
                </CardContent>
              </Card>

              {activeDoc.generated_quizzes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Kuis Otomatis dari Dokumen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activeDoc.generated_quizzes.map((q, qIdx) => {
                      if (q.type === "multiple_choice") {
                        const chosen = pickedQuizAnswer[qIdx];
                        return (
                          <div
                            key={qIdx}
                            className="space-y-3 rounded-xl border-2 border-ink bg-forest-bg p-4"
                          >
                            <p className="font-display text-sm font-extrabold text-cream">
                              {q.prompt}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt) => {
                                const isChosen = chosen === opt.id;
                                const isRight = chosen && opt.id === q.correct_option_id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() =>
                                      setPickedQuizAnswer((prev) => ({
                                        ...prev,
                                        [qIdx]: opt.id,
                                      }))
                                    }
                                    className={cn(
                                      "flex items-center justify-between gap-2 rounded-xl border-2 border-ink px-3 py-2 text-left text-xs font-bold brutal-press cursor-pointer",
                                      isRight
                                        ? "bg-mint text-ink"
                                        : isChosen
                                        ? "bg-terracotta text-ink"
                                        : "bg-forest-surface text-cream hover:bg-forest-elevated"
                                    )}
                                  >
                                    <span>
                                      {opt.id}. {opt.text}
                                    </span>
                                    {isRight && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      if (q.type === "true_false") {
                        const chosen = pickedQuizAnswer[qIdx];
                        return (
                          <div
                            key={qIdx}
                            className="space-y-2.5 rounded-xl border-2 border-ink bg-forest-bg p-4"
                          >
                            <p className="font-display text-sm font-extrabold text-cream">
                              {q.statement}
                            </p>
                            <div className="flex gap-2">
                              {["Benar", "Salah"].map((label) => {
                                const expected = q.is_true ? "Benar" : "Salah";
                                const isChosen = chosen === label;
                                const isRight = chosen && label === expected;
                                return (
                                  <button
                                    key={label}
                                    type="button"
                                    onClick={() =>
                                      setPickedQuizAnswer((prev) => ({
                                        ...prev,
                                        [qIdx]: label,
                                      }))
                                    }
                                    className={cn(
                                      "flex-1 rounded-xl border-2 border-ink px-3 py-2 font-display text-xs font-extrabold brutal-press cursor-pointer",
                                      isRight
                                        ? "bg-mint text-ink"
                                        : isChosen
                                        ? "bg-terracotta text-ink"
                                        : "bg-forest-surface text-cream"
                                    )}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card accentBorder>
              <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-sand text-ink shadow-brutal-sm">
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="font-display text-lg font-extrabold text-cream">
                  Belum Ada Dek Flashcard Aktif
                </p>
                <p className="mt-1 max-w-md text-xs sm:text-sm text-sage leading-relaxed">
                  Unggah berkas PDF atau tempel teks catatan di panel sebelah kiri untuk menghasilkan ringkasan poin, kartu 3D flip, dan soal kuis otomatis.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
