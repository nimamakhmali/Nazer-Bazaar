"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Badge }         from "@/components/ui/Badge";
import { Button }        from "@/components/ui/Button";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }    from "@/components/ui/EmptyState";
import { Pagination }    from "@/components/common/Pagination";
import { StatCard }      from "@/components/ui/StatCard";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
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

interface AdminComplaintStats {
  total:      number;
  submitted:  number;
  reviewing:  number;
  confirmed:  number;
  closed:     number;
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
export default function AdminComplaintsPage() {
  const [items,       setItems]       = useState<Complaint[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState("");
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);
  const [stats,       setStats]       = useState<AdminComplaintStats>({
    total: 0, submitted: 0, reviewing: 0, confirmed: 0, closed: 0,
  });
  const [loadingStats,setLoadingStats]= useState(true);

  // ── fetch stats ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [allRes, submittedRes, reviewingRes, confirmedRes, closedRes] =
          await Promise.allSettled([
            apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { page_size: 1 } }),
            apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { status: "submitted",  page_size: 1 } }),
            apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { status: "reviewing",  page_size: 1 } }),
            apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { status: "confirmed",  page_size: 1 } }),
            apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { status: "closed",     page_size: 1 } }),
          ]);

        const getCount = (r: PromiseSettledResult<{ data: unknown }>) => {
          if (r.status !== "fulfilled") return 0;
          const d = (r.value as { data: { data?: { count?: number }; count?: number } }).data?.data ??
                    (r.value as { data: { count?: number } }).data;
          return typeof d === "object" && d !== null && "count" in d
            ? (d as { count: number }).count
            : 0;
        };

        setStats({
          total:     getCount(allRes),
          submitted: getCount(submittedRes),
          reviewing: getCount(reviewingRes),
          confirmed: getCount(confirmedRes),
          closed:    getCount(closedRes),
        });
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // ── fetch list ─────────────────────────────────────────────────────────────
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

      {/* ── Header ── */}
      <PageHeader
        title="مدیریت شکایات"
        subtitle="مشاهده و پیگیری تمام شکایات سامانه"
        breadcrumbs={[
          { label: "ادمین", href: "/dashboard" },
          { label: "شکایات" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
          >
            خروجی Excel
          </Button>
        }
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {loadingStats ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard
              title="کل شکایات"
              value={stats.total.toLocaleString("fa-IR")}
              variant="primary"
              icon={<ClipboardDocumentListIcon />}
            />
            <StatCard
              title="ثبت شده"
              value={stats.submitted.toLocaleString("fa-IR")}
              variant="secondary"
              icon={<ClockIcon />}
            />
            <StatCard
              title="در بررسی"
              value={stats.reviewing.toLocaleString("fa-IR")}
              variant="warning"
              icon={<FireIcon />}
            />
            <StatCard
              title="تایید شده"
              value={stats.confirmed.toLocaleString("fa-IR")}
              variant="success"
              icon={<CheckCircleIcon />}
            />
            <StatCard
              title="مختومه"
              value={stats.closed.toLocaleString("fa-IR")}
              variant="primary"
              icon={<XCircleIcon />}
            />
          </>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                             h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="جستجوی عنوان، فروشگاه..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                         focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-8 pr-4 py-2.5 text-sm border border-slate-200
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

        {/* Active filters badges */}
        {(search || statusFilter) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">فیلتر فعال:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100
                                text-primary-700 rounded-full text-xs font-semibold">
                جستجو: {search}
                <button onClick={() => setSearch("")} className="hover:text-red-500">
                  <XCircleIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary-100
                                text-secondary-700 rounded-full text-xs font-semibold">
                {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
                <button onClick={() => setStatusFilter("")} className="hover:text-red-500">
                  <XCircleIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={10} cols={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ClipboardDocumentListIcon className="h-16 w-16" />}
            title="شکایتی یافت نشد"
            description="با این فیلترها هیچ شکایتی وجود ندارد."
            size="lg"
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
                    {[
                      "عنوان شکایت",
                      "فروشگاه",
                      "قیمت گزارشی",
                      "وضعیت",
                      "زمان ثبت",
                      "آخرین بروزرسانی",
                      "عملیات",
                    ].map((h) => (
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
                    const isUrgent =
                      daysSince > 5 &&
                      ["submitted", "reviewing", "inspecting"].includes(c.status);

                    return (
                      <tr
                        key={c.uuid}
                        className={cn(
                          "border-b border-slate-50 transition-colors",
                          isUrgent
                            ? "bg-red-50/20 hover:bg-red-50/40"
                            : "hover:bg-slate-50/60"
                        )}
                      >
                        {/* Title */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {isUrgent && (
                              <FireIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            <p className="font-semibold text-slate-800 max-w-[200px] truncate">
                              {c.title}
                            </p>
                          </div>
                        </td>

                        {/* Store */}
                        <td className="px-4 py-4">
                          <p className="text-xs text-slate-600 max-w-[140px] truncate">
                            {c.store_name}
                          </p>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-4">
                          <span className="font-bold text-red-600 text-sm">
                            {formatPrice(c.price_reported)} ریال
                          </span>
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

                        {/* Created */}
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-xs text-slate-600">
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

                        {/* Updated */}
                        <td className="px-4 py-4 text-xs text-slate-400">
                          {timeAgo(c.updated_at)}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-4">
                          <Link href={`/admin/complaints/${c.uuid}`}>
                            <button className="p-1.5 rounded-lg text-slate-400
                                               hover:text-primary-600 hover:bg-primary-50
                                               transition-colors">
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

            {/* Pagination */}
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