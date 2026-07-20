"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BuildingOffice2Icon,
  UserIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  MapPinIcon,
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
import Link              from "next/link";

interface Chamber {
  id:            number;
  name:          string;
  city_name:     string;
  province_name: string;
  manager_name:  string;
  unions_count:  number;
  is_active:     boolean;
}

export default function ProvinceChambersPage() {
  const [chambers,    setChambers]    = useState<Chamber[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 12 };
      if (search) params.search = search;
      const r = await apiClient.get(ENDPOINTS.ORGANIZATIONS.CHAMBERS, { params });
      const d = r.data?.data ?? r.data;
      setChambers(extractArray<Chamber>(d));
      const cnt = extractCount(d, 0);
      setTotalCount(cnt);
      setTotalPages(Math.ceil(cnt / 12) || 1);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="اتاق‌های اصناف استان"
        subtitle={`${totalCount.toLocaleString("fa-IR")} اتاق اصناف`}
        breadcrumbs={[
          { label: "استانداری", href: "/province/overview" },
          { label: "اتاق‌های اصناف" },
        ]}
      />

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                           h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="جستجوی اتاق اصناف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                                    shadow-card p-5 animate-pulse space-y-4">
              <div className="flex gap-3">
                <div className="h-12 w-12 bg-slate-200 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-14 bg-slate-100 rounded-xl" />
                <div className="h-14 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : chambers.length === 0 ? (
        <EmptyState
          icon={<BuildingOffice2Icon className="h-16 w-16" />}
          title="اتاق اصنافی یافت نشد"
          description="هیچ اتاق اصنافی در این استان ثبت نشده است."
          size="lg"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {chambers.map((chamber) => (
              <ChamberCard key={chamber.id} chamber={chamber} />
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

function ChamberCard({ chamber }: { chamber: Chamber }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card
                     hover:shadow-card-hover transition-all duration-200 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-primary-600 to-primary-400" />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center
                           justify-center flex-shrink-0">
            <BuildingOffice2Icon className="h-6 w-6 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate">{chamber.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPinIcon className="h-3 w-3 text-slate-400" />
              <p className="text-xs text-slate-500 truncate">{chamber.city_name}</p>
            </div>
          </div>
          <Badge
            variant={chamber.is_active ? "success" : "default"}
            dot
            size="sm"
          >
            {chamber.is_active ? "فعال" : "غیرفعال"}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-3 bg-slate-50 rounded-xl text-center">
            <ShieldCheckIcon className="h-4 w-4 text-slate-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800">
              {chamber.unions_count}
            </p>
            <p className="text-[10px] text-slate-400">اتحادیه</p>
          </div>
          <div className="p-3 bg-primary-50 rounded-xl">
            <UserIcon className="h-4 w-4 text-primary-400 mb-1" />
            <p className="text-xs font-semibold text-primary-800 truncate leading-snug">
              {chamber.manager_name || "—"}
            </p>
            <p className="text-[10px] text-primary-500">مدیر اتاق</p>
          </div>
        </div>

        {/* Action */}
        <Link href={`/province/chambers/${chamber.id}`}>
          <button className="w-full flex items-center justify-center gap-2 py-2.5
                              bg-slate-50 hover:bg-primary-50 rounded-xl text-sm
                              font-semibold text-slate-600 hover:text-primary-700
                              transition-colors group">
            <EyeIcon className="h-4 w-4 group-hover:text-primary-600 transition-colors" />
            مشاهده جزئیات
          </button>
        </Link>
      </div>
    </div>
  );
}