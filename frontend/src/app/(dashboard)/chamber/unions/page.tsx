// src/app/(dashboard)/chamber/unions/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import {
  ShieldCheckIcon, BuildingStorefrontIcon,
  UserIcon, MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Badge }         from "@/components/ui/Badge";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }    from "@/components/ui/EmptyState";
import { Pagination }    from "@/components/common/Pagination";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { extractArray, extractCount } from "@/utils/error.utils";
import { cn }            from "@/lib/cn";

interface Union {
  id:           number;
  name:         string;
  chamber_name: string;
  city_name:    string;
  manager_name: string;
  stores_count: number;
  is_active:    boolean;
}

export default function ChamberUnionsPage() {
  const [unions,     setUnions]     = useState<Union[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    apiClient.get(ENDPOINTS.ORGANIZATIONS.UNIONS, {
      params: { search, page, page_size: 12 },
    }).then((r) => {
      const d = r.data?.data ?? r.data;
      setUnions(extractArray<Union>(d));
      const cnt = extractCount(d, 0);
      setTotalCount(cnt);
      setTotalPages(Math.ceil(cnt / 12) || 1);
    }).catch(() => {})
    .finally(() => setIsLoading(false));
  }, [search, page]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="اتحادیه‌های شهر"
        subtitle={`${totalCount.toLocaleString("fa-IR")} اتحادیه`}
        breadcrumbs={[
          { label: "اتاق اصناف", href: "/chamber/overview" },
          { label: "اتحادیه‌ها" },
        ]}
      />

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                           h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="جستجوی اتحادیه..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                       rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                       focus:border-primary-500 bg-slate-50 transition-all"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100
                                    shadow-card p-5 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="h-12 w-12 bg-slate-200 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : unions.length === 0 ? (
        <EmptyState
          icon={<ShieldCheckIcon className="h-16 w-16" />}
          title="اتحادیه‌ای یافت نشد"
          size="lg"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {unions.map((union) => (
              <UnionCard key={union.id} union={union} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UnionCard({ union }: { union: Union }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card
                     hover:shadow-card-hover transition-all duration-200 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-primary-600 to-accent" />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center
                           justify-center flex-shrink-0">
            <ShieldCheckIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate">{union.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{union.city_name}</p>
          </div>
          {union.is_active ? (
            <Badge variant="success" dot size="sm">فعال</Badge>
          ) : (
            <Badge variant="default" dot size="sm">غیرفعال</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-3 bg-slate-50 rounded-xl text-center">
            <BuildingStorefrontIcon className="h-4 w-4 text-slate-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800">
              {union.stores_count}
            </p>
            <p className="text-[10px] text-slate-400">فروشگاه</p>
          </div>
          <div className="p-3 bg-primary-50 rounded-xl">
            <UserIcon className="h-4 w-4 text-primary-400 mb-1" />
            <p className="text-xs font-semibold text-primary-800 truncate">
              {union.manager_name || "—"}
            </p>
            <p className="text-[10px] text-primary-500">رئیس اتحادیه</p>
          </div>
        </div>
      </div>
    </div>
  );
}