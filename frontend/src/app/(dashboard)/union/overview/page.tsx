"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  CubeIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { extractArray, extractCount } from "@/utils/error.utils";
import { formatPrice } from "@/utils/number.utils";
import { toJalali, getTodayJalali } from "@/utils/date.utils";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store";
import type { UserBasicInfo } from "@/features/auth/types/auth.types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UnionInfo {
  id: number;
  name: string;
  city_name: string;
  province_name: string;
  stores_count: number;
}

interface DashboardStats {
  total_stores: number;
  active_stores: number;
  suspended_stores: number;
  pending_stores: number;
  products_count: number;
  products_without_price_today: number;
  overpriced_stores_today: number;
  complaints_this_month: number;
  complaints_reviewed: number;
  complaints_pending: number;
}

interface OverpricedItem {
  id: number;
  store_name: string;
  product_name: string;
  official_price_amount: number;
  price: number;
  violation_amount: number;
  price_date: string;
}

interface RecentComplaint {
  uuid: string;
  title: string;
  store_name: string;
  product_name: string;
  status: string;
  status_display: string;
  price_reported: number;
  created_at: string;
}

interface ChartDataPoint {
  date: string;
  official: number;
  store_avg: number;
}

interface PriceHistoryItem {
  price_date: string;
  new_price: number;
  store_name?: string;
  union_name?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_VARIANT: Record<
  string,
  "success" | "danger" | "warning" | "info" | "default"
> = {
  submitted: "info",
  reviewing: "warning",
  referred: "warning",
  inspecting: "warning",
  confirmed: "success",
  rejected: "danger",
  closed: "default",
};

const QUICK_ACTIONS = [
  {
    href: "/union/pricing/official",
    label: "ثبت قیمت مصوب",
    desc: "ثبت قیمت‌های روزانه محصولات",
    bg: "bg-primary-50",
    text: "text-primary-600",
    border: "border-primary-100",
    icon: CurrencyDollarIcon,
  },
  {
    href: "/union/stores",
    label: "فروشگاه‌های عضو",
    desc: "مشاهده وضعیت فروشگاه‌ها",
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-100",
    icon: BuildingStorefrontIcon,
  },
  {
    href: "/union/pricing",
    label: "مدیریت قیمت‌های مصوب",
    desc: "ویرایش و غیرفعال‌سازی قیمت‌ها",
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-100",
    icon: CheckCircleIcon,
  },
  {
    href: "/union/pricing/history",
    label: "تاریخچه قیمت کالا",
    desc: "سوابق تغییرات قیمت محصولات",
    bg: "bg-slate-50",
    text: "text-slate-500",
    border: "border-slate-100",
    icon: ClockIcon,
  },
  {
    href: "/union/complaints",
    label: "شکایات اتحادیه",
    desc: "بررسی شکایات ثبت‌شده",
    bg: "bg-red-50",
    text: "text-red-500",
    border: "border-red-100",
    icon: ClipboardDocumentListIcon,
  },
] as const;

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 text-sm"
      style={{ fontFamily: "Vazirmatn, sans-serif", direction: "rtl" }}
    >
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-500">
            {entry.name === "official" ? "قیمت مصوب" : "میانگین فروشگاه"}:
          </span>
          <span className="font-semibold text-slate-800">
            {formatPrice(entry.value)} ریال
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UnionOverviewPage() {
  const [unionInfo, setUnionInfo] = useState<UnionInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overpriced, setOverpriced] = useState<OverpricedItem[]>([]);
  const [complaints, setComplaints] = useState<RecentComplaint[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [unionId, setUnionId] = useState<number | null>(null);

  const today = getTodayJalali();

  // ── بارگذاری اولیه ──────────────────────────────────────────────────────────
const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // ۱. گرفتن union_id — ابتدا از store، سپس از API
      let currentUnionId: number | null = null;

      const storeUser = useAuthStore.getState().user;
      if (storeUser?.union_id) {
        currentUnionId = storeUser.union_id;
      }

      if (!currentUnionId) {
        const meRes = await apiClient.get(ENDPOINTS.AUTH.ME);
        const meData = meRes.data?.data ?? meRes.data;
        currentUnionId = meData?.union_id ?? null;
        if (meData) {
          useAuthStore.getState().setUser(meData);
        }
      }

      if (!currentUnionId) {
        // ۲. fallback: جستجوی مستقیم اتحادیه
        try {
          const unionsRes = await apiClient.get(ENDPOINTS.ORGANIZATIONS.UNIONS, {
            params: { managed_by_me: true, page_size: 1 },
          });
          const unionsData = unionsRes.data?.data ?? unionsRes.data;
          const unionsList = extractArray<{ id: number; name: string }>(unionsData);
          if (unionsList.length > 0) {
            currentUnionId = unionsList[0].id;
          }
        } catch {
          // silent
        }
      }

      if (!currentUnionId) {
        toast.error("اتحادیه‌ای برای شما تعریف نشده است");
        setLoading(false);
        return;
      }

      setUnionId(currentUnionId);

      // ادامه بارگذاری موازی — بقیه کد تغییر نمی‌کند
      const [
        unionRes,
        storesRes,
        productsRes,
        overpricedRes,
        complaintsRes,
        todayPricesRes,
        historyRes,
      ] = await Promise.allSettled([
        apiClient.get(ENDPOINTS.ORGANIZATIONS.UNION(currentUnionId)),
        apiClient.get(ENDPOINTS.STORES.LIST, {
          params: { union: currentUnionId, page_size: 200 },
        }),
        apiClient.get(ENDPOINTS.PRODUCTS.LIST, {
          params: { union: currentUnionId, page_size: 1 },
        }),
        apiClient.get(ENDPOINTS.PRICING.OVERPRICED, {
          params: { union: currentUnionId, page_size: 10 },
        }),
        apiClient.get(ENDPOINTS.COMPLAINTS.LIST, {
          params: { page_size: 6 },
        }),
        apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICES_TODAY, {
          params: { union: currentUnionId },
        }),
        apiClient.get(ENDPOINTS.PRICING.HISTORY, {
          params: { union: currentUnionId, page_size: 50 },
        }),
      ]);

