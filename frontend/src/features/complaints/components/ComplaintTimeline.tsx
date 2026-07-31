import React from "react";
import {
  ClipboardDocumentListIcon,
  PaperAirplaneIcon,
  MagnifyingGlassCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { cn } from "@/lib/cn";
import { toJalaliWithTime } from "@/utils/date.utils";

export interface TimelineStep {
  status: string;
  label: string;
  date?: string;
  by?: string;
  note?: string;
}

interface ComplaintTimelineProps {
  steps: TimelineStep[];
  currentStatus: string;
}

// ✅ جدید: Timeline ساده‌تر
const TIMELINE_STAGES = [
  {
    id: "submitted",
    label: "ثبت شکایت",
    icon: ClipboardDocumentListIcon,
    color: "blue",
  },
  {
    id: "assigned",
    label: "ارجاع به مسئولین",
    icon: PaperAirplaneIcon,
    color: "purple",
  },
  {
    id: "reviewing",
    label: "در حال بررسی",
    icon: MagnifyingGlassCircleIcon,
    color: "amber",
  },
  {
    id: "result",
    label: "نتیجه بررسی",
    icon: CheckCircleIcon,
    color: "green",
  },
  {
    id: "closed",
    label: "مختومه",
    icon: XCircleIcon,
    color: "slate",
  },
];

const STATUS_TO_STAGE: Record<string, number> = {
  submitted: 0,
  reviewing: 2,
  referred: 1,
  inspecting: 2,
  confirmed: 3,
  rejected: 3,
  closed: 4,
};

export function ComplaintTimeline({
  steps,
  currentStatus,
}: ComplaintTimelineProps) {
  const currentStageIndex = STATUS_TO_STAGE[currentStatus] ?? 0;

  // پیدا کردن تاریخ ثبت
  const submittedStep = steps.find((s) => s.status === "submitted");

  return (
    <div className="relative">
      {TIMELINE_STAGES.map((stage, index) => {
        const isActive = index === currentStageIndex;
        const isDone = index < currentStageIndex;
        const Icon = stage.icon;

        // تاریخ مرحله
        let stepDate = "";
        let stepBy = "";
        if (index === 0 && submittedStep) {
          stepDate = submittedStep.date || "";
          stepBy = submittedStep.by || "";
        } else if (isActive) {
          stepDate = "فعلی";
        }

        return (
          <div key={stage.id} className="flex gap-4 pb-8 last:pb-0 relative">
            {/* Line */}
            {index < TIMELINE_STAGES.length - 1 && (
              <div
                className={cn(
                  "absolute right-4 top-10 w-0.5 h-full transition-colors",
                  isDone ? "bg-green-400" : "bg-slate-200"
                )}
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                "relative z-10 h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                isDone
                  ? "bg-green-500 text-white shadow-md"
                  : isActive
                  ? `bg-${stage.color}-500 text-white shadow-lg shadow-${stage.color}-200 ring-4 ring-${stage.color}-100`
                  : "bg-slate-100 text-slate-400 border-2 border-slate-200"
              )}
            >
              {isDone ? (
                <CheckCircleSolid className="h-5 w-5" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
              <p
                className={cn(
                  "font-bold text-sm mb-0.5",
                  isActive
                    ? "text-primary-800"
                    : isDone
                    ? "text-green-700"
                    : "text-slate-400"
                )}
              >
                {stage.label}
              </p>

              {stepDate && (
                <p className="text-xs text-slate-500 mb-1">{stepDate}</p>
              )}

              {stepBy && (
                <p className="text-xs text-slate-400">توسط: {stepBy}</p>
              )}

              {isActive && (
                <div
                  className={cn(
                    "mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold",
                    `bg-${stage.color}-100 text-${stage.color}-700`
                  )}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        `bg-${stage.color}-400`
                      )}
                    />
                    <span
                      className={cn(
                        "relative inline-flex rounded-full h-2 w-2",
                        `bg-${stage.color}-500`
                      )}
                    />
                  </span>
                  {currentStatus === "submitted"
                    ? "در انتظار"
                    : currentStatus === "reviewing"
                    ? "در حال بررسی"
                    : currentStatus === "referred"
                    ? "ارجاع شده"
                    : currentStatus === "inspecting"
                    ? "در حال بازرسی"
                    : currentStatus === "confirmed"
                    ? "تایید شد"
                    : currentStatus === "rejected"
                    ? "رد شد"
                    : "بسته شد"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}