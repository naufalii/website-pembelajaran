import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatNumberID(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function computeLevelBounds(xp: number): {
  level: number;
  floorXp: number;
  nextXp: number;
} {
  const thresholds = [0, 300, 650, 1000, 1400, 2000] as const;
  for (let i = 0; i < thresholds.length - 1; i += 1) {
    const floorXp = thresholds[i] ?? 0;
    const nextXp = thresholds[i + 1] ?? 2000;
    if (xp < nextXp) {
      return { level: i + 1, floorXp, nextXp };
    }
  }
  const extra = xp - 2000;
  const step = 750;
  const offset = Math.floor(extra / step);
  const floorXp = 2000 + offset * step;
  return {
    level: 6 + offset,
    floorXp,
    nextXp: floorXp + step,
  };
}
