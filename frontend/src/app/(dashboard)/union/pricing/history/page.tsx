"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MagnifyingGlassIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import { PageHeader }   from "@/components/layout/PageHeader";
import { Badge }        from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }   from "@/components/ui/EmptyState";
import { Pagination }   from "@/components/common/Pagination";
import apiClient        from "@/services/api.client";
import { ENDPOINTS }    from "@/services/endpoints";
import { parseApiError, extractArray, extractCount } from "@/utils/error.utils";
import { formatPrice }  from "@/utils/number.utils";
import { toJalali }     from "@/utils/date.utils";
import toast            from "react-hot-toast";
import { cn }           from "@/lib/cn";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
interface PriceHistory {
  id:                   number;
  change_type:          string;
  change_type_display:  string;
  product_name:         string;
  union_name:           string;
  store_name:           string | null;
  old_price:            number | null;
  new_price:            number;
  price_change_amount:  number;
  price_change_percent: number;
  price_date:           string;
  changed_by_name:      string;
  changed_by_role:      string;
  note:                 string | null;
  created_at:           string;
}

const CHANGE_TYPE_VARIANT: Record<string, "primary"|"success"|"danger"|"info"|"default"> = {
  official_created:   "primary",
  official_updated:   "info",
  official_deactivated:"danger",
  store_created:      "success",
  store_updated:      "info",
  store_deactivated:  "default",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function UnionPricingHistoryPage() {
  const [history,    setHistory]    = useState<PriceHistory[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search,     setSearch]     = useState("");

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 20 };
      if (search) params.search = search;
      const res  = await apiClient.get(ENDPOINTS.PRICING.HISTORY, { params });
      const data = res.data?.data ?? res.data;
      setHistory(extractArray<PriceHistory>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 20) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchHistory(); },    [fetchHistory]);
  useEffect(() => { setPage(1); },        [search]);

  // Build mini chart from history
  const chartData = history
    .filter((h) => h.change_type.startsWith("official"))
    .slice(0, 10)
    .reverse()
    .map((h) => ({
      date:  toJalali(h.price_date),
      price: h.new_price,
      name:  h.product_name,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="تاریخچه قیمت‌ها"
        subtitle={`${totalCount.toLocaleString("fa-IR")} تغییر قیمت`}
        breadcrumbs={[
          { label: "اتحادیه" }, { label: "قیمت‌گذاری" }, { label: "تاریخچه" },
        ]}
      />

      {/* Mini chart */}
      {chartData.length > 1 && (
        <Card padding="md">
          <CardHeader>
            <CardTitle subtitle="نمودار تغییرات قیمت مصوب">
              روند قیمت‌ها
            </CardTitle>
          </CardHeader>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(v: number) => [formatPrice(v) + " ریال", "قیمت"]}
                  contentStyle={{
                    fontFamily: "Vazirmatn", borderRadius: "12px",
                    border: "1px solid #e2e8f0", fontSize: "11px",
                  }}
                />
                <Line
                  type="monotone" dataKey="price"
                  stroke="#1B3A6B" strokeWidth={2}
                  dot={{ fill: "#1B3A6B", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                           h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="جستجوی محصول یا فروشگاه..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                       rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                       focus:border-primary-500 bg-slate-50 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={12} cols={7} />
        ) : history.length === 0 ? (
          <EmptyState title="تاریخچه‌ای یافت نشد" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    {[
                      "تاریخ", "نوع تغییر", "محصول",
                      "قیمت قبلی", "قیمت جدید", "درصد تغییر", "توسط",
                    ].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-right text-xs font-bold
                                             uppercase tracking-wider text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const isIncrease = item.price_change_amount > 0;
                    const isDecrease = item.price_change_amount < 0;

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Date */}
                        <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                          {toJalali(item.price_date)}
                        </td>

                        {/* Change type */}
                        <td className="px-5 py-3.5">
                          <Badge
                            variant={CHANGE_TYPE_VARIANT[item.change_type] ?? "default"}
                            size="sm"
                          >
                            {item.change_type_display}
                          </Badge>
                        </td>

                        {/* Product */}
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-800">{item.product_name}</p>
                          {item.store_name && (
                            <p className="text-xs text-slate-400">{item.store_name}</p>
                          )}
                        </td>

                        {/* Old price */}
                        <td className="px-5 py-3.5 text-slate-400 text-sm">
                          {item.old_price
                            ? formatPrice(item.old_price) + " ریال"
                            : <span className="text-slate-300">—</span>
                          }
                        </td>

                        {/* New price */}
                        <td className="px-5 py-3.5 font-semibold text-slate-800">
                          {formatPrice(item.new_price)} ریال
                        </td>

                        {/* Change percent */}
                        <td className="px-5 py-3.5">
                          {item.old_price && item.price_change_percent !== 0 ? (
                            <div className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold",
                              isIncrease
                                ? "bg-red-50 text-red-600"
                                : isDecrease
                                ? "bg-green-50 text-green-600"
                                : "bg-slate-50 text-slate-500",
                            )}>
                              {isIncrease ? (
                                <ArrowUpIcon className="h-3 w-3" />
                              ) : (
                                <ArrowDownIcon className="h-3 w-3" />
                              )}
                              {Math.abs(item.price_change_percent).toFixed(1)}٪
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">جدید</span>
                          )}
                        </td>

                        {/* By */}
                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                          {item.changed_by_name}
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
                  {totalCount.toLocaleString("fa-IR")} تغییر قیمت
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