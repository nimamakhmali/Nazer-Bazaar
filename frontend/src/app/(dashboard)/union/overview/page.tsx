"use client";

import React, { useState, useEffect } from "react";
import {
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }       from "@/components/layout/PageHeader";
import { StatCard }         from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }            from "@/components/ui/Badge";
import { Button }           from "@/components/ui/Button";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import { Alert }            from "@/components/ui/Alert";
import apiClient            from "@/services/api.client";
import { ENDPOINTS }        from "@/services/endpoints";
import { extractArray }     from "@/utils/error.utils";
import { formatPrice }      from "@/utils/number.utils";
import { toJalali }         from "@/utils/date.utils";
import { getTodayJalali }   from "@/utils/date.utils";
import Link                 from "next/link";
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
interface OverviewStats {
  stores_count:      number;
  active_stores:     number;
  prices_today:      number;
  total_products:    number;
  overpriced_count:  number;
  complaints_open:   number;
}

interface OverpricedStore {
  id:               number;
  store_name:       string;
  product_name:     string;
  official_price:   number;
  store_price:      number;
  violation_amount: number;
  price_date:       string;
}

interface RecentComplaint {
  uuid:           string;
  title:          string;
  store_name:     string;
  status:         string;
  status_display: string;
  created_at:     string;
}

// mock chart (replaced with real data when history endpoint provides it)
const MOCK_CHART = [
  { date: "شنبه",     official: 52000, store_avg: 51200 },
  { date: "یکشنبه",   official: 52000, store_avg: 52800 },
  { date: "دوشنبه",   official: 54000, store_avg: 53500 },
  { date: "سه‌شنبه",  official: 54000, store_avg: 55200 },
  { date: "چهارشنبه", official: 55000, store_avg: 54800 },
  { date: "پنجشنبه",  official: 55000, store_avg: 55100 },
  { date: "جمعه",     official: 56000, store_avg: 55700 },
];

