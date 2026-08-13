"use client";

import React from "react";
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import { toJalaliWithTime } from "@/utils/date.utils";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
export interface TimelineStep {
  /** کلید وضعیت (باید با یکی از مقادیر ComplaintStatus بک‌اند یکی باشد) */
  status: string;
  /** عنوان نمایشی مرحله */
  label: string;
  /** تاریخ وقوع این مرحله (اگر هنوز اتفاق نیفتاده، خالی بگذارید) */
  date?: string | null;
  /** انجام‌دهنده این مرحله (اختیاری) */
  by?: string | null;
  /** توضیح تکمیلی برای این مرحله (اختیاری) */
  description?: string | null;
}

interface ComplaintTimelineProps {
  /** رویدادهای واقعی ثبت‌شده برای شکایت (حداقل شامل «ثبت شکایت» باشد) */
  steps: TimelineStep[];
  /** وضعیت فعلی شکایت */
  currentStatus: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// مسیر استاندارد گردش‌کار شکایت (بدون احتساب حالت‌های پایانی)
const BASE_FLOW: { key: string; label: string }[] = [
  { key: "submitted", label: "ثبت شکایت" },
  { key: "reviewing", label: "بررسی اولیه" },
  { key: "referred", label: "ارجاع به بازرس" },
  { key: "inspecting", label: "بازرسی میدانی" },
];

const TERMINAL_LABELS: Record<string, string> = {
  confirmed: "تایید نهایی",
  rejected: "رد شکایت",
  closed: "مختومه",
};

const TERMINAL_STATUSES = Object.keys(TERMINAL_LABELS);

// ─────────────────────────────────────────────────────────────────────────────
export function ComplaintTimeline({ steps, currentStatus }: ComplaintTimelineProps) {
  const isTerminal = TERMINAL_STATUSES.includes(currentStatus);
  const isRejected = currentStatus === "rejected";

  // ایندکس فعلی در مسیر پایه (اگر وضعیت پایانی است، یعنی از کل مسیر پایه عبور کرده)
  const baseIndex = BASE_FLOW.findIndex((s) => s.key === currentStatus);
  const currentIndex = isTerminal ? BASE_FLOW.length : baseIndex;

  // مرحله‌ی نهایی نمایش (تایید/رد/مختومه یا در انتظار نتیجه)
  const finalStep = {
    key: isTerminal ? currentStatus : "pending_result",
    label: isTerminal ? TERMINAL_LABELS[currentStatus] : "نتیجه نهایی",
  };

  const displaySteps = [...BASE_FLOW, finalStep];

  // نگاشت رویدادهای واقعی (steps ورودی) بر اساس status برای پیدا کردن تاریخ/انجام‌دهنده
  const stepDataMap = new Map<string, TimelineStep>();
  steps.forEach((s) => stepDataMap.set(s.status, s));

  return (
    <div className="relative pr-2">
      {displaySteps.map((step, index) => {
        const isLast = index === displaySteps.length - 1;
        const eventData = stepDataMap.get(step.key);

        // وضعیت این مرحله نسبت به وضعیت فعلی
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex && !isTerminal;
        const isFinalActive = isLast && isTerminal;
        const isFinalRejected = isFinalActive && isRejected;
        const isPending = !isDone && !isCurrent && !isFinalActive;

        return (
          <div key={step.key} className="flex gap-4 pb-8 last:pb-0">
            {/* خط اتصال + آیکون */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center border-2 z-10",
                  isFinalRejected
                    ? "bg-red-100 border-red-400"
                    : isFinalActive
                    ? "bg-green-100 border-green-400"
                    : isDone
                    ? "bg-primary-100 border-primary-400"
                    : isCurrent
                    ? "bg-primary-600 border-primary-600 animate-pulse"
                    : "bg-slate-50 border-slate-200"
                )}
              >
                {isFinalRejected ? (
                  <XCircleIcon className="h-5 w-5 text-red-600" />
                ) : isFinalActive ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : isDone ? (
                  <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                ) : isCurrent ? (
                  <ClockIcon className="h-5 w-5 text-white" />
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 mt-1",
                    isDone ? "bg-primary-300" : "bg-slate-200"
                  )}
                />
              )}
            </div>

            {/* محتوای مرحله */}
            <div className="flex-1 min-w-0 pt-1">
              <p
                className={cn(
                  "text-sm font-bold",
                  isFinalRejected
                    ? "text-red-700"
                    : isFinalActive
                    ? "text-green-700"
                    : isDone
                    ? "text-primary-700"
                    : isCurrent
                    ? "text-primary-800"
                    : "text-slate-400"
                )}
              >
                {step.label}
              </p>

              {eventData?.date && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {toJalaliWithTime(eventData.date)}
                  {eventData.by && ` — توسط ${eventData.by}`}
                </p>
              )}

              {!eventData?.date && isCurrent && (
                <p className="text-xs text-primary-500 mt-0.5">در حال انجام...</p>
              )}

              {!eventData?.date && isPending && (
                <p className="text-xs text-slate-300 mt-0.5">در انتظار</p>
              )}

              {eventData?.description && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {eventData.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}