import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Maskot utama FokusSprints: otak bergaya vektor flat-neobrutalist dengan percikan petir fokus.
 */
export function BrandMascotIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("h-10 w-10 shrink-0", className)}
    >
      <rect
        x="4"
        y="4"
        width="40"
        height="40"
        rx="12"
        fill="var(--color-accent)"
        stroke="var(--color-ink)"
        strokeWidth="3"
      />
      <path
        d="M16 25C13.8 25 12 23.2 12 21C12 19.3 13.1 17.8 14.6 17.3C14.8 14.4 17.2 12 20.2 12C21.8 12 23.3 12.7 24.3 13.9C25.3 12.7 26.8 12 28.4 12C31.4 12 33.8 14.4 34 17.3C35.5 17.8 36.6 19.3 36.6 21C36.6 23.2 34.8 25 32.6 25H16Z"
        fill="var(--color-text)"
        stroke="var(--color-ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M25.5 18L20.5 27H24.5L22.5 36L29.5 25H25L25.5 18Z"
        fill="var(--color-danger)"
        stroke="var(--color-ink)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Maskot Mini untuk Kuis Kilat (mood: thinking, happy, oops).
 */
export function QuizMascot({
  mood = "thinking",
  className,
}: {
  mood?: "thinking" | "happy" | "oops";
  className?: string;
}) {
  const bodyColor =
    mood === "happy"
      ? "var(--color-success)"
      : mood === "oops"
      ? "var(--color-danger)"
      : "var(--color-accent)";

  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("h-20 w-20 shrink-0", className)}
    >
      {/* Hard offset shadow shape */}
      <rect x="20" y="24" width="60" height="58" rx="18" fill="var(--color-ink)" />
      {/* Body */}
      <rect
        x="16"
        y="20"
        width="60"
        height="58"
        rx="18"
        fill={bodyColor}
        stroke="var(--color-ink)"
        strokeWidth="3.5"
      />
      {/* Antenna / lightning crest */}
      <path
        d="M46 20V11M46 11L41 15M46 11L51 15"
        stroke="var(--color-ink)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Eyes */}
      {mood === "oops" ? (
        <>
          <path d="M31 41L37 47M37 41L31 47" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
          <path d="M55 41L61 47M61 41L55 47" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="34" cy="44" r="4.5" fill="var(--color-ink)" />
          <circle cx="58" cy="44" r="4.5" fill="var(--color-ink)" />
          <circle cx="35.5" cy="42.5" r="1.4" fill="var(--color-text)" />
          <circle cx="59.5" cy="42.5" r="1.4" fill="var(--color-text)" />
        </>
      )}
      {/* Mouth */}
      {mood === "happy" ? (
        <path
          d="M36 56C39 62 53 62 56 56"
          stroke="var(--color-ink)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      ) : mood === "oops" ? (
        <circle cx="46" cy="59" r="4.5" fill="var(--color-text)" stroke="var(--color-ink)" strokeWidth="2.8" />
      ) : (
        <path
          d="M38 57H54"
          stroke="var(--color-ink)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      )}
      {/* Geometric sparkle */}
      <path
        d="M78 14L80 19L85 21L80 23L78 28L76 23L71 21L76 19L78 14Z"
        fill="var(--color-text)"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/**
 * Avatar vektor geometris deterministik per pengguna (tanpa foto eksternal atau emoji).
 */
export function BrutalAvatar({
  seed,
  name,
  size = "md",
  className,
}: {
  seed: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const hash = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const bgVariants = [
    "bg-sand text-ink",
    "bg-cream text-ink",
    "bg-mint text-ink",
    "bg-terracotta text-ink",
  ] as const;
  const paletteClass = bgVariants[hash % bgVariants.length] ?? "bg-sand text-ink";

  const sizeClass =
    size === "sm"
      ? "h-8 w-8 text-xs rounded-lg"
      : size === "lg"
      ? "h-14 w-14 text-lg rounded-2xl"
      : "h-10 w-10 text-sm rounded-xl";

  return (
    <div
      aria-label={`Avatar ${name}`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border-[2.5px] border-ink font-display font-extrabold shadow-brutal-sm select-none",
        paletteClass,
        sizeClass,
        className
      )}
    >
      {initials || "FS"}
    </div>
  );
}

/**
 * Bintang geometris Neobrutalist untuk dekorasi kartu XP & Podium.
 */
export function GeometricStar({
  variant = "gold",
  className,
}: {
  variant?: "gold" | "cream" | "mint";
  className?: string;
}) {
  const fill =
    variant === "mint"
      ? "var(--color-success)"
      : variant === "cream"
      ? "var(--color-text)"
      : "var(--color-accent)";
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
    >
      <path
        d="M14 2L17.3 10.2L26 11.2L19.5 17L21.3 25.6L14 21L6.7 25.6L8.5 17L2 11.2L10.7 10.2L14 2Z"
        fill={fill}
        stroke="var(--color-ink)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
