"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon, ClipboardDocumentListIcon, EyeIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }   from "@/components/layout/PageHeader";
import { Badge }        from "@/components/ui/Badge";
import { Modal }        from "@/components/ui/Modal";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }   from "@/components/ui/EmptyState";
import { Pagination }   from "@/components/common/Pagination";
import apiClient        from "@/services/api.client";
import { ENDPOINTS }    from "@/services/endpoints";
import { parseApiError, extractArray, extractCount } from "@/utils/error.utils";
import { toJalali, toJalaliWithTime } from "@/utils/date.utils";
import { formatPrice }  from "@/utils/number.utils";
import toast            from "react-hot-toast";
import { cn }           from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
interface Complaint {
  uuid:           string;
  title:          string;
  store_name:     string;
  product_name:   string;
  status:         string;
  status_display: string;
  price_reported: number;
  created_at:     string;
}

const STATUS_CONFIG: Record<string, {
  variant: "success"|"danger"|"warning"|"info"|"default";
  label:   string;
}> = {
  submitted:  { variant: "info",    label: "ثبت شده"         },
  reviewing:  { variant: "warning", label: "در حال بررسی"    },
  referred:   { variant: "warning", label: "ارجاع داده شده"  },
  inspecting: { variant: "warning", label: "در حال بازرسی"   },
  confirmed:  { variant: "success", label: "تایید شده"        },
  rejected:   { variant: "danger",  label: "رد شده"          },
  closed:     { variant: "default", label: "مختومه"           },
};

const STATUS_FILTERS = [
  { value: "",           label: "همه" },
  { value: "submitted",  label: "ثبت شده" },
  { value: "reviewing",  label: "در بررسی" },
  { value: "confirmed",  label: "تایید شده" },
  { value: "closed",     label: "مختومه" },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function UnionComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("");

  const [showDetail, setShowDetail] = useState(false);
  const [selected,   setSelected]   = useState<Complaint | null>(null);

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 15 };
      if (search) params.search = search;
      if (filter) params.status = filter;
      const res  = await apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params });
      const data = res.data?.data ?? res.data;
      setComplaints(extractArray<Complaint>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 15) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => { fetchComplaints(); },       [fetchComplaints]);
  useEffect(() => { setPage(1); },              [search, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="شکایات اتحادیه"
        subtitle={`${totalCount.toLocaleString("fa-IR")} شکایت`}
        breadcrumbs={[{ label: "اتحادیه" }, { label: "شکایات" }]}
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
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  filter === opt.value
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={10} cols={6} />
        ) : complaints.length === 0 ? (
          <EmptyState title="شکایتی یافت نشد" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    {[
                      "عنوان شکایت", "فروشگاه", "محصول",
                      "قیمت گزارش شده", "وضعیت", "تاریخ", "عملیات",
                    ].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-right text-xs font-bold
                                             uppercase tracking-wider text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => {
                    const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.submitted;
                    return (
                      <tr
                        key={c.uuid}
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-orange-50
                                            flex items-center justify-center flex-shrink-0">
                              <ClipboardDocumentListIcon className="h-4 w-4 text-orange-500" />
                            </div>
                            <span className="font-semibold text-slate-800 line-clamp-1">
                              {c.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{c.store_name}</td>
                        <td className="px-5 py-4 text-slate-600">{c.product_name}</td>
                        <td className="px-5 py-4 font-semibold text-red-600">
                          {formatPrice(c.price_reported)} ریال
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={cfg.variant} dot size="sm">
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">
                          {toJalali(c.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => { setSelected(c); setShowDetail(true); }}
                            className="p-1.5 rounded-lg text-slate-400
                                       hover:text-primary-600 hover:bg-primary-50
                                       transition-colors"
                            title="مشاهده جزئیات"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
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
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="جزئیات شکایت"
        size="md"
      >
        {selected && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-base font-bold text-slate-800 mb-1">{selected.title}</p>
              <div className="flex items-center gap-2">
                <Badge
                  variant={STATUS_CONFIG[selected.status]?.variant ?? "default"}
                  dot size="sm"
                >
                  {STATUS_CONFIG[selected.status]?.label ?? selected.status_display}
                </Badge>
                <span className="text-xs text-slate-400">
                  {toJalaliWithTime(selected.created_at)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "فروشگاه",       value: selected.store_name },
                { label: "محصول",         value: selected.product_name },
                { label: "قیمت گزارشی",  value: formatPrice(selected.price_reported) + " ریال" },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="font-semibold text-slate-800 text-sm">{value}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700">
              برای مشاهده جزئیات کامل و پاسخ‌دهی به شکایت، به صفحه جزئیات بروید.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}