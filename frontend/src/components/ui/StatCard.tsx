import { cn } from "@/lib/cn";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";
import { Card } from "./Card";

type StatVariant = "primary" | "success" | "warning" | "danger" | "secondary";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    direction?: "up" | "down";
  };
  variant?: StatVariant;
  loading?: boolean;
  suffix?: string;
  className?: string;
}

const variantConfig: Record<StatVariant, {
  iconBg: string;
  iconText: string;
  bar: string;
}> = {
  primary:   {
    iconBg: "bg-blue-50",
    iconText: "text-blue-700",
    bar: "bg-blue-600",
  },
  success:   {
    iconBg: "bg-green-50",
    iconText: "text-green-700",
    bar: "bg-green-500",
  },
  warning:   {
    iconBg: "bg-amber-50",
    iconText: "text-amber-700",
    bar: "bg-amber-500",
  },
  danger:    {
    iconBg: "bg-red-50",
    iconText: "text-red-700",
    bar: "bg-red-500",
  },
  secondary: {
    iconBg: "bg-yellow-50",
    iconText: "text-yellow-700",
    bar: "bg-yellow-500",
  },
};

export const StatCard = ({
  title,
  value,
  icon,
  trend,
  variant = "primary",
  loading = false,
  suffix,
  className,
}: StatCardProps) => {
  const config = variantConfig[variant];
  const isPositive =
    trend
      ? trend.direction === "down"
        ? false
        : trend.value >= 0
      : null;

  if (loading) {
    return (
      <div className={cn("card p-6 animate-pulse", className)}>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-8 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-16 bg-slate-200 rounded" />
          </div>
          <div className="h-12 w-12 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("card p-6 relative overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-800 tracking-tight">
            {value}
            {suffix && (
              <span className="text-base font-normal text-slate-500 mr-1">
                {suffix}
              </span>
            )}
          </p>

          {trend && (
            <div className={cn(
              "mt-2 inline-flex items-center gap-1 text-xs font-medium",
              isPositive ? "text-green-600" : "text-red-600"
            )}>
              {isPositive ? (
                <ArrowUpIcon className="h-3 w-3" />
              ) : (
                <ArrowDownIcon className="h-3 w-3" />
              )}
              <span>{Math.abs(trend.value)}٪</span>
              <span className="text-slate-400 font-normal">{trend.label}</span>
            </div>
          )}
        </div>

        {icon && (
          <div className={cn(
            "flex-shrink-0 p-3 rounded-xl",
            config.iconBg,
            config.iconText
          )}>
            <div className="h-6 w-6">{icon}</div>
          </div>
        )}
      </div>

      {/* Bottom color bar */}
      <div className={cn("absolute bottom-0 left-0 right-0 h-[3px]", config.bar)} />
    </div>
  );
};