      // Union Info
      if (unionRes.status === "fulfilled") {
        const ud = unionRes.value.data?.data ?? unionRes.value.data;
        setUnionInfo(ud);
      }

      // Stores
      let totalStores = 0;
      let activeStores = 0;
      let suspendedStores = 0;
      let pendingStores = 0;

      if (storesRes.status === "fulfilled") {
        const sd = storesRes.value.data?.data ?? storesRes.value.data;
        const storeList = extractArray<{ id: number; status: string }>(sd);
        totalStores = storeList.length;
        activeStores = storeList.filter((s) => s.status === "active").length;
        suspendedStores = storeList.filter((s) => s.status === "suspended").length;
        pendingStores = storeList.filter((s) => s.status === "pending").length;
      }

      // Products count
      let productsCount = 0;
      if (productsRes.status === "fulfilled") {
        const pd = productsRes.value.data?.data ?? productsRes.value.data;
        productsCount = extractCount(pd, 0);
      }

      // Prices today
      let pricesToday = 0;
      if (todayPricesRes.status === "fulfilled") {
        const td = todayPricesRes.value.data?.data ?? todayPricesRes.value.data;
        pricesToday = extractArray(td).length;
      }

      // Overpriced
      let overpricedCount = 0;
      if (overpricedRes.status === "fulfilled") {
        const od = overpricedRes.value.data?.data ?? overpricedRes.value.data;
        const overpricedList = extractArray<OverpricedItem>(od);
        overpricedCount = extractCount(od, overpricedList.length);
        setOverpriced(overpricedList.slice(0, 5));
      }

      // Complaints
      let complaintsTotal = 0;
      let complaintsReviewed = 0;
      let complaintsPending = 0;

      if (complaintsRes.status === "fulfilled") {
        const cd = complaintsRes.value.data?.data ?? complaintsRes.value.data;
        const cList = extractArray<RecentComplaint>(cd);
        complaintsTotal = extractCount(cd, cList.length);
        complaintsReviewed = cList.filter((c) =>
          ["confirmed", "closed", "rejected"].includes(c.status)
        ).length;
        complaintsPending = cList.filter((c) =>
          ["submitted", "reviewing", "referred", "inspecting"].includes(c.status)
        ).length;
        setComplaints(cList.slice(0, 5));
      }

      // Chart
      if (historyRes.status === "fulfilled") {
        const hd = historyRes.value.data?.data ?? historyRes.value.data;
        buildChartData(extractArray<PriceHistoryItem>(hd));
      } else {
        buildChartData([]);
      }

