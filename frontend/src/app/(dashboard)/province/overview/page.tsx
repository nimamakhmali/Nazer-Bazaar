"use client";

import React, { useState, useEffect } from "react";
import {
  BuildingStorefrontIcon, ShieldCheckIcon,
  BuildingOffice2Icon,    ClipboardDocumentListIcon,
  ExclamationTriangleIcon,ArrowTrendingUpIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { PageHeader }       from "@/components/layout/PageHeader";
import { StatCard }         from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }            from "@/components/ui/Badge";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import { EmptyState }       from "@/components/ui/EmptyState";
import apiClient            from "@/services/api.client";
import { ENDPOINTS }        from "@/services/endpoints";
import { extractArray, extractCount } from "@/utils/error.utils";
import { getTodayJalali }   from "@/utils/date.utils";
import { cn }               from "@/lib/cn";
import Link                 from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface CityRow {
  id:              number;
  name:            string;
  stores_count:    number;
  complaints_count:number;
  overpriced_count:number;
  chambers_count:  number;
}

interface ProvinceStats {
  total_stores:   number;
  total_unions:   number;
  total_chambers: number;
  open_complaints:number;
}

// gradient colors for bars
const BAR_COLORS = [
  "#1B3A6B","#2E6DB4","#3B82F6","#60A5FA","#93C5FD",
  "#BFDBFE","#C49A2E","#DEB94A",
];

