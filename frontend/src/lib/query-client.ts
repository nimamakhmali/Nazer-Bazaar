import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          5 * 60 * 1000,   // 5 دقیقه
      gcTime:             30 * 60 * 1000,  // 30 دقیقه
      retry:              (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })
          ?.response?.status;
        // فقط برای 5xx retry کن (نه 4xx)
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay:         (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});