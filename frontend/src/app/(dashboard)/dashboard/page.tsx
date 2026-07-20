"use client";

import { useEffect, useState } from "react";
import {
  BuildingStorefrontIcon, ShieldCheckIcon,
  ClipboardDocumentListIcon, CurrencyDollarIcon,
  ExclamationTriangleIcon, UserGroupIcon,
  ArrowTrendingUpIcon, ClockIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "@/store";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import { ROLE_DASHBOARD_MAP, ROLE_LABELS } from "@/constants/roles";
import { toJalaliWithTime, getTodayJalali } from "@/utils/date.utils";
import { formatPrice } from "@/utils/number.utils";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { extractArray } from "@/utils/error.utils";
import type { Role } from "@/types/common.types";
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface DashboardStats {
  stores_count?:        number;
  active_stores?:       number;
  unions_count?:        number;
  complaints_open?:     number;
  complaints_today?:    number;
  prices_today?:        number;
  users_count?:         number;
  overpriced_count?:    number;
  pending_stores?:      number;
}

interface RecentComplaint {
  uuid:           string;
  title:          string;
  store_name:     string;
  status:         string;
  status_display: string;
  created_at:     string;
}

interface PriceChartPoint {
  date:         string;
  official:     number;
  store_avg:    number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Role-based welcome messages
// ─────────────────────────────────────────────────────────────────────────────
const WELCOME: Record<Role, string> = {
  admin:            "خوش آمدید، ادمین کل. نمای کلی سامانه را مشاهده می‌کنید.",
  province_manager: "خوش آمدید. وضعیت استان زیر نظر شما نمایش داده شده است.",
  chamber_manager:  "خوش آمدید. آمار اتاق اصناف شهر شما اینجاست.",
  union_manager:    "خوش آمدید. وضعیت اتحادیه و قیمت‌گذاری امروز را ببینید.",
  store_owner:      "خوش آمدید. وضعیت فروشگاه‌های شما نمایش داده شده است.",
  inspector:        "خوش آمدید. شکایات محوله و فروشگاه‌های متخلف اینجاست.",
  customer:         "خوش آمدید. آمار شکایات شما نمایش داده شده است.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Complaint Status Badge
// ─────────────────────────────────────────────────────────────────────────────
const COMPLAINT_VARIANT: Record<string,
  "success"|"danger"|"warning"|"info"|"default"
> = {
  submitted:  "info",
  reviewing:  "warning",
  referred:   "warning",
  inspecting: "warning",
  confirmed:  "success",
  rejected:   "danger",
  closed:     "default",
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock chart data (replaced with real API when available)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_CHART: PriceChartPoint[] = [
  { date: "شنبه",     official: 45000, store_avg: 44200 },
  { date: "یکشنبه",   official: 45000, store_avg: 44800 },
  { date: "دوشنبه",   official: 46000, store_avg: 45500 },
  { date: "سه‌شنبه",  official: 46000, store_avg: 47200 },
  { date: "چهارشنبه", official: 47000, store_avg: 46800 },
  { date: "پنجشنبه",  official: 47000, store_avg: 47100 },
  { date: "جمعه",     official: 48000, store_avg: 47500 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user }                          = useAuthStore();
  const role                              = user?.role as Role | undefined;
  const [stats,      setStats]            = useState<DashboardStats>({});
  const [complaints, setComplaints]       = useState<RecentComplaint[]>([]);
  const [loadingStats, setLoadingStats]   = useState(true);

  // ── fetch quick stats ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [storesRes, complaintsRes] = await Promise.allSettled([
          apiClient.get(ENDPOINTS.STORES.LIST,    { params: { page_size: 1 } }),
          apiClient.get(ENDPOINTS.COMPLAINTS.MY,  { params: { page_size: 5 } }),
        ]);

        if (storesRes.status === "fulfilled") {
          const d = storesRes.value.data?.data ?? storesRes.value.data;
          setStats((prev) => ({
            ...prev,
            active_stores:  typeof d?.count === "number" ? d.count : 0,
          }));
        }

        if (complaintsRes.status === "fulfilled") {
          const d = complaintsRes.value.data?.data ?? complaintsRes.value.data;
          setComplaints(extractArray<RecentComplaint>(d).slice(0, 5));
        }
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // ── stat cards per role ────────────────────────────────────────────────────
  const statCards = getStatCards(role, stats);

  // ── greeting ──────────────────────────────────────────────────────────────
  const greeting = getGreeting();

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <span className="text-xl">{greeting.emoji}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-700">
                {greeting.text}، {user?.first_name || user?.full_name || "کاربر"}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {role ? WELCOME[role] : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="text-left flex-shrink-0">
          <p className="text-sm font-semibold text-primary-600">{getTodayJalali()}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {role ? ROLE_LABELS[role] : ""}
          </p>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingStats
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
          : statCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Price Chart ── */}
        <Card className="xl:col-span-2" padding="md">
          <CardHeader>
            <CardTitle subtitle="میانگین قیمت فروشگاه‌ها در مقابل قیمت مصوب">
              نمودار قیمت‌ها — ۷ روز گذشته
            </CardTitle>
            <Badge variant="info" size="sm">هفته جاری</Badge>
          </CardHeader>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={MOCK_CHART}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
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
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatPrice(value) + " ریال",
                    name === "official" ? "قیمت مصوب" : "میانگین فروشگاه",
                  ]}
                  labelStyle={{ fontFamily: "Vazirmatn" }}
                  contentStyle={{
                    fontFamily: "Vazirmatn",
                    borderRadius: "12px",
                    border:      "1px solid #e2e8f0",
                    fontSize:    "12px",
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === "official" ? "قیمت مصوب" : "میانگین فروشگاه"
                  }
                  wrapperStyle={{ fontSize: "12px", fontFamily: "Vazirmatn" }}
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
        </Card>

        {/* ── Quick Actions ── */}
        <Card padding="md">
          <CardHeader>
            <CardTitle subtitle="دسترسی سریع به امکانات">
              اقدام سریع
            </CardTitle>
          </CardHeader>
          <QuickActions role={role} />
        </Card>
      </div>

      {/* ── Recent Complaints ── */}
      {complaints.length > 0 && (
        <Card padding="none">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-primary-700">
                  آخرین شکایات
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  جدیدترین شکایات ثبت‌شده
                </p>
              </div>
              <Badge variant="warning" size="sm">
                {complaints.length} مورد
              </Badge>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {complaints.map((c) => (
              <div
                key={c.uuid}
                className="flex items-center gap-4 px-6 py-3.5
                           hover:bg-slate-50/70 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center
                                justify-center flex-shrink-0">
                  <ClipboardDocumentListIcon className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {c.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {c.store_name}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge
                    variant={COMPLAINT_VARIANT[c.status] ?? "default"}
                    size="sm"
                  >
                    {c.status_display}
                  </Badge>
                  <span className="text-xs text-slate-400 hidden sm:block">
                    {toJalaliWithTime(c.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── System Info ── */}
      <SystemInfoBanner role={role} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "صبح بخیر",   emoji: "🌅" };
  if (h < 17) return { text: "روز بخیر",   emoji: "☀️" };
  if (h < 21) return { text: "عصر بخیر",   emoji: "🌇" };
  return           { text: "شب بخیر",      emoji: "🌙" };
}

function getStatCards(
  role:  Role | undefined,
  stats: DashboardStats
): React.ComponentProps<typeof StatCard>[] {
  switch (role) {
    case "admin":
      return [
        {
          title:   "کاربران سیستم",
          value:   (stats.users_count ?? 0).toLocaleString("fa-IR"),
          variant: "primary",
          icon:    <UserGroupIcon />,
          trend:   { value: 12, label: "این ماه" },
        },
        {
          title:   "فروشگاه‌های فعال",
          value:   (stats.active_stores ?? 0).toLocaleString("fa-IR"),
          variant: "success",
          icon:    <BuildingStorefrontIcon />,
          trend:   { value: 5, label: "این هفته" },
        },
        {
          title:   "اتحادیه‌ها",
          value:   (stats.unions_count ?? 0).toLocaleString("fa-IR"),
          variant: "secondary",
          icon:    <ShieldCheckIcon />,
        },
        {
          title:   "شکایات باز",
          value:   (stats.complaints_open ?? 0).toLocaleString("fa-IR"),
          variant: "danger",
          icon:    <ClipboardDocumentListIcon />,
          trend:   { value: -8, label: "نسبت به هفته قبل", direction: "down" },
        },
      ];

    case "union_manager":
      return [
        {
          title:   "فروشگاه‌های عضو",
          value:   (stats.active_stores ?? 0).toLocaleString("fa-IR"),
          variant: "primary",
          icon:    <BuildingStorefrontIcon />,
        },
        {
          title:   "قیمت‌های امروز",
          value:   (stats.prices_today ?? 0).toLocaleString("fa-IR"),
          variant: "success",
          icon:    <CurrencyDollarIcon />,
        },
        {
          title:   "گران‌فروشان",
          value:   (stats.overpriced_count ?? 0).toLocaleString("fa-IR"),
          variant: "danger",
          icon:    <ExclamationTriangleIcon />,
        },
        {
          title:   "شکایات این ماه",
          value:   (stats.complaints_open ?? 0).toLocaleString("fa-IR"),
          variant: "warning",
          icon:    <ClipboardDocumentListIcon />,
        },
      ];

    case "store_owner":
      return [
        {
          title:   "فروشگاه‌های من",
          value:   (stats.active_stores ?? 0).toLocaleString("fa-IR"),
          variant: "primary",
          icon:    <BuildingStorefrontIcon />,
        },
        {
          title:   "شکایات دریافتی",
          value:   (stats.complaints_open ?? 0).toLocaleString("fa-IR"),
          variant: "danger",
          icon:    <ClipboardDocumentListIcon />,
        },
        {
          title:   "قیمت‌گذاری امروز",
          value:   (stats.prices_today ?? 0).toLocaleString("fa-IR"),
          variant: "success",
          icon:    <CurrencyDollarIcon />,
        },
        {
          title:   "در انتظار تایید",
          value:   (stats.pending_stores ?? 0).toLocaleString("fa-IR"),
          variant: "warning",
          icon:    <ClockIcon />,
        },
      ];

    default:
      return [
        {
          title:   "فروشگاه‌های فعال",
          value:   (stats.active_stores ?? 0).toLocaleString("fa-IR"),
          variant: "primary",
          icon:    <BuildingStorefrontIcon />,
        },
        {
          title:   "شکایات",
          value:   (stats.complaints_open ?? 0).toLocaleString("fa-IR"),
          variant: "warning",
          icon:    <ClipboardDocumentListIcon />,
        },
        {
          title:   "قیمت‌های مصوب امروز",
          value:   (stats.prices_today ?? 0).toLocaleString("fa-IR"),
          variant: "success",
          icon:    <CurrencyDollarIcon />,
        },
        {
          title:   "اتحادیه‌ها",
          value:   (stats.unions_count ?? 0).toLocaleString("fa-IR"),
          variant: "secondary",
          icon:    <ShieldCheckIcon />,
        },
      ];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Actions (role-based)
// ─────────────────────────────────────────────────────────────────────────────
function QuickActions({ role }: { role: Role | undefined }) {
  const actions = getQuickActions(role);

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <a
          key={action.href}
          href={action.href}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-all group",
            "hover:shadow-sm border border-transparent hover:border-slate-100",
            action.color
          )}
        >
          <div className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
            action.iconBg
          )}>
            <action.icon className={cn("h-4 w-4", action.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 group-hover:text-primary-700
                          transition-colors">
              {action.label}
            </p>
            <p className="text-xs text-slate-400 truncate">{action.description}</p>
          </div>
          <ArrowTrendingUpIcon className="h-4 w-4 text-slate-300 group-hover:text-primary-400
                                          transition-colors flex-shrink-0 rotate-90" />
        </a>
      ))}
    </div>
  );
}

interface QuickAction {
  label:       string;
  description: string;
  href:        string;
  icon:        React.ComponentType<{ className?: string }>;
  color:       string;
  iconBg:      string;
  iconColor:   string;
}

function getQuickActions(role: Role | undefined): QuickAction[] {
  switch (role) {
    case "admin":
      return [
        {
          label:       "مدیریت کاربران",
          description: "افزودن و ویرایش کاربران سازمانی",
          href:        "/admin/users",
          icon:        UserGroupIcon,
          color:       "hover:bg-primary-50",
          iconBg:      "bg-primary-100",
          iconColor:   "text-primary-600",
        },
        {
          label:       "مدیریت اتحادیه‌ها",
          description: "افزودن اتحادیه جدید، تخصیص رئیس",
          href:        "/admin/unions",
          icon:        ShieldCheckIcon,
          color:       "hover:bg-secondary-50",
          iconBg:      "bg-secondary-100",
          iconColor:   "text-secondary-600",
        },
        {
          label:       "مدیریت محصولات",
          description: "افزودن و ویرایش محصولات",
          href:        "/admin/products",
          icon:        CurrencyDollarIcon,
          color:       "hover:bg-green-50",
          iconBg:      "bg-green-100",
          iconColor:   "text-green-600",
        },
      ];

    case "union_manager":
      return [
        {
          label:       "ثبت قیمت مصوب",
          description: "ثبت قیمت‌های امروز برای محصولات",
          href:        "/union/pricing/official",
          icon:        CurrencyDollarIcon,
          color:       "hover:bg-primary-50",
          iconBg:      "bg-primary-100",
          iconColor:   "text-primary-600",
        },
        {
          label:       "فروشگاه‌های متخلف",
          description: "مشاهده گران‌فروشان اتحادیه",
          href:        "/union/stores",
          icon:        ExclamationTriangleIcon,
          color:       "hover:bg-red-50",
          iconBg:      "bg-red-100",
          iconColor:   "text-red-600",
        },
        {
          label:       "شکایات",
          description: "بررسی شکایات اتحادیه",
          href:        "/union/complaints",
          icon:        ClipboardDocumentListIcon,
          color:       "hover:bg-orange-50",
          iconBg:      "bg-orange-100",
          iconColor:   "text-orange-600",
        },
      ];

    case "store_owner":
      return [
        {
          label:       "قیمت‌گذاری امروز",
          description: "ثبت قیمت محصولات فروشگاه",
          href:        "/store/pricing",
          icon:        CurrencyDollarIcon,
          color:       "hover:bg-primary-50",
          iconBg:      "bg-primary-100",
          iconColor:   "text-primary-600",
        },
        {
          label:       "مدارک فروشگاه",
          description: "آپلود و مدیریت مدارک",
          href:        "/store/my-stores",
          icon:        BuildingStorefrontIcon,
          color:       "hover:bg-secondary-50",
          iconBg:      "bg-secondary-100",
          iconColor:   "text-secondary-600",
        },
      ];

    default:
      return [
        {
          label:       "مشاهده قیمت‌ها",
          description: "قیمت‌های مصوب امروز",
          href:        "/prices",
          icon:        CurrencyDollarIcon,
          color:       "hover:bg-primary-50",
          iconBg:      "bg-primary-100",
          iconColor:   "text-primary-600",
        },
        {
          label:       "ثبت شکایت",
          description: "گزارش گران‌فروشی",
          href:        "/complaints/new",
          icon:        ClipboardDocumentListIcon,
          color:       "hover:bg-orange-50",
          iconBg:      "bg-orange-100",
          iconColor:   "text-orange-600",
        },
      ];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// System Info Banner
// ─────────────────────────────────────────────────────────────────────────────
function SystemInfoBanner({ role }: { role: Role | undefined }) {
  if (!role || role === "customer") return null;

  return (
    <div className="rounded-2xl overflow-hidden"
         style={{
           background: "linear-gradient(135deg,#1B3A6B 0%,#2E6DB4 100%)",
         }}>
      <div className="px-6 py-5 flex items-center justify-between gap-4">
        <div className="text-white">
          <p className="text-sm font-bold opacity-90">
            سامانه پایش قیمت کالا
          </p>
          <p className="text-xs opacity-60 mt-0.5">
            نسخه ۱.۰.۰ — {getTodayJalali()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-300 font-medium">سیستم آنلاین</span>
        </div>
      </div>
    </div>
  );
}