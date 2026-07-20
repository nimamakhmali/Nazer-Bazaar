"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface Props {
  children:  ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // فقط در development لاگ می‌زنیم
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center
                         p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center
                           justify-center mb-6">
            <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            خطایی رخ داد
          </h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm leading-relaxed">
            یک خطای غیرمنتظره رخ داد. لطفاً صفحه را بارگذاری مجدد کنید.
          </p>
          {this.state.error && process.env.NODE_ENV === "development" && (
            <details className="mb-6 text-left max-w-sm">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                جزئیات خطا
              </summary>
              <pre className="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded-xl
                               overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 px-6 py-3 bg-primary-700 text-white
                       rounded-xl font-bold text-sm hover:bg-primary-800 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            بارگذاری مجدد
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Section-level wrapper ────────────────────────────────
export function SectionErrorBoundary({
  children,
  title = "خطا در بارگذاری",
}: {
  children: ReactNode;
  title?:   string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center py-12 px-4
                         text-center bg-red-50 border border-red-100 rounded-2xl">
          <ExclamationTriangleIcon className="h-10 w-10 text-red-400 mb-3" />
          <p className="text-red-700 font-semibold text-sm">{title}</p>
          <p className="text-red-500 text-xs mt-1">
            لطفاً صفحه را بارگذاری مجدد کنید
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}