const STATUS_VARIANT: Record<string, "success"|"danger"|"warning"|"info"|"default"> = {
  submitted:  "info",
  reviewing:  "warning",
  referred:   "warning",
  inspecting: "warning",
  confirmed:  "success",
  rejected:   "danger",
  closed:     "default",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function UnionOverviewPage() {
  const [stats,       setStats]       = useState<OverviewStats | null>(null);
  const [overpriced,  setOverpriced]  = useState<OverpricedStore[]>([]);
  const [complaints,  setComplaints]  = useState<RecentComplaint[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [storesRes, overpricedRes, complaintsRes] = await Promise.allSettled([
          apiClient.get(ENDPOINTS.STORES.LIST,     { params: { page_size: 1 } }),
          apiClient.get(ENDPOINTS.PRICING.OVERPRICED, { params: { page_size: 5 } }),
          apiClient.get(ENDPOINTS.COMPLAINTS.MY,   { params: { page_size: 5 } }),
        ]);

        const storeCount =
          storesRes.status === "fulfilled"
            ? (storesRes.value.data?.data?.count ?? storesRes.value.data?.count ?? 0)
            : 0;

        setStats({
          stores_count:     storeCount,
          active_stores:    storeCount,
          prices_today:     0,
          total_products:   0,
          overpriced_count: 0,
          complaints_open:  0,
        });

        if (overpricedRes.status === "fulfilled") {
          const d = overpricedRes.value.data?.data ?? overpricedRes.value.data;
          setOverpriced(extractArray<OverpricedStore>(d).slice(0, 5));
        }

        if (complaintsRes.status === "fulfilled") {
          const d = complaintsRes.value.data?.data ?? complaintsRes.value.data;
          setComplaints(extractArray<RecentComplaint>(d).slice(0, 5));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const unpriced = stats
    ? Math.max(0, (stats.total_products || 0) - (stats.prices_today || 0))
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="نمای کلی اتحادیه"
        subtitle={`امروز — ${getTodayJalali()}`}
        breadcrumbs={[{ label: "اتحادیه" }, { label: "نمای کلی" }]}
        actions={
          <Link href="/union/pricing/official">
            <Button leftIcon={<CurrencyDollarIcon className="h-4 w-4" />}>
              ثبت قیمت امروز
            </Button>
          </Link>
        }
      />

      {/* Alert: unpriced products */}
      {!loading && unpriced > 0 && (
        <Alert
          variant="warning"
          title="محصولات بدون قیمت"
          message={`${unpriced} محصول امروز قیمت‌گذاری نشده است. لطفاً قیمت‌های امروز را ثبت کنید.`}
          icon
        />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard
              title="فروشگاه‌های فعال"
              value={(stats?.active_stores ?? 0).toLocaleString("fa-IR")}
              variant="primary"
              icon={<BuildingStorefrontIcon />}
            />
            <StatCard
              title="قیمت‌های امروز"
              value={(stats?.prices_today ?? 0).toLocaleString("fa-IR")}
              variant="success"
              icon={<CurrencyDollarIcon />}
            />
            <StatCard
              title="گران‌فروشان"
              value={(stats?.overpriced_count ?? 0).toLocaleString("fa-IR")}
              variant="danger"
              icon={<ExclamationTriangleIcon />}
            />
            <StatCard
              title="شکایات باز"
              value={(stats?.complaints_open ?? 0).toLocaleString("fa-IR")}
              variant="warning"
              icon={<ClipboardDocumentListIcon />}
            />
          </>
        )}
      </div>

      {/* Chart + Quick links */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Price chart */}
        <Card className="xl:col-span-2" padding="md">
          <CardHeader>
            <CardTitle subtitle="مقایسه قیمت مصوب و میانگین فروشگاه‌ها">
              نمودار قیمت — ۷ روز گذشته
            </CardTitle>
            <Badge variant="info" size="sm">هفته جاری</Badge>
          </CardHeader>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_CHART} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    formatPrice(v) + " ریال",
                    name === "official" ? "قیمت مصوب" : "میانگین فروشگاه",
                  ]}
                  contentStyle={{
                    fontFamily: "Vazirmatn", borderRadius: "12px",
                    border: "1px solid #e2e8f0", fontSize: "12px",
                  }}
                />
                <Legend
                  formatter={(v) => v === "official" ? "قیمت مصوب" : "میانگین فروشگاه"}
                  wrapperStyle={{ fontSize: "12px", fontFamily: "Vazirmatn" }}
                />
                <Line
                  type="monotone" dataKey="official"
                  stroke="#1B3A6B" strokeWidth={2.5}
                  dot={{ fill: "#1B3A6B", r: 4 }} activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone" dataKey="store_avg"
                  stroke="#C49A2E" strokeWidth={2.5} strokeDasharray="5 3"
                  dot={{ fill: "#C49A2E", r: 4 }} activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick links */}
        <Card padding="md">
          <CardHeader>
            <CardTitle subtitle="دسترسی سریع">اقدامات</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {[
              {
                href: "/union/pricing/official",
                label: "ثبت قیمت مصوب",
                desc: "ثبت قیمت‌های روزانه",
                bg: "bg-primary-50", text: "text-primary-600",
                icon: CurrencyDollarIcon,
              },
              {
                href: "/union/pricing",
                label: "مدیریت قیمت‌ها",
                desc: "مشاهده و ویرایش قیمت‌های مصوب",
                bg: "bg-green-50", text: "text-green-600",
                icon: CheckCircleIcon,
              },
              {
                href: "/union/pricing/history",
                label: "تاریخچه قیمت",
                desc: "سوابق تغییرات قیمت",
                bg: "bg-slate-50", text: "text-slate-500",
                icon: ClockIcon,
              },
              {
                href: "/union/stores",
                label: "فروشگاه‌های عضو",
                desc: "وضعیت قیمت‌گذاری فروشگاه‌ها",
                bg: "bg-orange-50", text: "text-orange-600",
                icon: BuildingStorefrontIcon,
              },
              {
                href: "/union/complaints",
                label: "شکایات",
                desc: "بررسی شکایات اتحادیه",
                bg: "bg-red-50", text: "text-red-600",
                icon: ClipboardDocumentListIcon,
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-xl hover:shadow-sm
                           border border-transparent hover:border-slate-100
                           transition-all group"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center
                                 justify-center flex-shrink-0 ${item.bg}`}>
                  <item.icon className={`h-4 w-4 ${item.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800
                                group-hover:text-primary-700 transition-colors">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{item.desc}</p>
                </div>
                <ArrowTrendingUpIcon className="h-4 w-4 text-slate-300
                                                group-hover:text-primary-400
                                                transition-colors flex-shrink-0 rotate-90" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Overpriced stores */}
      {overpriced.length > 0 && (
        <Card padding="none">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <CardTitle subtitle="فروشگاه‌هایی که امروز گران‌فروشی کرده‌اند">
              گران‌فروشان امروز
            </CardTitle>
            <Link href="/union/stores">
              <Button variant="ghost" size="sm">مشاهده همه</Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#fef2f2", borderBottom: "1px solid #fee2e2" }}>
                  {["فروشگاه", "محصول", "قیمت مصوب", "قیمت فروشگاه", "مبلغ تخلف"].map((h) => (
                    <th key={h} className="px-5 py-3 text-right text-xs font-bold
                                           text-red-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overpriced.map((item) => (
                  <tr key={item.id}
                      className="border-b border-slate-50 hover:bg-red-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center
                                        justify-center flex-shrink-0">
                          <BuildingStorefrontIcon className="h-4 w-4 text-red-500" />
                        </div>
                        <span className="font-semibold text-slate-800">{item.store_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{item.product_name}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {formatPrice(item.official_price)} ریال
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-red-600">
                      {formatPrice(item.store_price)} ریال
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5
                                       bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                        +{formatPrice(item.violation_amount)} ریال
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recent complaints */}
      {complaints.length > 0 && (
        <Card padding="none">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <CardTitle subtitle="جدیدترین شکایات اتحادیه">
              آخرین شکایات
            </CardTitle>
            <Link href="/union/complaints">
              <Button variant="ghost" size="sm">مشاهده همه</Button>
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {complaints.map((c) => (
              <div key={c.uuid}
                   className="flex items-center gap-4 px-6 py-3.5
                              hover:bg-slate-50/70 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center
                                justify-center flex-shrink-0">
                  <ClipboardDocumentListIcon className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{c.title}</p>
                  <p className="text-xs text-slate-400 truncate">{c.store_name}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge variant={STATUS_VARIANT[c.status] ?? "default"} size="sm">
                    {c.status_display}
                  </Badge>
                  <span className="text-xs text-slate-400 hidden sm:block">
                    {toJalali(c.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}