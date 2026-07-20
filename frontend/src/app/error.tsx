"use client";

import { useEffect } from "react";
import { ArrowPathIcon, HomeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="h-24 w-24 rounded-full bg-red-100 flex items-center
                         justify-center mx-auto mb-6">
          <span className="text-5xl">⚠️</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-3">
          خطایی رخ داد
        </h1>
        <p className="text-slate-500 mb-2 leading-relaxed">
          یک خطای غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 mb-8 font-mono">
            کد خطا: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 bg-primary-700
                       text-white rounded-xl font-bold text-sm
                       hover:bg-primary-800 transition-colors shadow-sm"
          >
            <ArrowPathIcon className="h-4 w-4" />
            تلاش مجدد
          </button>
          <Link href="/">
            <button className="flex items-center gap-2 px-6 py-3 border-2
                               border-primary-200 text-primary-700 rounded-xl
                               font-bold text-sm hover:bg-primary-50 transition-colors">
              <HomeIcon className="h-4 w-4" />
              صفحه اصلی
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}