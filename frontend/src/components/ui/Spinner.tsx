import { cn } from "@/lib/cn";

type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: "h-3 w-3 border-[1.5px]",
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
  xl: "h-16 w-16 border-4",
};

export const Spinner = ({
  size = "md",
  className,
  label = "در حال بارگذاری...",
}: SpinnerProps) => (
  <div
    role="status"
    aria-label={label}
    className={cn(
      "rounded-full border-slate-200 border-t-primary-600 animate-spin",
      sizeClasses[size],
      className
    )}
  />
);

export const PageLoader = ({ label }: { label?: string }) => (
  <div
    className="min-h-[400px] flex flex-col items-center justify-center gap-4"
    role="status"
  >
    <Spinner size="xl" />
    <p className="text-sm text-slate-500 animate-pulse">
      {label ?? "در حال بارگذاری..."}
    </p>
  </div>
);

export const FullPageLoader = () => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="xl" />
      <p className="text-sm text-slate-500">لطفاً صبر کنید...</p>
    </div>
  </div>
);