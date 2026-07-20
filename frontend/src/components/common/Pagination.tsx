"use client";
import { cn } from "@/lib/cn";
import { ChevronRightIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination = ({ page, totalPages, onPageChange, className }: PaginationProps) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>

      {pages[0] > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="px-3 py-1.5 rounded-lg hover:bg-slate-100 text-sm">۱</button>
          {pages[0] > 2 && <span className="text-muted px-1">...</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            p === page ? "bg-primary text-white" : "hover:bg-slate-100 text-slate-700"
          )}
        >
          {p}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="text-muted px-1">...</span>}
          <button onClick={() => onPageChange(totalPages)} className="px-3 py-1.5 rounded-lg hover:bg-slate-100 text-sm">{totalPages}</button>
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
    </div>
  );
};
