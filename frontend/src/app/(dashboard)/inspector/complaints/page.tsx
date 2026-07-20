"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  FunnelIcon,
  FireIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Badge }         from "@/components/ui/Badge";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }    from "@/components/ui/EmptyState";
import { Pagination }    from "@/components/common/Pagination";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { extractArray, extractCount } from "@/utils/error.utils";
import { toJalali, timeAgo } from "@/utils/date.utils";
import { formatPrice }   from "@/utils/number.utils";
import { cn }            from "@/lib/cn";
import Link              from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface Complaint {
  uuid:           string;
  title:          string;
  store_name:     string;
  status:         string;
  status_display: string;
  price_reported: number;
  created_at:     string;
  updated_at:     string;
}

const STATUS_OPTIONS = [
  { value: "",            label: "همه وضعیت‌ها" },
  { value: "submitted",   label: "ثبت شده" },
  { value: "reviewing",   label: "در بررسی" },
  { value: "referred",    label: "ارجاع شده" },
  { value: "inspecting",  label: "در بازرسی" },
  { value: "confirmed",   label: "تایید شده" },
  { value: "rejected",    label: "رد شده" },
  { value: "closed",      label: "مختومه" },
];

const BADGE_MAP: Record<string,
  "success" | "danger" | "warning" | "info" | "default"
> = {
  submitted: "info", reviewing: "warning", referred: "warning",
  inspecting: "warning", confirmed: "success", rejected: "danger", closed: "default",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function InspectorComplaintsPage() {
  const [items,       setItems]       = useState<Complaint[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState("");
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 15 };
      if (search)       params.search = search;
      if (statusFilter) params.status = statusFilter;
      const r = await apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params });
      const d = r.data?.data ?? r.data;
      setItems(extractArray<Complaint>(d));
      const cnt = extractCount(d, 0);
      setTotalCount(cnt);
      setTotalPages(Math.ceil(cnt / 15) || 1);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="شکایات محوله"
        subtitle={`${totalCount.toLocaleString("fa-IR")} شکایت`}
        breadcrumbs={[
          { label: "بازرس", href: "/inspector/overview" },
          { label: "شکایات محوله" },
        ]}
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                             h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="جستجوی شکایت..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                         focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-8 pr-3 py-2.5 text-sm border border-slate-200
                         rounded-xl bg-white focus:outline-none focus:ring-2
                         focus:ring-primary-100 min-w-[180px] cursor-pointer"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <FunnelIcon className="absolute left-2.5 top-1/2 -translate-y-1/2
                                    h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={10} cols={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ClipboardDocumentListIcon className="h-14 w-14" />}
            title="شکایتی یافت نشد"
            size="md"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #f1f5f9"
                  }}>
                    {["اولویت","عنوان شکایت","فروشگاه","قیمت گزارشی","وضعیت","تاریخ","عملیات"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3.5 text-right text-xs font-bold
                                   uppercase tracking-wider text-slate-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => {
                    const daysSince = Math.floor(
                      (Date.now() - new Date(c.created_at).getTime()) /
                      (1000 * 60 * 60 * 24)
                    );
                    const isUrgent = daysSince > 3 &&
                      ["submitted","reviewing","inspecting"].includes(c.status);

                    return (
                      <tr
                        key={c.uuid}
                        className={cn(
                          "border-b border-slate-50 transition-colors",
                          isUrgent
                            ? "bg-red-50/30 hover:bg-red-50/60"
                            : "hover:bg-slate-50/60"
                        )}
                      >
                        {/* Priority */}
                        <td className="px-4 py-4">
                          {isUrgent ? (
                            <div className="flex items-center gap-1.5">
                              <FireIcon className="h-4 w-4 text-red-500" />
                              <span className="text-xs font-bold text-red-600">فوری</span>
                            </div>
                          ) : (
                            <ClockIcon className="h-4 w-4 text-slate-300" />
                          )}
                        </td>

                        {/* Title */}
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-800 max-w-[180px] truncate">
                            {c.title}
                          </p>
                        </td>

                        {/* Store */}
                        <td className="px-4 py-4 text-xs text-slate-500 max-w-[120px]">
                          <span className="truncate block">{c.store_name}</span>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-4 font-bold text-red-600">
                          {formatPrice(c.price_reported)} ریال
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <Badge
                            variant={BADGE_MAP[c.status] ?? "default"}
                            size="sm"
                            dot
                          >
                            {c.status_display}
                          </Badge>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-xs text-slate-500">
                              {toJalali(c.created_at)}
                            </p>
                            <p className={cn(
                              "text-xs font-semibold mt-0.5",
                              isUrgent ? "text-red-600" : "text-slate-400"
                            )}>
                              {daysSince} روز پیش
                            </p>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-4">
                          <Link href={`/inspector/complaints/${c.uuid}`}>
                            <button className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              "text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                            )}>
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50
                              flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {totalCount.toLocaleString("fa-IR")} شکایت
                </p>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}