"use client";

import Link from "next/link";
import { HomeIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-slate-100
                     flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* 404 visual */}
        <div className="relative mb-8 inline-block">
          <div className="text-[120px] font-black text-primary-100 leading-none
                           select-none">
            ۴۰۴
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl px-6 py-3">
              <p className="text-primary-700 font-bold text-lg">
                صفحه یافت نشد
              </p>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-3">
          این صفحه وجود ندارد
        </h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          صفحه‌ای که دنبالش می‌گردید حذف شده، جابجا شده یا آدرس آن تغییر کرده است.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <button className="flex items-center gap-2 px-6 py-3 bg-primary-700
                               text-white rounded-xl font-bold text-sm
                               hover:bg-primary-800 transition-colors shadow-sm">
              <HomeIcon className="h-4 w-4" />
              صفحه اصلی
            </button>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-6 py-3 border-2 border-primary-200
                       text-primary-700 rounded-xl font-bold text-sm
                       hover:bg-primary-50 transition-colors"
          >
            <ArrowRightIcon className="h-4 w-4" />
            صفحه قبل
          </button>
        </div>
      </div>
    </div>
  );
}