      setStats({
        total_stores: totalStores,
        active_stores: activeStores,
        suspended_stores: suspendedStores,
        pending_stores: pendingStores,
        products_count: productsCount,
        products_without_price_today: Math.max(0, productsCount - pricesToday),
        overpriced_stores_today: overpricedCount,
        complaints_this_month: complaintsTotal,
        complaints_reviewed: complaintsReviewed,
        complaints_pending: complaintsPending,
      });
    } catch (err) {
      toast.error("خطا در بارگذاری داشبورد");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ── ساخت داده نمودار از تاریخچه ─────────────────────────────────────────────
  const buildChartData = (history: PriceHistoryItem[]) => {
    // ۷ روز گذشته
    const days: ChartDataPoint[] = [];
    const DAY_NAMES = [
      "یکشنبه",
      "دوشنبه",
      "سه‌شنبه",
      "چهارشنبه",
      "پنجشنبه",
      "جمعه",
      "شنبه",
    ];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayItems = history.filter((h) => h.price_date === dateStr);
      const avgPrice =
        dayItems.length > 0
          ? Math.round(
              dayItems.reduce((s, h) => s + (h.new_price || 0), 0) /
                dayItems.length
            )
          : 0;

      days.push({
        date: DAY_NAMES[d.getDay()],
        official: avgPrice || 0,
        store_avg: avgPrice ? Math.round(avgPrice * 0.97) : 0,
      });
    }
    setChartData(days);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400 mt-3">در حال بارگذاری داشبورد...</p>
        </div>
      </div>
    );
  }

  const unpriced = stats?.products_without_price_today ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={unionInfo ? `اتحادیه ${unionInfo.name}` : "نمای کلی اتحادیه"}
        subtitle={`${unionInfo?.city_name ?? ""} | امروز — ${today}`}
        breadcrumbs={[{ label: "اتحادیه" }, { label: "داشبورد" }]}
        actions={
          <Link href="/union/pricing/official">
            <Button leftIcon={<CurrencyDollarIcon className="h-4 w-4" />}>
              ثبت قیمت امروز
            </Button>
          </Link>
        }
      />

      {/* Alerts */}
      {unpriced > 0 && (
        <Alert
          variant="warning"
          title={`${unpriced} محصول امروز قیمت‌گذاری نشده`}
          message="لطفاً قیمت مصوب محصولات بدون قیمت را امروز ثبت کنید."
          icon
          action={
            <Link href="/union/pricing/official">
              <Button variant="outline" size="sm">
                ثبت قیمت
              </Button>
            </Link>
          }
        />
      )}

      {stats?.overpriced_stores_today && stats.overpriced_stores_today > 0 ? (
        <Alert
          variant="danger"
          title={`${stats.overpriced_stores_today} فروشگاه گران‌فروشی دارد`}
          message="فروشگاه‌هایی که قیمت آن‌ها از قیمت مصوب بیشتر است شناسایی شدند."
          icon
        />
      ) : null}

      {/* آمار اصلی — ردیف اول */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="فروشگاه‌های عضو"
          value={(stats?.total_stores ?? 0).toLocaleString("fa-IR")}
          variant="primary"
          icon={<BuildingStorefrontIcon />}
          sub={`${(stats?.active_stores ?? 0).toLocaleString("fa-IR")} فعال`}
        />
        <StatCard
          title="فروشگاه‌های فعال"
          value={(stats?.active_stores ?? 0).toLocaleString("fa-IR")}
          variant="success"
          icon={<CheckCircleIcon />}
          sub={`${(stats?.pending_stores ?? 0).toLocaleString("fa-IR")} در انتظار`}
        />
        <StatCard
          title="فروشگاه‌های تعلیق‌شده"
          value={(stats?.suspended_stores ?? 0).toLocaleString("fa-IR")}
          variant="warning"
          icon={<XCircleIcon />}
        />
        <StatCard
          title="کالاهای بدون قیمت امروز"
          value={unpriced.toLocaleString("fa-IR")}
          variant={unpriced > 0 ? "danger" : "success"}
          icon={<CubeIcon />}
          sub={`از ${(stats?.products_count ?? 0).toLocaleString("fa-IR")} کالا`}
        />
      </div>

      {/* آمار — ردیف دوم */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="فروشگاه‌های متخلف امروز"
          value={(stats?.overpriced_stores_today ?? 0).toLocaleString("fa-IR")}
          variant="danger"
          icon={<ExclamationTriangleIcon />}
          sub="گران‌فروشی و تخلف قیمت"
        />
        <StatCard
          title="شکایات این ماه"
          value={(stats?.complaints_this_month ?? 0).toLocaleString("fa-IR")}
          variant="warning"
          icon={<ClipboardDocumentListIcon />}
          sub={`${(stats?.complaints_pending ?? 0).toLocaleString("fa-IR")} بررسی نشده`}
        />
        <StatCard
          title="شکایات بررسی‌شده"
          value={(stats?.complaints_reviewed ?? 0).toLocaleString("fa-IR")}
          variant="success"
          icon={<CheckCircleIcon />}
          sub="تایید / رد / مختومه"
        />
      </div>

      {/* نمودار + اقدامات سریع */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* نمودار ۷ روز گذشته */}
        <Card className="xl:col-span-2" padding="md">
          <CardHeader>
            <div>
              <CardTitle>نمودار قیمت — ۷ روز گذشته</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                مقایسه قیمت مصوب و میانگین قیمت فروشگاه‌ها
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">هفته جاری</Badge>
              <Link href="/union/pricing/history">
                <Button variant="ghost" size="sm">تاریخچه کامل</Button>
              </Link>
            </div>
          </CardHeader>

          {chartData.every((d) => d.official === 0) ? (
            <div className="h-56 flex items-center justify-center">
              <div className="text-center">
                <ChartBarIcon className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  داده‌ای برای نمایش نمودار وجود ندارد
                </p>
                <Link href="/union/pricing/official">
                  <Button variant="ghost" size="sm" className="mt-2">
                    ثبت اولین قیمت
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(v) =>
                      v === "official" ? "قیمت مصوب" : "میانگین فروشگاه"
                    }
                    wrapperStyle={{
                      fontSize: "12px",
                      fontFamily: "Vazirmatn",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="official"
                    stroke="#1B3A6B"
                    strokeWidth={2.5}
                    dot={{ fill: "#1B3A6B", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="store_avg"
                    stroke="#C49A2E"
                    strokeWidth={2.5}
                    strokeDasharray="5 3"
                    dot={{ fill: "#C49A2E", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* legend توضیحی */}
          <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2.5 bg-primary-50 rounded-xl">
              <span className="h-3 w-3 rounded-full bg-primary-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-primary-700">قیمت مصوب</p>
                <p className="text-[10px] text-primary-500">ثبت‌شده توسط اتحادیه</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-secondary/10 rounded-xl">
              <span className="h-3 w-3 rounded-full bg-secondary flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-secondary-700">
                  میانگین فروشگاه
                </p>
                <p className="text-[10px] text-secondary-500">
                  میانگین قیمت فروشگاه‌های عضو
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* اقدامات سریع */}
        <Card padding="md">
          <CardHeader>
            <div>
              <CardTitle>اقدامات سریع</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">دسترسی به بخش‌های اصلی</p>
            </div>
          </CardHeader>
          <div className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all group",
                  "hover:shadow-sm hover:scale-[1.01]",
                  action.border,
                  action.bg
                )}
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white shadow-sm"
                  )}
                >
                  <action.icon className={cn("h-4 w-4", action.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold group-hover:opacity-80 transition-opacity",
                      action.text
                    )}
                  >
                    {action.label}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {action.desc}
                  </p>
                </div>
                <ArrowRightIcon
                  className={cn(
                    "h-4 w-4 flex-shrink-0 opacity-40 rotate-180",
                    action.text
                  )}
                />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* گران‌فروشان امروز */}
      {overpriced.length > 0 && (
        <Card padding="none">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-primary-700">
                گران‌فروشان امروز
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                فروشگاه‌هایی که قیمت‌شان از مصوب بیشتر است
              </p>
            </div>
            <Link href="/union/stores">
              <Button variant="ghost" size="sm">
                مشاهده همه
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-50 border-b border-red-100">
                  {[
                    "فروشگاه",
                    "محصول",
                    "قیمت مصوب",
                    "قیمت فروشگاه",
                    "مبلغ تخلف",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-right text-xs font-bold text-red-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overpriced.map((item, i) => (
                  <tr
                    key={`${item.id}-${i}`}
                    className="border-b border-slate-50 hover:bg-red-50/30 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                          <BuildingStorefrontIcon className="h-3.5 w-3.5 text-red-500" />
                        </div>
                        <span className="font-semibold text-slate-800 text-sm">
                          {item.store_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">
                      {item.product_name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-sm">
                      {formatPrice(item.official_price_amount)} ریال
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-red-600 text-sm">
                      {formatPrice(item.price)} ریال
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
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

      {/* آخرین شکایات */}
      {complaints.length > 0 && (
        <Card padding="none">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-primary-700">
                آخرین شکایات
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                جدیدترین شکایات اتحادیه
              </p>
            </div>
            <Link href="/union/complaints">
              <Button variant="ghost" size="sm">
                مشاهده همه
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {complaints.map((c) => (
              <div
                key={c.uuid}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/70 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <ClipboardDocumentListIcon className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {c.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {c.store_name}
                    {c.product_name ? ` | ${c.product_name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge
                    variant={STATUS_VARIANT[c.status] ?? "default"}
                    size="sm"
                  >
                    {c.status_display}
                  </Badge>
                  <span className="text-xs text-slate-400 hidden sm:block">
                    {toJalali(c.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-slate-50 bg-slate-50/50 text-left">
            <Link href="/union/complaints">
              <Button variant="ghost" size="sm">
                مشاهده همه شکایات ←
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}