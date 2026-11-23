import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AppProviders } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "FokusSprints — Platform Micro-Learning & Deep Focus",
  description:
    "Belajar lebih cepat dalam blok fokus 25 menit dengan video mikro ber-checkpoint kuis, 3D flashcard AI, misi harian, dan papan peringkat real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap"
        />
      </head>
      <body className="font-sans bg-forest-bg text-cream antialiased">
        <AppProviders>
          <DashboardShell>{children}</DashboardShell>
        </AppProviders>
      </body>
    </html>
  );
}
