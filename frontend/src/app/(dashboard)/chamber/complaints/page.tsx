// ─── chamber/complaints/page.tsx ──────────────────────────────────────────
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { ClipboardDocumentListIcon, MagnifyingGlassIcon, EyeIcon } from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Badge }         from "@/components/ui/Badge";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }    from "@/components/ui/EmptyState";
import { Pagination }    from "@/components/common/Pagination";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { extractArray, extractCount } from "@/utils/error.utils";
import { toJalali }      from "@/utils/date.utils";
import { cn }            from "@/lib/cn";
import Link              from "next/link";

interface Complaint {
  uuid:           string;
  title:          string;
  store_name:     string;
  status:         string;
  status_display: string;
  created_at:     string;
}

const STATUS_OPTIONS = [
  { value: "",          label: "همه" },
  { value: "submitted", label: "ثبت شده" },
  { value: "reviewing", label: "در بررسی" },
  { value: "confirmed", label: "تایید شده" },
  { value: "closed",    label: "مختومه" },
];

const BADGE_MAP: Record<string, "success"|"danger"|"warning"|"info"|"default"> = {
  submitted: "info", reviewing: "warning", referred: "warning",
  inspecting: "warning", confirmed: "success", rejected: "danger", closed: "default",
};

export default function ChamberComplaintsPage() {
  const [items,      setItems]      = useState<Complaint[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [search,     setSearch]     = useState("");
  const [status,     setStatus]     = useState("");
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string,unknown> = { page, page_size: 15 };
      if (search) params.search = search;
      if (status) params.status = status;
      const r = await apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params });
      const d = r.data?.data ?? r.data;
      setItems(extractArray<Complaint>(d));
      const cnt = extractCount(d, 0);
      setTotalCount(cnt);
      setTotalPages(Math.ceil(cnt / 15) || 1);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [search, status]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="شکایات شهر"
        subtitle={`${totalCount.toLocaleString("fa-IR")} شکایت`}
        breadcrumbs={[
          { label: "اتاق اصناف", href: "/chamber/overview" },
          { label: "شکایات" },
        ]}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                             h-4 w-4 text-slate-400 pointer-events-none" />
            <input type="search" placeholder="جستجو..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-primary-100 bg-slate-50" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl
                       bg-white appearance-none min-w-[150px]">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? <SkeletonTable rows={10} cols={4} /> :
          items.length === 0 ? <EmptyState title="شکایتی یافت نشد" size="md" /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                      {["عنوان","فروشگاه","وضعیت","تاریخ","عملیات"].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-right text-xs font-bold
                                                uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => (
                      <tr key={c.uuid} className="border-b border-slate-50 hover:bg-slate-50/60">
                        <td className="px-5 py-3.5 font-medium text-slate-800">{c.title}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">{c.store_name}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={BADGE_MAP[c.status] ?? "default"} size="sm" dot>
                            {c.status_display}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400">
                          {toJalali(c.created_at)}
                        </td>
                        <td className="px-5 py-3.5">
                          <Link href={`/chamber/complaints/${c.uuid}`}>
                            <button className="p-1.5 rounded-lg text-slate-400
                                               hover:text-primary-600 hover:bg-primary-50">
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50
                                flex items-center justify-between">
                  <p className="text-xs text-slate-500">{totalCount.toLocaleString("fa-IR")} شکایت</p>
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
}