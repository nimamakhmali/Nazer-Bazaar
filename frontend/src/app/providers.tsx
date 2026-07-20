"use client";

import { QueryClientProvider }  from "@tanstack/react-query";
import { ReactQueryDevtools }   from "@tanstack/react-query-devtools";
import { queryClient }          from "@/lib/query-client";
import { ErrorBoundary }        from "@/components/error/ErrorBoundary";
import { OfflineBanner }        from "@/components/common/OfflineBanner";
import { ScrollToTop }          from "@/components/common/ScrollToTop";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <OfflineBanner />
        {children}
        <ScrollToTop />
      </ErrorBoundary>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}