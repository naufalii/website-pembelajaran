"use client";

import { create } from "zustand";

const ACCESS_TOKEN_KEY = "fokussprints_token";
const REFRESH_TOKEN_KEY = "fokussprints_refresh_token";

interface AuthState {
  token: string | null;
  hydrated: boolean;
  sessionExpired: boolean;
  hydrateFromStorage: () => void;
  setSession: (accessToken: string, refreshToken?: string | null) => void;
  clearSession: (reason?: "expired" | "logout") => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  hydrated: false,
  sessionExpired: false,

  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    set({
      token: stored && stored.trim().length > 0 ? stored.trim() : null,
      hydrated: true,
    });
  },

  setSession: (accessToken, refreshToken) => {
    const clean = accessToken.trim();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, clean);
      if (refreshToken && refreshToken.trim().length > 0) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken.trim());
      }
    }
    set({
      token: clean,
      hydrated: true,
      sessionExpired: false,
    });
  },

  clearSession: (reason) => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    set({
      token: null,
      hydrated: true,
      sessionExpired: reason === "expired",
    });
  },
}));

export function readStoredAuthToken(): string | null {
  const inMemory = useAuthStore.getState().token;
  if (inMemory) return inMemory;
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
  }
  return null;
}