// ─────────────────────────────────────────────────────────────────────────────
export default function ProvinceOverviewPage() {
  const [stats,   setStats]   = useState<ProvinceStats>({
    total_stores: 0, total_unions: 0, total_chambers: 0, open_complaints: 0,
  });
  const [cities,  setCities]  = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [storesRes, chambersRes, unionsRes] = await Promise.allSettled([
          apiClient.get(ENDPOINTS.STORES.LIST,             { params: { page_size: 1 } }),
          apiClient.get(ENDPOINTS.ORGANIZATIONS.CHAMBERS,  { params: { page_size: 1 } }),
          apiClient.get(ENDPOINTS.ORGANIZATIONS.UNIONS,    { params: { page_size: 1 } }),
        ]);

        const newStats = { ...stats };
        if (storesRes.status   === "fulfilled") {
          const d = storesRes.value.data?.data ?? storesRes.value.data;
          newStats.total_stores   = extractCount(d, 0);
        }
        if (chambersRes.status === "fulfilled") {
          const d = chambersRes.value.data?.data ?? chambersRes.value.data;
          newStats.total_chambers = extractCount(d, 0);
        }
        if (unionsRes.status   === "fulfilled") {
          const d = unionsRes.value.data?.data ?? unionsRes.value.data;
          newStats.total_unions   = extractCount(d, 0);
        }
        setStats(newStats);

        // cities data (mocked with chambers per city)
        const cRes = await apiClient.get(ENDPOINTS.GEOGRAPHY.CITIES, {
          params: { page_size: 20 },
        });
        const cData = cRes.data?.data ?? cRes.data;
        const cityList = extractArray<{ id:number; name:string }>(cData);
        setCities(
          cityList.slice(0, 8).map((c, i) => ({
            id:               c.id,
            name:             c.name,
            stores_count:     Math.floor(Math.random() * 50) + 5,
            complaints_count: Math.floor(Math.random() * 20),
            overpriced_count: Math.floor(Math.random() * 5),
            chambers_count:   1,
          })),
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const maxStores = Math.max(...cities.map((c) => c.stores_count), 1);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">نمای کلی استان</h1>
          <p className="text-sm text-slate-500 mt-1">{getTodayJalali()}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-600 font-semibold">آنلاین</span>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard
              title="کل فروشگاه‌ها"
              value={stats.total_stores.toLocaleString("fa-IR")}
              variant="primary"
              icon={<BuildingStorefrontIcon />}
            />
            <StatCard
              title="اتاق‌های اصناف"
              value={stats.total_chambers.toLocaleString("fa-IR")}
              variant="secondary"
              icon={<BuildingOffice2Icon />}
            />
            <StatCard
              title="اتحادیه‌ها"
              value={stats.total_unions.toLocaleString("fa-IR")}
              variant="success"
              icon={<ShieldCheckIcon />}
            />
            <StatCard
              title="شکایات باز"
              value={stats.open_complaints.toLocaleString("fa-IR")}
              variant="danger"
              icon={<ClipboardDocumentListIcon />}
            />
          </>
        )}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Bar Chart: cities ── */}
        <Card className="xl:col-span-2" padding="md">
          <CardHeader>
            <CardTitle subtitle="مقایسه تعداد فروشگاه در شهرهای استان">
              مقایسه شهرها
            </CardTitle>
            <ChartBarIcon className="h-5 w-5 text-slate-300" />
          </CardHeader>

          {cities.length === 0 ? (
            <EmptyState title="داده‌ای برای نمایش وجود ندارد" size="sm" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cities}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      fontFamily: "Vazirmatn",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [`${v.toLocaleString("fa-IR")} فروشگاه`]}
                  />
                  <Bar
                    dataKey="stores_count"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={28}
                  >
                    {cities.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* ── Quick links ── */}
        <div className="space-y-4">
          <Card padding="md">
            <p className="text-sm font-bold text-slate-700 mb-4">دسترسی سریع</p>
            <div className="space-y-2">
              {[
                {
                  label: "اتاق‌های اصناف",
                  href:  "/province/chambers",
                  icon:  BuildingOffice2Icon,
                  color: "bg-primary-50 text-primary-600",
                },
                {
                  label: "شکایات استان",
                  href:  "/province/complaints",
                  icon:  ClipboardDocumentListIcon,
                  color: "bg-red-50 text-red-600",
                },
                {
                  label: "گزارش‌ها",
                  href:  "/province/reports",
                  icon:  ArrowTrendingUpIcon,
                  color: "bg-secondary-50 text-secondary-600",
                },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 p-3 rounded-xl
                                   hover:bg-slate-50 transition-colors group cursor-pointer">
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      item.color,
                    )}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700
                                      group-hover:text-primary-700">
                      {item.label}
                    </span>
                    <span className="text-slate-300 group-hover:text-primary-400
                                      transition-colors text-lg">←</span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* City table summary */}
          <Card padding="none">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-bold text-slate-700 text-sm">وضعیت شهرها</p>
            </div>
            <div className="divide-y divide-slate-50">
              {cities.slice(0, 5).map((city) => (
                <div key={city.id}
                     className="flex items-center gap-3 px-5 py-3.5
                                hover:bg-slate-50/70 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {city.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {city.stores_count} فروشگاه
                    </p>
                  </div>
                  {city.overpriced_count > 0 && (
                    <Badge variant="danger" size="sm">
                      <ExclamationTriangleIcon className="h-3 w-3" />
                      {city.overpriced_count} متخلف
                    </Badge>
                  )}
                  {/* Mini progress bar */}
                  <div className="w-16 bg-slate-100 rounded-full h-1.5 flex-shrink-0">
                    <div
                      className="h-1.5 rounded-full bg-primary-500"
                      style={{ width: `${(city.stores_count / maxStores) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Cities detailed table ── */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-800">جدول شهرهای استان</p>
            <p className="text-xs text-slate-400 mt-0.5">آمار تفصیلی هر شهر</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                {["شهر","فروشگاه‌ها","شکایات","متخلفان","وضعیت"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-right text-xs font-bold
                                          uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cities.map((city, i) => (
                <tr key={city.id}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center
                                    flex-shrink-0 text-white text-xs font-bold"
                        style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                      >
                        {city.name[0]}
                      </div>
                      <span className="font-semibold text-slate-800">{city.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-primary-700">
                      {city.stores_count.toLocaleString("fa-IR")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {city.complaints_count.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-5 py-4">
                    {city.overpriced_count > 0 ? (
                      <Badge variant="danger" size="sm">
                        {city.overpriced_count}
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">بدون تخلف</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 w-24 bg-slate-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${(city.stores_count / maxStores) * 100}%`,
                            backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {Math.round((city.stores_count / maxStores) * 100)}٪
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}