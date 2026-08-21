"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BuildingStorefrontIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  ArrowLeftIcon,
  CheckBadgeIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "@/store";
import { Card }              from "@/components/ui/Card";
import { Badge }             from "@/components/ui/Badge";
import { Button }            from "@/components/ui/Button";
import { Spinner }           from "@/components/ui/Spinner";
import { SkeletonStatCard }  from "@/components/ui/Skeleton";
import { ROLE_LABELS }       from "@/constants/roles";
import { toJalali, getTodayJalali } from "@/utils/date.utils";
import { formatPrice }       from "@/utils/number.utils";
import { extractArray, extractCount } from "@/utils/error.utils";
import apiClient             from "@/services/api.client";
import { ENDPOINTS }         from "@/services/endpoints";
import type { Role }         from "@/types/common.types";
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RecentComplaint {
  uuid:           string;
  title:          string;
  store_name:     string;
  product_name:   string;
  status:         string;
  status_display: string;
  created_at:     string;
}

interface OverpricedStore {
  id:                    number;
  store_name:            string;
  product_name:          string;
  price:                 number;
  official_price_amount: number;
  violation_amount:      number;
}

interface OfficialPriceItem {
  id:               number;
  product_name:     string;
  union_name:       string;
  price:            number;
  price_formatted:  string;
  effective_date:   string;
  is_today:         boolean;
  is_active:        boolean;
}

