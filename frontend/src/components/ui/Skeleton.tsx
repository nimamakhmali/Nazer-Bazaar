import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    className={cn(
      "animate-pulse rounded-lg bg-slate-200",
      className
    )}
    aria-hidden="true"
  />
);

export const SkeletonText = ({
  lines = 3,
  className,
}: { lines?: number; className?: string }) => (
  <div className={cn("space-y-2", className)} aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={cn("h-4", i === lines - 1 && lines > 1 ? "w-3/4" : "w-full")}
      />
    ))}
  </div>
);

export const SkeletonCard = ({ className }: SkeletonProps) => (
  <div
    className={cn(
      "bg-white rounded-xl border border-slate-100 p-6 space-y-4",
      className
    )}
    aria-hidden="true"
  >
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

export const SkeletonTable = ({
  rows = 5,
  cols = 4,
  className,
}: { rows?: number; cols?: number; className?: string }) => (
  <div
    className={cn("bg-white rounded-xl border border-slate-100 overflow-hidden", className)}
    aria-hidden="true"
  >
    {/* Header */}
    <div className="bg-slate-50 px-6 py-3 flex gap-4 border-b border-slate-100">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, ri) => (
      <div
        key={ri}
        className="px-6 py-4 flex gap-4 border-b border-slate-50 last:border-0"
      >
        {Array.from({ length: cols }).map((_, ci) => (
          <Skeleton
            key={ci}
            className={cn("h-4 flex-1", ci === 0 ? "w-1/4" : "w-auto")}
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonStatCard = () => (
  <div
    className="bg-white rounded-xl border border-slate-100 p-6"
    aria-hidden="true"
  >
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-12 w-12 rounded-xl" />
    </div>
  </div>
);