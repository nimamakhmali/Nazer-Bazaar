"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Badge }         from "@/components/ui/Badge";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }    from "@/components/ui/EmptyState";
import { Pagination }    from "@/components/common/Pagination";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { extractArray, extractCount } from "@/utils/error.utils";
import { STORE_STATUS_LABELS, STORE_STATUS_COLORS } from "@/constants/status";
import type { StoreStatus } from "@/types/common.types";
import { cn }            from "@/lib/cn";
import Link              from "next/link";

interface StoreItem {
  id:             number;
  name:           string;
  union_name:     string;
  city_name:      string;
  owner_name:     string;
  license_number: string;
  status:         StoreStatus;
  status_display: string;
  complaints_count: number;
  pending_complaints_count: number;
}

export default function InspectorStoresPage() {
  const [stores,      setStores]      = useState<StoreItem[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 15 };
      if (search) params.search = search;
      const r = await apiClient.get(ENDPOINTS.STORES.LIST, { params });
      const d = r.data?.data ?? r.data;
      setStores(extractArray<StoreItem>(d));
      const cnt = extractCount(d, 0);
      setTotalCount(cnt);
      setTotalPages(Math.ceil(cnt / 15) || 1);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="فروشگاه‌ها"
        subtitle={`${totalCount.toLocaleString("fa-IR")} فروشگاه`}
        breadcrumbs={[
          { label: "بازرس", href: "/inspector/overview" },
          { label: "فروشگاه‌ها" },
        ]}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                           h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="جستجوی فروشگاه..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                       rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                       focus:border-primary-500 bg-slate-50 transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={10} cols={6} />
        ) : stores.length === 0 ? (
          <EmptyState title="فروشگاهی یافت نشد" size="md" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #f1f5f9"
                  }}>
                    {["فروشگاه","اتحادیه","مالک","وضعیت","شکایات","عملیات"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-right text-xs font-bold
                                              uppercase tracking-wider text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr key={store.id}
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary-50
                                           flex items-center justify-center flex-shrink-0">
                            <BuildingStorefrontIcon className="h-4 w-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{store.name}</p>
                            <p className="text-xs text-slate-400">{store.city_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">{store.union_name}</td>
                      <td className="px-5 py-4 text-xs text-slate-600">{store.owner_name}</td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full",
                          "text-xs font-semibold border",
                          STORE_STATUS_COLORS[store.status],
                        )}>
                          {STORE_STATUS_LABELS[store.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-700">
                            {store.complaints_count}
                          </span>
                          {store.pending_complaints_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs
                                             font-bold text-red-600 bg-red-50 px-2 py-0.5
                                             rounded-full">
                              <ShieldExclamationIcon className="h-3 w-3" />
                              {store.pending_complaints_count} باز
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/inspector/complaints?store=${store.id}`}>
                          <button className="p-1.5 rounded-lg text-slate-400
                                             hover:text-primary-600 hover:bg-primary-50
                                             transition-colors">
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
                <p className="text-xs text-slate-500">
                  {totalCount.toLocaleString("fa-IR")} فروشگاه
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}