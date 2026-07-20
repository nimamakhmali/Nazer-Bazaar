import { cn } from "@/lib/cn";
import { toJalali } from "@/utils/date.utils";
import {
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  XCircleIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// ─────────────────────────────────────────────────────────────────────────────
export interface TimelineStep {
  status:  string;
  label:   string;
  date?:   string;
  note?:   string;
  by?:     string;
}

interface ComplaintTimelineProps {
  steps:              TimelineStep[];
  currentStatus:      string;
  className?:         string;
}

// ─────────────────────────────────────────────────────────────────────────────
const STATUS_ORDER: Record<string, number> = {
  submitted:  0,
  reviewing:  1,
  referred:   2,
  inspecting: 3,
  confirmed:  4,
  rejected:   4,
  closed:     5,
};

const ALL_STEPS: TimelineStep[] = [
  { status: "submitted",  label: "ثبت شکایت" },
  { status: "reviewing",  label: "در حال بررسی" },
  { status: "referred",   label: "ارجاع به بازرس" },
  { status: "inspecting", label: "در حال بازرسی" },
  { status: "confirmed",  label: "تایید شکایت" },
  { status: "closed",     label: "مختومه" },
];

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  submitted:  DocumentCheckIcon,
  reviewing:  MagnifyingGlassIcon,
  referred:   ArrowPathIcon,
  inspecting: ShieldCheckIcon,
  confirmed:  CheckCircleIcon,
  rejected:   XCircleIcon,
  closed:     LockClosedIcon,
};

const STEP_EMOJIS: Record<string, string> = {
  submitted:  "📋",
  reviewing:  "🔍",
  referred:   "📨",
  inspecting: "🔎",
  confirmed:  "✅",
  rejected:   "❌",
  closed:     "🔒",
};

// ─────────────────────────────────────────────────────────────────────────────
export function ComplaintTimeline({
  steps,
  currentStatus,
  className,
}: ComplaintTimelineProps) {
  const currentOrder = STATUS_ORDER[currentStatus] ?? 0;
  const isRejected   = currentStatus === "rejected";

  // Merge provided steps with all_steps
  const mergedSteps = ALL_STEPS.map((allStep) => {
    const provided = steps.find((s) => s.status === allStep.status);
    return provided ? { ...allStep, ...provided } : allStep;
  });

  return (
    <div className={cn("relative", className)}>
      {/* Vertical connector line */}
      <div className="absolute right-[27px] top-10 bottom-10 w-0.5
                       bg-gradient-to-b from-primary-200 via-slate-200 to-slate-100" />

      <div className="space-y-1">
        {mergedSteps.map((step, index) => {
          const stepOrder = STATUS_ORDER[step.status] ?? index;
          const isPast    = isRejected
            ? stepOrder < currentOrder
            : stepOrder < currentOrder;
          const isCurrent = step.status === currentStatus ||
                            (isRejected && step.status === "confirmed");
          const isFuture  = stepOrder > currentOrder;
          const Icon      = STEP_ICONS[step.status] ?? ClockIcon;
          const emoji     = STEP_EMOJIS[step.status] ?? "📌";

          return (
            <div
              key={step.status}
              className={cn(
                "flex items-start gap-4 pb-8 last:pb-0",
                isFuture && "opacity-40"
              )}
            >
              {/* Step icon */}
              <div className="relative z-10 flex-shrink-0">
                <div className={cn(
                  "flex items-center justify-center rounded-full",
                  "border-2 transition-all duration-300",
                  isCurrent && !isRejected
                    ? "h-14 w-14 border-primary-600 bg-primary-600 shadow-lg shadow-primary-200/60"
                    : isCurrent && isRejected
                    ? "h-14 w-14 border-red-500 bg-red-500 shadow-lg shadow-red-200/60"
                    : isPast
                    ? "h-10 w-10 border-green-400 bg-green-50"
                    : "h-10 w-10 border-slate-200 bg-white",
                )}>
                  {isPast ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ) : isCurrent ? (
                    <span className="text-2xl">{emoji}</span>
                  ) : (
                    <Icon className="h-4 w-4 text-slate-300" />
                  )}
                </div>

                {/* Pulse for current */}
                {isCurrent && (
                  <div className={cn(
                    "absolute inset-0 rounded-full animate-ping opacity-20",
                    isRejected ? "bg-red-500" : "bg-primary-500"
                  )} />
                )}
              </div>

              {/* Content */}
              <div className={cn(
                "flex-1 pb-2",
                isCurrent ? "pt-2" : "pt-1"
              )}>
                {/* Label */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn(
                    "font-semibold transition-all",
                    isCurrent && !isRejected ? "text-primary-700 text-base"
                    : isCurrent && isRejected ? "text-red-700 text-base"
                    : isPast               ? "text-green-700 text-sm"
                    : "text-slate-400 text-sm",
                  )}>
                    {step.label}
                  </p>

                  {isCurrent && (
                    <span className={cn(
                      "inline-flex items-center gap-1 text-xs px-2 py-0.5",
                      "rounded-full font-bold",
                      isRejected
                        ? "bg-red-100 text-red-700"
                        : "bg-primary-100 text-primary-700"
                    )}>
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full animate-pulse",
                        isRejected ? "bg-red-500" : "bg-primary-500"
                      )} />
                      فعلی
                    </span>
                  )}
                </div>

                {/* Date */}
                {step.date && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {toJalali(step.date)}
                  </p>
                )}

                {/* By */}
                {step.by && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    توسط: <span className="font-medium">{step.by}</span>
                  </p>
                )}

                {/* Note */}
                {step.note && isCurrent && (
                  <div className={cn(
                    "mt-2 p-2.5 rounded-xl text-xs leading-relaxed",
                    isRejected
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : "bg-primary-50 text-primary-700 border border-primary-100"
                  )}>
                    {step.note}
                  </div>
                )}

                {/* Future indicator */}
                {isFuture && (
                  <p className="text-xs text-slate-300 mt-0.5">در انتظار</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}