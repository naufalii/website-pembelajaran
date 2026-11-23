"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isAbortError, isUnauthorizedError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

// Stale-While-Revalidate cache client: data menu tampil instan dari memori (TTL 45 detik)
// dan diperbarui diam-diam di latar belakang saat kedaluwarsa.
export const CLIENT_CACHE_STALE_MS = 45_000;
export const CLIENT_CACHE_GC_MS = 10 * 60_000;

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: CLIENT_CACHE_STALE_MS,
            gcTime: CLIENT_CACHE_GC_MS,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
              if (isUnauthorizedError(error) || isAbortError(error)) return false;
              return failureCount < 1;
            },
          },
        },
      })
  );

  React.useEffect(() => {
    useAuthStore.getState().hydrateFromStorage();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
