"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon, BuildingStorefrontIcon,
  CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }   from "@/components/layout/PageHeader";
import { Badge }        from "@/components/ui/Badge";
import { Drawer }       from "@/components/ui/Drawer";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }   from "@/components/ui/EmptyState";
import { Pagination }   from "@/components/common/Pagination";
import apiClient        from "@/services/api.client";
import { ENDPOINTS }    from "@/services/endpoints";
import { parseApiError, extractArray, extractCount } from "@/utils/error.utils";
import { formatPrice }  from "@/utils/number.utils";
import toast            from "react-hot-toast";
import { cn }           from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
interface Store {
  id:           number;
  name:         string;
  union_name:   string;
  city_name:    string;
  owner_name:   string;
  owner_phone:  string;
  phone:        string;
  status:       string;
  status_display: string;
  is_active:    boolean;
  complaints_count: number;
}

interface StorePrice {
  product_name:         string;
  price:                number;
  official_price_amount:number;
  is_compliant:         boolean;
  is_overpriced:        boolean;
  violation_amount:     number;
  is_today:             boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function UnionStoresPage() {
  const [stores,     setStores]     = useState<Store[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search,     setSearch]     = useState("");

  const [showDrawer,   setShowDrawer]   = useState(false);
  const [selected,     setSelected]     = useState<Store | null>(null);
  const [storePrices,  setStorePrices]  = useState<StorePrice[]>([]);
  const [pricesLoading,setPricesLoading]= useState(false);

  // ── fetch stores ────────────────────────────────────────────────────────────
  const fetchStores = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 12 };
      if (search) params.search = search;
      const res  = await apiClient.get(ENDPOINTS.STORES.LIST, { params });
      const data = res.data?.data ?? res.data;
      setStores(extractArray<Store>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 12) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchStores(); }, [fetchStores]);
  useEffect(() => { setPage(1); },    [search]);

  // ── open store drawer ────────────────────────────────────────────────────────
  const openDrawer = async (store: Store) => {
    setSelected(store);
    setShowDrawer(true);
    setStorePrices([]);
    setPricesLoading(true);
    try {
      const res  = await apiClient.get(ENDPOINTS.PRICING.STORE_PRICES_TODAY, {
        params: { store: store.id },
      });
      const data = res.data?.data ?? res.data;
      setStorePrices(extractArray<StorePrice>(data));
    } catch {
      setStorePrices([]);
    } finally {
      setPricesLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="فروشگاه‌های اتحادیه"
        subtitle={`${totalCount.toLocaleString("fa-IR")} فروشگاه عضو`}
        breadcrumbs={[{ label: "اتحادیه" }, { label: "فروشگاه‌ها" }]}
      />

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="relative max-w-sm">
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

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5
                                    animate-pulse space-y-3">
              <div className="flex gap-3">
                <div className="h-12 w-12 bg-slate-200 rounded-xl flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-10 bg-slate-100 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : stores.length === 0 ? (
        <EmptyState title="فروشگاهی یافت نشد" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stores.map((store) => {
              const isActive = store.status === "active";
              return (
                <div
                  key={store.id}
                  onClick={() => openDrawer(store)}
                  className="bg-white rounded-2xl border border-slate-100 shadow-card p-5
                             hover:shadow-card-hover transition-all cursor-pointer group"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      isActive ? "bg-primary-100" : "bg-slate-100",
                    )}>
                      <BuildingStorefrontIcon className={cn(
                        "h-6 w-6",
                        isActive ? "text-primary-600" : "text-slate-400",
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 truncate
                                     group-hover:text-primary-700 transition-colors">
                        {store.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{store.city_name}</p>
                    </div>
                    <Badge
                      variant={isActive ? "success" : "danger"}
                      dot size="sm"
                    >
                      {store.status_display}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="p-2.5 bg-slate-50 rounded-xl text-center">
                      <p className="text-lg font-bold text-primary-700">
                        {store.complaints_count ?? 0}
                      </p>
                      <p className="text-[10px] text-slate-400">شکایت</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl col-span-2">
                      <p className="text-xs font-semibold text-slate-700 truncate">
                        {store.owner_name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {store.owner_phone}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-primary-600 font-medium
                                group-hover:text-primary-800 transition-colors">
                    مشاهده قیمت‌های امروز ←
                  </p>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {/* Store Detail Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={selected?.name ?? "جزئیات فروشگاه"}
        position="right"
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            {/* Store info */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2.5">
              {[
                { label: "اتحادیه",  value: selected.union_name },
                { label: "شهر",      value: selected.city_name },
                { label: "مالک",     value: selected.owner_name },
                { label: "موبایل",   value: selected.owner_phone },
                { label: "تلفن",     value: selected.phone || "—" },
                { label: "وضعیت",    value: selected.status_display },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{label}</span>
                  <span className="text-sm font-medium text-slate-700">{value}</span>
                </div>
              ))}
            </div>

            {/* Today prices */}
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-3">
                قیمت‌های امروز فروشگاه
              </h4>

              {pricesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 rounded-full border-2 border-slate-300
                                  border-t-primary-500 animate-spin" />
                </div>
              ) : storePrices.length === 0 ? (
                <div className="flex items-center gap-2 p-4 bg-amber-50
                                border border-amber-200 rounded-xl">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    این فروشگاه امروز قیمتی ثبت نکرده است
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {storePrices.map((sp, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border",
                        sp.is_overpriced
                          ? "bg-red-50 border-red-200"
                          : sp.is_compliant
                          ? "bg-green-50 border-green-200"
                          : "bg-amber-50 border-amber-200",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {sp.product_name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          مصوب: {formatPrice(sp.official_price_amount)} ریال
                        </p>
                      </div>
                      <div className="text-left flex-shrink-0 mr-3">
                        <p className={cn(
                          "text-sm font-bold",
                          sp.is_overpriced ? "text-red-600" : "text-green-700",
                        )}>
                          {formatPrice(sp.price)} ریال
                        </p>
                        {sp.is_overpriced && (
                          <p className="text-[10px] text-red-500 mt-0.5">
                            +{formatPrice(sp.violation_amount)} تخلف
                          </p>
                        )}
                      </div>
                      <div className="mr-2 flex-shrink-0">
                        {sp.is_overpriced ? (
                          <XCircleIcon className="h-5 w-5 text-red-500" />
                        ) : sp.is_compliant ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}