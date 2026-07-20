"use client";

import React, { useState, useEffect } from "react";
import {
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { PageHeader }       from "@/components/layout/PageHeader";
import { StatCard }         from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }            from "@/components/ui/Badge";
import { Button }           from "@/components/ui/Button";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import { EmptyState }       from "@/components/ui/EmptyState";
import apiClient            from "@/services/api.client";
import { ENDPOINTS }        from "@/services/endpoints";
import { extractArray }     from "@/utils/error.utils";
import { toJalali, getTodayJalali } from "@/utils/date.utils";
import { cn }               from "@/lib/cn";
import Link                 from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface PendingStore {
  id:           number;
  name:         string;
  union_name:   string;
  owner_name:   string;
  license_number: string;
  created_at:   string;
}

interface UnionStat {
  name:             string;
  complaints_count: number;
  stores_count:     number;
}

interface ChamberStats {
  active_stores:   number;
  pending_stores:  number;
  open_complaints: number;
  unions_count:    number;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ChamberOverviewPage() {
  const [stats,    setStats]    = useState<ChamberStats>({
    active_stores: 0, pending_stores: 0, open_complaints: 0, unions_count: 0,
  });
  const [pending,  setPending]  = useState<PendingStore[]>([]);
  const [chartData,setChartData]= useState<UnionStat[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [storesRes, pendingRes, unionsRes] = await Promise.allSettled([
          apiClient.get(ENDPOINTS.STORES.LIST,    { params: { status: "active",  page_size: 1 } }),
          apiClient.get(ENDPOINTS.STORES.PENDING, { params: { page_size: 5 } }),
          apiClient.get(ENDPOINTS.ORGANIZATIONS.UNIONS, { params: { page_size: 20 } }),
        ]);

        if (storesRes.status === "fulfilled") {
          const d = storesRes.value.data?.data ?? storesRes.value.data;
          setStats((p) => ({ ...p, active_stores: d?.count ?? 0 }));
        }
        if (pendingRes.status === "fulfilled") {
          const d = pendingRes.value.data?.data ?? pendingRes.value.data;
          const list = extractArray<PendingStore>(d);
          setPending(list);
          setStats((p) => ({ ...p, pending_stores: d?.count ?? list.length }));
        }
        if (unionsRes.status === "fulfilled") {
          const d = unionsRes.value.data?.data ?? unionsRes.value.data;
          const list = extractArray<UnionStat>(d);
          setStats((p) => ({ ...p, unions_count: d?.count ?? list.length }));
          setChartData(list.slice(0, 8));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">
            نمای کلی اتاق اصناف
          </h1>
          <p className="text-sm text-slate-500 mt-1">{getTodayJalali()}</p>
        </div>
        {stats.pending_stores > 0 && (
          <Link href="/chamber/stores/pending">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50
                            border-2 border-amber-300 rounded-2xl cursor-pointer
                            hover:bg-amber-100 transition-colors group">
              <div className="h-6 w-6 bg-amber-500 rounded-full flex items-center
                              justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {stats.pending_stores}
                </span>
              </div>
              <span className="text-sm font-bold text-amber-800">
                فروشگاه در انتظار تایید
              </span>
              <ArrowRightIcon className="h-4 w-4 text-amber-600 rotate-180
                                          group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard
              title="فروشگاه‌های فعال"
              value={stats.active_stores.toLocaleString("fa-IR")}
              variant="success"
              icon={<BuildingStorefrontIcon />}
            />
            <StatCard
              title="در انتظار تایید"
              value={stats.pending_stores.toLocaleString("fa-IR")}
              variant="warning"
              icon={<ClockIcon />}
            />
            <StatCard
              title="اتحادیه‌های شهر"
              value={stats.unions_count.toLocaleString("fa-IR")}
              variant="primary"
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
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── Bar Chart: unions ── */}
        <Card className="xl:col-span-3" padding="md">
          <CardHeader>
            <CardTitle subtitle="تعداد فروشگاه‌های هر اتحادیه">
              آمار اتحادیه‌ها
            </CardTitle>
            <ChartBarIcon className="h-5 w-5 text-slate-300" />
          </CardHeader>

          {chartData.length === 0 ? (
            <EmptyState
              title="داده‌ای برای نمایش وجود ندارد"
              size="sm"
            />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontFamily: "Vazirmatn",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [
                      `${v.toLocaleString("fa-IR")} فروشگاه`,
                      "تعداد",
                    ]}
                  />
                  <Bar
                    dataKey="stores_count"
                    fill="#1B3A6B"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* ── Quick Stats sidebar ── */}
        <div className="xl:col-span-2 space-y-4">
          {/* Pending summary */}
          <Card padding="md">
            <CardHeader>
              <CardTitle subtitle="آخرین درخواست‌های ثبت">
                در انتظار تایید
              </CardTitle>
              {stats.pending_stores > 0 && (
                <Badge variant="warning" size="sm">
                  {stats.pending_stores} مورد
                </Badge>
              )}
            </CardHeader>

            {pending.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircleIcon className="h-10 w-10 text-green-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  همه فروشگاه‌ها بررسی شده‌اند
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pending.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-3 rounded-xl
                                bg-amber-50 border border-amber-100"
                  >
                    <div className="h-9 w-9 rounded-xl bg-amber-100
                                     flex items-center justify-center flex-shrink-0">
                      <BuildingStorefrontIcon className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {s.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {s.union_name} · {s.owner_name}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {toJalali(s.created_at)}
                    </span>
                  </div>
                ))}

                {stats.pending_stores > 5 && (
                  <Link href="/chamber/stores/pending">
                    <button className="w-full py-2.5 text-sm font-semibold
                                       text-primary-600 hover:text-primary-800
                                       transition-colors text-center">
                      مشاهده همه ({stats.pending_stores} مورد) →
                    </button>
                  </Link>
                )}
              </div>
            )}
          </Card>

          {/* Quick links */}
          <Card padding="md">
            <p className="text-sm font-bold text-slate-700 mb-3">دسترسی سریع</p>
            <div className="space-y-1.5">
              {[
                {
                  label: "فروشگاه‌های در انتظار",
                  href: "/chamber/stores/pending",
                  icon: ClockIcon,
                  color: "text-amber-600 bg-amber-50",
                  count: stats.pending_stores,
                },
                {
                  label: "همه فروشگاه‌ها",
                  href: "/chamber/stores",
                  icon: BuildingStorefrontIcon,
                  color: "text-primary-600 bg-primary-50",
                  count: null,
                },
                {
                  label: "اتحادیه‌های شهر",
                  href: "/chamber/unions",
                  icon: ShieldCheckIcon,
                  color: "text-indigo-600 bg-indigo-50",
                  count: stats.unions_count,
                },
                {
                  label: "شکایات",
                  href: "/chamber/complaints",
                  icon: ClipboardDocumentListIcon,
                  color: "text-red-600 bg-red-50",
                  count: stats.open_complaints,
                },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl
                                   hover:bg-slate-50 transition-colors group cursor-pointer">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      item.color,
                    )}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700
                                      group-hover:text-primary-700 transition-colors">
                      {item.label}
                    </span>
                    {item.count !== null && item.count > 0 && (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100
                                        px-2 py-0.5 rounded-full">
                        {item.count}
                      </span>
                    )}
                    <ArrowRightIcon className="h-3.5 w-3.5 text-slate-300
                                                group-hover:text-primary-400
                                                rotate-180 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}