// ─── آمار واقعی محاسبه‌شده از لیست شکایات ───────────────────────────────────
interface ComplaintStats {
  total:      number;
  open:       number;       // submitted + reviewing + referred + inspecting
  closed:     number;       // confirmed + rejected + closed
  submitted:  number;
  reviewing:  number;
  confirmed:  number;
  rejected:   number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const OPEN_STATUSES   = ["submitted", "reviewing", "referred", "inspecting"];
const CLOSED_STATUSES = ["confirmed", "rejected", "closed"];

const COMPLAINT_VARIANT: Record<
  string, "success" | "danger" | "warning" | "info" | "default"
> = {
  submitted:  "info",
  reviewing:  "warning",
  referred:   "warning",
  inspecting: "warning",
  confirmed:  "success",
  rejected:   "danger",
  closed:     "default",
};

const WELCOME: Record<Role, string> = {
  admin:            "نمای کلی سامانه — تمام آمار و دسترسی‌ها در اختیار شماست",
  province_manager: "وضعیت استان زیر نظر شما نمایش داده شده است",
  chamber_manager:  "آمار اتاق اصناف شهر شما اینجاست",
  union_manager:    "وضعیت اتحادیه و قیمت‌گذاری امروز را ببینید",
  store_owner:      "وضعیت فروشگاه‌های شما نمایش داده شده است",
  inspector:        "شکایات محوله و فروشگاه‌های متخلف اینجاست",
  customer:         "آمار شکایات شما نمایش داده شده است",
};

// رنگ‌های نمودار دایره‌ای وضعیت شکایات
const PIE_COLORS: Record<string, string> = {
  "در انتظار":       "#2E6DB4",
  "در حال بررسی":   "#D97706",
  "تایید شده":       "#1A7A4A",
  "رد شده":          "#C0392B",
  "مختومه":          "#64748B",
  "ارجاع شده":       "#7C3AED",
  "در بازرسی":       "#EA580C",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: محاسبه آمار از لیست شکایات
// ─────────────────────────────────────────────────────────────────────────────

function calcComplaintStats(complaints: RecentComplaint[]): ComplaintStats {
  return {
    total:     complaints.length,
    open:      complaints.filter((c) => OPEN_STATUSES.includes(c.status)).length,
    closed:    complaints.filter((c) => CLOSED_STATUSES.includes(c.status)).length,
    submitted: complaints.filter((c) => c.status === "submitted").length,
    reviewing: complaints.filter((c) => c.status === "reviewing").length,
    confirmed: complaints.filter((c) => c.status === "confirmed").length,
    rejected:  complaints.filter((c) => c.status === "rejected").length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role     = user?.role as Role | undefined;

  const [complaints,     setComplaints]     = useState<RecentComplaint[]>([]);
  const [overpriced,     setOverpriced]     = useState<OverpricedStore[]>([]);
  const [todayPrices,    setTodayPrices]    = useState<OfficialPriceItem[]>([]);
  const [storeCount,     setStoreCount]     = useState<number | null>(null);
  const [complaintCount, setComplaintCount] = useState<number | null>(null);
  const [loading,        setLoading]        = useState(true);

  // ── Fetch واقعی از API ────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const tasks = await Promise.allSettled([
        // شکایات — page_size بزرگ تا آمار دقیق‌تری داشته باشیم
        apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { page_size: 100 } }),
        // گران‌فروشان
        apiClient.get(ENDPOINTS.PRICING.OVERPRICED, { params: { page_size: 5 } }),
        // قیمت‌های مصوب امروز
        apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICES_TODAY, { params: { page_size: 10 } }),
        // تعداد فروشگاه‌ها
        apiClient.get(ENDPOINTS.STORES.LIST, { params: { page_size: 1 } }),
      ]);

      if (tasks[0].status === "fulfilled") {
        const d = tasks[0].value.data?.data ?? tasks[0].value.data;
        const list = extractArray<RecentComplaint>(d);
        setComplaints(list);
        setComplaintCount(extractCount(d, list.length));
      }
      if (tasks[1].status === "fulfilled") {
        const d = tasks[1].value.data?.data ?? tasks[1].value.data;
        setOverpriced(extractArray<OverpricedStore>(d).slice(0, 5));
      }
      if (tasks[2].status === "fulfilled") {
        const d = tasks[2].value.data?.data ?? tasks[2].value.data;
        setTodayPrices(extractArray<OfficialPriceItem>(d).slice(0, 8));
      }
      if (tasks[3].status === "fulfilled") {
        const d = tasks[3].value.data?.data ?? tasks[3].value.data;
        setStoreCount(extractCount(d, 0));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const greeting = getGreeting();
  const stats    = calcComplaintStats(complaints);

  if (!role) return null;

  return (
    <div className="space-y-6">

      {/* ── Header Banner ── */}
      <HeaderBanner
        greeting={greeting}
        userName={user?.first_name || user?.full_name || "کاربر"}
        role={role}
      />

      {/* ── Role-based content ── */}
      {role === "admin" && (
        <AdminDashboard
          loading={loading}
          complaints={complaints}
          complaintStats={stats}
          complaintCount={complaintCount}
          overpriced={overpriced}
          todayPrices={todayPrices}
          storeCount={storeCount}
        />
      )}
      {role === "union_manager" && (
        <UnionDashboard
          loading={loading}
          complaints={complaints}
          complaintStats={stats}
          overpriced={overpriced}
          todayPrices={todayPrices}
        />
      )}
      {role === "chamber_manager" && (
        <ChamberDashboard
          loading={loading}
          complaints={complaints}
          complaintStats={stats}
        />
      )}
      {role === "province_manager" && (
        <ProvinceDashboard
          loading={loading}
          complaints={complaints}
          complaintStats={stats}
        />
      )}
      {role === "store_owner" && (
        <StoreDashboard
          loading={loading}
          complaints={complaints}
          todayPrices={todayPrices}
        />
      )}
      {role === "inspector" && (
        <InspectorDashboard
          loading={loading}
          complaints={complaints}
          complaintStats={stats}
          overpriced={overpriced}
        />
      )}
      {role === "customer" && (
        <CustomerDashboard
          loading={loading}
          complaints={complaints}
          complaintStats={stats}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header Banner
// ─────────────────────────────────────────────────────────────────────────────

function HeaderBanner({
  greeting,
  userName,
  role,
}: {
  greeting: { text: string; emoji: string };
  userName: string;
  role:     Role;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #0F2347 0%, #1B3A6B 55%, #2E6DB4 100%)",
      }}
    >
      {/* decorative */}
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-5
                      bg-white -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full opacity-5
                      bg-white translate-x-1/4 translate-y-1/4 pointer-events-none" />

      <div className="relative px-6 py-6 flex items-center justify-between gap-4">
        <div className="text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{greeting.emoji}</span>
            <h1 className="text-xl font-bold">
              {greeting.text}، {userName}
            </h1>
          </div>
          <p className="text-sm text-blue-200 mt-1">{WELCOME[role]}</p>
          <div className="flex items-center gap-4 mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs
                             bg-white/10 text-blue-100 px-3 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              سیستم آنلاین
            </span>
            <span className="text-xs text-blue-300">نسخه ۱.۰.۰</span>
          </div>
        </div>
        <div className="text-left flex-shrink-0 hidden sm:block">
          <p className="text-2xl font-bold text-white">{getTodayJalali()}</p>
          <p className="text-xs text-blue-300 mt-1">{ROLE_LABELS[role]}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function AdminDashboard({
  loading,
  complaints,
  complaintStats,
  complaintCount,
  overpriced,
  todayPrices,
  storeCount,
}: {
  loading:        boolean;
  complaints:     RecentComplaint[];
  complaintStats: ComplaintStats;
  complaintCount: number | null;
  overpriced:     OverpricedStore[];
  todayPrices:    OfficialPriceItem[];
  storeCount:     number | null;
}) {
  return (
    <div className="space-y-6">

      {/* ── ۴ کارت آماری واقعی ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <RealStatCard
              label="فروشگاه‌های سامانه"
              value={storeCount !== null ? storeCount.toLocaleString("fa-IR") : "—"}
              sub="تعداد کل فروشگاه‌ها"
              icon={<BuildingStorefrontIcon className="h-6 w-6" />}
              color="text-emerald-600"
              iconBg="bg-emerald-50"
              href="/admin/stores"
            />
            <RealStatCard
              label="شکایات ثبت‌شده"
              value={
                complaintCount !== null
                  ? complaintCount.toLocaleString("fa-IR")
                  : complaintStats.total.toLocaleString("fa-IR")
              }
              sub="مجموع کل شکایات"
              icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
              color="text-primary-600"
              iconBg="bg-primary-50"
              href="/admin/complaints"
            />
            <RealStatCard
              label="شکایات در جریان"
              value={complaintStats.open.toLocaleString("fa-IR")}
              sub="نیاز به پیگیری"
              icon={<ClockIcon className="h-6 w-6" />}
              color="text-amber-600"
              iconBg="bg-amber-50"
              href="/admin/complaints"
            />
            <RealStatCard
              label="گران‌فروشان امروز"
              value={overpriced.length.toLocaleString("fa-IR")}
              sub="فروشگاه متخلف"
              icon={<ExclamationTriangleIcon className="h-6 w-6" />}
              color="text-red-600"
              iconBg="bg-red-50"
              href="/admin/stores"
            />
          </>
        )}
      </div>

      {/* ── دسترسی سریع ── */}
      <AdminQuickAccess />

      {/* ── نمودار وضعیت شکایات + قیمت‌های امروز ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ComplaintStatusChart
          stats={complaintStats}
          loading={loading}
        />
        <TodayPricesCard
          prices={todayPrices}
          loading={loading}
        />
      </div>

      {/* ── جداول پایین ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentComplaintsTable
          complaints={complaints.slice(0, 6)}
          loading={loading}
          viewAllHref="/admin/complaints"
        />
        <OverpricedStoresTable
          overpriced={overpriced}
          loading={loading}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// نمودار وضعیت شکایات — Pie Chart واقعی
// ─────────────────────────────────────────────────────────────────────────────

function ComplaintStatusChart({
  stats,
  loading,
}: {
  stats:   ComplaintStats;
  loading: boolean;
}) {
  // ساخت داده برای Pie از آمار واقعی
  const pieData = [
    { name: "در انتظار",     value: stats.submitted  },
    { name: "در حال بررسی", value: stats.reviewing  },
    { name: "تایید شده",     value: stats.confirmed  },
    { name: "رد شده",        value: stats.rejected   },
    { name: "مختومه",        value: stats.closed     },
  ].filter((d) => d.value > 0); // فقط آیتم‌هایی که مقدار دارند

  const isEmpty = stats.total === 0;

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-primary-700">وضعیت شکایات</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            توزیع شکایات بر اساس وضعیت — داده واقعی
          </p>
        </div>
        <Badge variant="info" size="sm">
          {stats.total.toLocaleString("fa-IR")} کل
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-52">
          <Spinner size="lg" />
        </div>
      ) : isEmpty ? (
        /* ── حالت خالی — صادقانه ── */
        <div className="flex flex-col items-center justify-center h-52 gap-3">
          <ClipboardDocumentListIcon className="h-12 w-12 text-slate-200" />
          <p className="text-sm font-semibold text-slate-400">
            هیچ شکایتی ثبت نشده است
          </p>
          <p className="text-xs text-slate-300">
            پس از ثبت شکایات، نمودار نمایش داده می‌شود
          </p>
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={PIE_COLORS[entry.name] ?? "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip
              formatter={(value, name) => [
                Number(value ?? 0).toLocaleString("fa-IR"),
                String(name),
              ]}
                contentStyle={{
                  fontFamily:   "Vazirmatn",
                  borderRadius: "12px",
                  border:       "1px solid #e2e8f0",
                  fontSize:     "11px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", fontFamily: "Vazirmatn" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* خلاصه عددی */}
      {!loading && !isEmpty && (
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
          <SummaryChip label="در جریان"  value={stats.open}    color="text-amber-600"   bg="bg-amber-50"   />
          <SummaryChip label="بسته شده"  value={stats.closed}  color="text-slate-500"   bg="bg-slate-50"   />
          <SummaryChip label="تایید شده" value={stats.confirmed} color="text-emerald-600" bg="bg-emerald-50" />
        </div>
      )}
    </Card>
  );
}

function SummaryChip({
  label, value, color, bg,
}: {
  label: string; value: number; color: string; bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-2.5 text-center`}>
      <p className={`text-lg font-bold ${color}`}>
        {value.toLocaleString("fa-IR")}
      </p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// قیمت‌های مصوب امروز
// ─────────────────────────────────────────────────────────────────────────────

function TodayPricesCard({
  prices,
  loading,
}: {
  prices:  OfficialPriceItem[];
  loading: boolean;
}) {
  const isEmpty = !loading && prices.length === 0;

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-primary-700">قیمت‌های مصوب امروز</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            آخرین قیمت‌های ثبت‌شده — {getTodayJalali()}
          </p>
        </div>
        <Link href="/admin/pricing">
          <Button variant="ghost" size="sm">مشاهده همه</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <CurrencyDollarIcon className="h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-400">
            قیمتی برای امروز ثبت نشده است
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-50">
          {prices.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-5 py-3.5
                         hover:bg-slate-50/60 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-secondary-50 flex items-center
                              justify-center flex-shrink-0">
                <CurrencyDollarIcon className="h-4 w-4 text-secondary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {p.product_name}
                </p>
                <p className="text-xs text-slate-400 truncate">{p.union_name}</p>
              </div>
              <div className="flex-shrink-0 text-left">
                <p className="text-sm font-bold text-primary-700">
                  {formatPrice(p.price)} ریال
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Quick Access
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  {
    href:  "/admin/users",
    label: "کاربران",
    sub:   "مدیران سازمانی",
    icon:  <UserGroupIcon className="h-5 w-5" />,
    color: "bg-primary-50 text-primary-600 hover:bg-primary-100",
  },
  {
    href:  "/admin/province-offices",
    label: "استانداری‌ها",
    sub:   "دفاتر و ناظران",
    icon:  <BuildingOffice2Icon className="h-5 w-5" />,
    color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
  },
  {
    href:  "/admin/chambers",
    label: "اتاق اصناف",
    sub:   "مدیریت اتاق‌ها",
    icon:  <BuildingStorefrontIcon className="h-5 w-5" />,
    color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
  },
  {
    href:  "/admin/unions",
    label: "اتحادیه‌ها",
    sub:   "رؤسا و اتحادیه‌ها",
    icon:  <ShieldCheckIcon className="h-5 w-5" />,
    color: "bg-secondary-50 text-secondary-600 hover:bg-secondary-100",
  },
  {
    href:  "/admin/products",
    label: "محصولات",
    sub:   "محصولات و دسته‌ها",
    icon:  <CurrencyDollarIcon className="h-5 w-5" />,
    color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
  },
  {
    href:  "/admin/stores",
    label: "فروشگاه‌ها",
    sub:   "تایید و مدیریت",
    icon:  <CheckBadgeIcon className="h-5 w-5" />,
    color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
  },
  {
    href:  "/admin/complaints",
    label: "شکایات",
    sub:   "پیگیری شکایات",
    icon:  <ClipboardDocumentListIcon className="h-5 w-5" />,
    color: "bg-red-50 text-red-600 hover:bg-red-100",
  },
  {
    href:  "/admin/pricing",
    label: "قیمت‌گذاری",
    sub:   "قیمت مصوب و فروشگاه",
    icon:  <ChartBarIcon className="h-5 w-5" />,
    color: "bg-teal-50 text-teal-600 hover:bg-teal-100",
  },
];

function AdminQuickAccess() {
  return (
    <Card padding="md">
      <div className="mb-4">
        <h3 className="font-bold text-primary-700">دسترسی سریع</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          بخش‌های پرکاربرد پنل مدیریت
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl
                        transition-all text-center group ${link.color}`}
          >
            <div className="group-hover:scale-110 transition-transform">
              {link.icon}
            </div>
            <div>
              <p className="text-sm font-bold">{link.label}</p>
              <p className="text-xs opacity-70 hidden sm:block mt-0.5">
                {link.sub}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// جدول آخرین شکایات — مشترک بین نقش‌ها
// ─────────────────────────────────────────────────────────────────────────────

function RecentComplaintsTable({
  complaints,
  loading,
  viewAllHref,
}: {
  complaints:   RecentComplaint[];
  loading:      boolean;
  viewAllHref?: string;
}) {
  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-primary-700">آخرین شکایات</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            جدیدترین شکایات ثبت‌شده
          </p>
        </div>
        {viewAllHref && (
          <Link href={viewAllHref}>
            <Button variant="ghost" size="sm">مشاهده همه</Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <ClipboardDocumentListIcon className="h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-400">شکایتی ثبت نشده است</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-50">
          {complaints.map((c) => (
            <li key={c.uuid}>
              <div className="flex items-center gap-3 px-5 py-3.5
                             hover:bg-slate-50/80 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center
                                justify-center flex-shrink-0">
                  <ClipboardDocumentListIcon className="h-4 w-4 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {c.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{c.store_name}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge
                    variant={COMPLAINT_VARIANT[c.status] ?? "default"}
                    size="sm"
                  >
                    {c.status_display}
                  </Badge>
                  <span className="text-[10px] text-slate-300">
                    {toJalali(c.created_at)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// جدول گران‌فروشان — مشترک
// ─────────────────────────────────────────────────────────────────────────────

function OverpricedStoresTable({
  overpriced,
  loading,
}: {
  overpriced: OverpricedStore[];
  loading:    boolean;
}) {
  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-primary-700">فروشگاه‌های گران‌فروش</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            قیمت بالاتر از سقف مصوب — داده واقعی
          </p>
        </div>
        <Link href="/admin/stores">
          <Button variant="ghost" size="sm">مشاهده همه</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : overpriced.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <CheckBadgeIcon className="h-10 w-10 text-green-200" />
          <p className="text-sm font-semibold text-slate-400">
            گران‌فروشی گزارش نشده است
          </p>
          <p className="text-xs text-slate-300">
            تمام فروشگاه‌ها در محدوده مجاز قیمت‌گذاری کرده‌اند
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-50">
          {overpriced.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 px-5 py-3.5
                         hover:bg-red-50/30 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center
                              justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {s.store_name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {s.product_name}
                </p>
              </div>
              <div className="flex-shrink-0 text-left">
                <p className="text-xs font-bold text-red-600">
                  +{formatPrice(s.violation_amount)} ریال
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">مبلغ تخلف</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UNION DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function UnionDashboard({
  loading,
  complaints,
  complaintStats,
  overpriced,
  todayPrices,
}: {
  loading:        boolean;
  complaints:     RecentComplaint[];
  complaintStats: ComplaintStats;
  overpriced:     OverpricedStore[];
  todayPrices:    OfficialPriceItem[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <RealStatCard
              label="قیمت‌های مصوب امروز"
              value={todayPrices.length.toLocaleString("fa-IR")}
              sub="ثبت‌شده تا این لحظه"
              icon={<CurrencyDollarIcon className="h-6 w-6" />}
              color="text-primary-600"
              iconBg="bg-primary-50"
              href="/union/pricing/official"
              actionLabel="ثبت قیمت"
            />
            <RealStatCard
              label="شکایات اتحادیه"
              value={complaintStats.total.toLocaleString("fa-IR")}
              sub={`${complaintStats.open} مورد در جریان`}
              icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
              color="text-orange-600"
              iconBg="bg-orange-50"
              href="/union/complaints"
            />
            <RealStatCard
              label="گران‌فروشان امروز"
              value={overpriced.length.toLocaleString("fa-IR")}
              sub="فروشگاه متخلف"
              icon={<ExclamationTriangleIcon className="h-6 w-6" />}
              color="text-red-600"
              iconBg="bg-red-50"
              href="/union/stores"
            />
          </>
        )}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ComplaintStatusChart stats={complaintStats} loading={loading} />
        <TodayPricesCard prices={todayPrices} loading={loading} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentComplaintsTable
          complaints={complaints.slice(0, 5)}
          loading={loading}
          viewAllHref="/union/complaints"
        />
        <OverpricedStoresTable overpriced={overpriced} loading={loading} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAMBER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function ChamberDashboard({
  loading,
  complaints,
  complaintStats,
}: {
  loading:        boolean;
  complaints:     RecentComplaint[];
  complaintStats: ComplaintStats;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <RealStatCard
              label="شکایات شهر"
              value={complaintStats.total.toLocaleString("fa-IR")}
              sub={`${complaintStats.open} مورد در جریان`}
              icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
              color="text-primary-600"
              iconBg="bg-primary-50"
              href="/chamber/complaints"
            />
            <RealStatCard
              label="فروشگاه‌های در انتظار"
              value="—"
              sub="نیاز به بررسی و تایید"
              icon={<ClockIcon className="h-6 w-6" />}
              color="text-amber-600"
              iconBg="bg-amber-50"
              href="/chamber/stores/pending"
              actionLabel="بررسی"
            />
          </>
        )}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ComplaintStatusChart stats={complaintStats} loading={loading} />
        <RecentComplaintsTable
          complaints={complaints.slice(0, 6)}
          loading={loading}
          viewAllHref="/chamber/complaints"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVINCE DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function ProvinceDashboard({
  loading,
  complaints,
  complaintStats,
}: {
  loading:        boolean;
  complaints:     RecentComplaint[];
  complaintStats: ComplaintStats;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <RealStatCard
              label="شکایات استان"
              value={complaintStats.total.toLocaleString("fa-IR")}
              sub="مجموع کل"
              icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
              color="text-primary-600"
              iconBg="bg-primary-50"
              href="/province/complaints"
            />
            <RealStatCard
              label="در جریان"
              value={complaintStats.open.toLocaleString("fa-IR")}
              sub="نیاز به پیگیری"
              icon={<ClockIcon className="h-6 w-6" />}
              color="text-amber-600"
              iconBg="bg-amber-50"
              href="/province/complaints"
            />
            <RealStatCard
              label="بسته شده"
              value={complaintStats.closed.toLocaleString("fa-IR")}
              sub="تایید یا رد"
              icon={<CheckBadgeIcon className="h-6 w-6" />}
              color="text-emerald-600"
              iconBg="bg-emerald-50"
              href="/province/reports"
            />
          </>
        )}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ComplaintStatusChart stats={complaintStats} loading={loading} />
        <RecentComplaintsTable
          complaints={complaints.slice(0, 6)}
          loading={loading}
          viewAllHref="/province/complaints"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function StoreDashboard({
  loading,
  complaints,
  todayPrices,
}: {
  loading:     boolean;
  complaints:  RecentComplaint[];
  todayPrices: OfficialPriceItem[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <RealStatCard
              label="فروشگاه‌های من"
              value="—"
              sub="مدیریت فروشگاه‌ها"
              icon={<BuildingStorefrontIcon className="h-6 w-6" />}
              color="text-primary-600"
              iconBg="bg-primary-50"
              href="/store/my-stores"
            />
            <RealStatCard
              label="قیمت‌گذاری امروز"
              value={todayPrices.length.toLocaleString("fa-IR")}
              sub="محصول قیمت‌گذاری شده"
              icon={<CurrencyDollarIcon className="h-6 w-6" />}
              color="text-emerald-600"
              iconBg="bg-emerald-50"
              href="/store/pricing"
              actionLabel="ثبت قیمت"
            />
            <RealStatCard
              label="شکایات دریافتی"
              value={complaints.length.toLocaleString("fa-IR")}
              sub="مجموع شکایات"
              icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
              color="text-red-600"
              iconBg="bg-red-50"
              href="/customer/complaints"
            />
          </>
        )}
      </div>
      <TodayPricesCard prices={todayPrices} loading={loading} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INSPECTOR DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function InspectorDashboard({
  loading,
  complaints,
  complaintStats,
  overpriced,
}: {
  loading:        boolean;
  complaints:     RecentComplaint[];
  complaintStats: ComplaintStats;
  overpriced:     OverpricedStore[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <RealStatCard
              label="شکایات محوله"
              value={complaintStats.total.toLocaleString("fa-IR")}
              sub={`${complaintStats.open} در انتظار بررسی`}
              icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
              color="text-orange-600"
              iconBg="bg-orange-50"
              href="/inspector/complaints"
            />
            <RealStatCard
              label="فروشگاه‌های متخلف"
              value={overpriced.length.toLocaleString("fa-IR")}
              sub="گران‌فروشی امروز"
              icon={<ExclamationTriangleIcon className="h-6 w-6" />}
              color="text-red-600"
              iconBg="bg-red-50"
              href="/inspector/overpriced"
            />
          </>
        )}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentComplaintsTable
          complaints={complaints.slice(0, 6)}
          loading={loading}
          viewAllHref="/inspector/complaints"
        />
        <OverpricedStoresTable overpriced={overpriced} loading={loading} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function CustomerDashboard({
  loading,
  complaints,
  complaintStats,
}: {
  loading:        boolean;
  complaints:     RecentComplaint[];
  complaintStats: ComplaintStats;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <RealStatCard
              label="شکایات من"
              value={complaintStats.total.toLocaleString("fa-IR")}
              sub={`${complaintStats.open} در جریان`}
              icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
              color="text-primary-600"
              iconBg="bg-primary-50"
              href="/customer/complaints"
            />
            <RealStatCard
              label="ثبت شکایت جدید"
              value=""
              sub="گزارش گران‌فروشی"
              icon={<ExclamationTriangleIcon className="h-6 w-6" />}
              color="text-orange-600"
              iconBg="bg-orange-50"
              href="/complaints/new"
              actionLabel="ثبت شکایت"
            />
          </>
        )}
      </div>
      {complaints.length > 0 && (
        <RecentComplaintsTable
          complaints={complaints.slice(0, 5)}
          loading={loading}
          viewAllHref="/customer/complaints"
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RealStatCard — کارت آماری با داده واقعی
// ─────────────────────────────────────────────────────────────────────────────

function RealStatCard({
  label,
  value,
  sub,
  icon,
  color,
  iconBg,
  href,
  actionLabel,
}: {
  label:        string;
  value:        string;
  sub?:         string;
  icon:         React.ReactNode;
  color:        string;
  iconBg:       string;
  href:         string;
  actionLabel?: string;
}) {
  return (
    <Link href={href}>
      <div
        className="bg-white rounded-2xl border border-slate-100 shadow-card p-5
                   hover:shadow-card-hover transition-all group cursor-pointer h-full"
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className={`p-3 rounded-xl ${iconBg} ${color}
                        group-hover:scale-110 transition-transform`}
          >
            {icon}
          </div>
          <ArrowLeftIcon
            className="h-4 w-4 text-slate-200 group-hover:text-primary-400
                       transition-colors"
          />
        </div>

        {value ? (
          <p className="text-3xl font-bold text-slate-800 mb-1">{value}</p>
        ) : (
          <div className="h-9 mb-1" />
        )}

        <p className="text-sm font-semibold text-slate-600">{label}</p>

        {sub && (
          <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
        )}

        {actionLabel && (
          <span
            className={`inline-block mt-2 text-xs font-semibold px-2.5 py-1
                        rounded-full ${iconBg} ${color}`}
          >
            {actionLabel} ←
          </span>
        )}
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 12) return { text: "صبح بخیر",  emoji: "🌅" };
  if (h < 17) return { text: "روز بخیر",  emoji: "☀️" };
  if (h < 21) return { text: "عصر بخیر",  emoji: "🌇" };
  return           { text: "شب بخیر",     emoji: "🌙" };
}