"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "./Pagination";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  emptyMessage = "داده‌ای یافت نشد",
  emptyDescription,
  page,
  totalPages,
  onPageChange,
  className,
  onRowClick,
  stickyHeader = false,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  if (isLoading) {
    return <SkeletonTable rows={5} cols={columns.length} className={className} />;
  }

  return (
    <div className={cn("bg-white rounded-xl border border-slate-100 overflow-hidden shadow-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={cn(
            "bg-slate-50 border-b border-slate-100",
            stickyHeader && "sticky top-0 z-10"
          )}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap",
                        canSort && "cursor-pointer select-none hover:text-primary-600 transition-colors"
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-slate-300">
                            {sortDir === "asc" ? (
                              <ChevronUpIcon className="h-3.5 w-3.5 text-primary-500" />
                            ) : sortDir === "desc" ? (
                              <ChevronDownIcon className="h-3.5 w-3.5 text-primary-500" />
                            ) : (
                              <ChevronUpDownIcon className="h-3.5 w-3.5" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-slate-50">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    title={emptyMessage}
                    description={emptyDescription}
                    size="sm"
                  />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "hover:bg-slate-50/70 transition-colors duration-100",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3.5 text-slate-700 whitespace-nowrap"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {page && totalPages && onPageChange && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}