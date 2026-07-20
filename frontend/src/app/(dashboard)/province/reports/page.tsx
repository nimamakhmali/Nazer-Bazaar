"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  DocumentArrowDownIcon, FunnelIcon,
  ChartBarIcon,          ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Button }        from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }         from "@/components/ui/Badge";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }    from "@/components/ui/EmptyState";
import { Spinner }       from "@/components/ui/Spinner";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { parseApiError, extractArray } from "@/utils/error.utils";
import { formatPrice }   from "@/utils/number.utils";
import { toJalali, getTodayJalali } from "@/utils/date.utils";
import toast             from "react-hot-toast";
import { cn }            from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
type TabId = "prices" | "violations" | "complaints";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{className?:string}> }[] = [
  { id: "prices",     label: "گزارش قیمت‌ها",  icon: ChartBarIcon },
  { id: "violations", label: "گزارش تخلفات",   icon: ExclamationTriangleIcon },
  { id: "complaints", label: "گزارش شکایات",   icon: ClipboardDocumentListIcon },
];

interface OfficialPrice {
  id:              number;
  product_name:    string;
  union_name:      string;
  price:           number;
  min_allowed_price: number;
  effective_date:  string;
  is_today:        boolean;
  created_by_name: string;
}

interface OverpricedStore {
  id:                number;
  store_name:        string;
  union_name:        string;
  product_name:      string;
  price:             number;
  official_price_amount: number;
  violation_amount:  number;
  price_date:        string;
}

interface ComplaintReport {
  uuid:           string;
  title:          string;
  store_name:     string;
  status:         string;
  status_display: string;
  price_reported: number;
  created_at:     string;
}

// price history mock
const PRICE_HISTORY = [
  { date: "شنبه",     price: 45000, avg: 44500 },
  { date: "یکشنبه",   price: 45000, avg: 44800 },
  { date: "دوشنبه",   price: 46500, avg: 45900 },
  { date: "سه‌شنبه",  price: 46500, avg: 47200 },
  { date: "چهارشنبه", price: 48000, avg: 47100 },
  { date: "پنجشنبه",  price: 48000, avg: 48300 },
  { date: "جمعه",     price: 49000, avg: 48800 },
];

// complaints by union mock
const COMPLAINT_CHART = [
  { name: "خواربار",   count: 12 },
  { name: "مرغ‌فروشی", count: 8  },
  { name: "گوشت",      count: 15 },
  { name: "لبنیات",    count: 5  },
  { name: "سبزیجات",   count: 9  },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function ProvinceReportsPage() {
  const [activeTab,    setActiveTab]    = useState<TabId>("prices");
  const [loadingData,  setLoadingData]  = useState(false);
  const [search,       setSearch]       = useState("");
  const [exporting,    setExporting]    = useState(false);

  // data states
  const [prices,       setPrices]       = useState<OfficialPrice[]>([]);
  const [violations,   setViolations]   = useState<OverpricedStore[]>([]);
  const [complaints,   setComplaints]   = useState<ComplaintReport[]>([]);

  // ── fetch per tab ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      if (activeTab === "prices") {
        const r = await apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICES, {
          params: { page_size: 30 },
        });
        const d = r.data?.data ?? r.data;
        setPrices(extractArray<OfficialPrice>(d));
      } else if (activeTab === "violations") {
        const r = await apiClient.get(ENDPOINTS.PRICING.OVERPRICED, {
          params: { page_size: 30 },
        });
        const d = r.data?.data ?? r.data;
        setViolations(extractArray<OverpricedStore>(d));
      } else {
        const r = await apiClient.get(ENDPOINTS.COMPLAINTS.LIST, {
          params: { page_size: 30 },
        });
        const d = r.data?.data ?? r.data;
        setComplaints(extractArray<ComplaintReport>(d));
      }
    } catch { /* silent */ }
    finally { setLoadingData(false); }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await apiClient.get(ENDPOINTS.PRODUCTS.EXPORT, {
        responseType: "blob",
      });
      const url  = URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement("a");
      link.href     = url;
      link.download = `report-${getTodayJalali()}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("خطا در دریافت فایل گزارش");
    } finally {
      setExporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="گزارشات استان"
        subtitle="تحلیل و بررسی وضعیت قیمت، تخلفات و شکایات"
        breadcrumbs={[
          { label: "استانداری", href: "/province/overview" },
          { label: "گزارشات" },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={handleExport}
            isLoading={exporting}
            leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
          >
            دریافت Excel
          </Button>
        }
      />

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-white rounded-2xl border
                       border-slate-100 shadow-card p-1.5 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold",
              "transition-all duration-200",
              activeTab === tab.id
                ? "bg-primary-700 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search + Filter bar ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                             h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder={
                activeTab === "prices"
                  ? "جستجوی محصول، اتحادیه..."
                  : activeTab === "violations"
                  ? "جستجوی فروشگاه، محصول..."
                  : "جستجوی شکایت..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                         focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>
          <Button
            variant="ghost"
            leftIcon={<FunnelIcon className="h-4 w-4" />}
            size="sm"
          >
            فیلترها
          </Button>
        </div>
      </div>

      {/* ── Tab: Prices ── */}
      {activeTab === "prices" && (
        <div className="space-y-5">
          {/* Chart */}
          <Card padding="md">
            <CardHeader>
              <CardTitle subtitle="روند قیمت مصوب در برابر میانگین فروشگاه‌ها">
                نمودار روند قیمت — ۷ روز اخیر
              </CardTitle>
              <Badge variant="info" size="sm">هفته جاری</Badge>
            </CardHeader>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={PRICE_HISTORY}
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
                    tickFormatter={(v) => `${(v/1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      fontFamily: "Vazirmatn",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                    formatter={(v: number, name: string) => [
                      formatPrice(v) + " ریال",
                      name === "price" ? "قیمت مصوب" : "میانگین فروشگاه",
                    ]}
                  />
                  <Legend
                    formatter={(v) => v === "price" ? "قیمت مصوب" : "میانگین فروشگاه"}
                    wrapperStyle={{ fontSize: "12px", fontFamily: "Vazirmatn" }}
                  />
                  <Line
                    type="monotone" dataKey="price" stroke="#1B3A6B"
                    strokeWidth={2.5} dot={{ r: 4, fill: "#1B3A6B" }}
                  />
                  <Line
                    type="monotone" dataKey="avg" stroke="#C49A2E"
                    strokeWidth={2.5} strokeDasharray="5 3"
                    dot={{ r: 4, fill: "#C49A2E" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Table */}
          {loadingData ? (
            <SkeletonTable rows={8} cols={5} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100
                            shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                      {["محصول","اتحادیه","قیمت مصوب","حداقل مجاز","تاریخ","ثبت‌کننده"].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-right text-xs font-bold
                                                uppercase tracking-wider text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {prices
                      .filter((p) =>
                        !search ||
                        p.product_name.includes(search) ||
                        p.union_name.includes(search),
                      )
                      .map((p) => (
                        <tr key={p.id}
                            className="border-b border-slate-50 hover:bg-slate-50/60">
                          <td className="px-5 py-3.5 font-semibold text-slate-800">
                            {p.product_name}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{p.union_name}</td>
                          <td className="px-5 py-3.5 font-bold text-primary-700">
                            {formatPrice(p.price)} ریال
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {formatPrice(p.min_allowed_price)} ریال
                          </td>
                          <td className="px-5 py-3.5 text-xs">
                            {p.is_today ? (
                              <Badge variant="info" size="sm">امروز</Badge>
                            ) : (
                              <span className="text-slate-400">
                                {toJalali(p.effective_date)}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">
                            {p.created_by_name}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {prices.length === 0 && !loadingData && (
                <EmptyState title="قیمتی یافت نشد" size="sm" />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Violations ── */}
      {activeTab === "violations" && (
        <div className="space-y-5">
          {loadingData ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="xl" />
            </div>
          ) : violations.length === 0 ? (
            <EmptyState
              icon={<ExclamationTriangleIcon className="h-16 w-16" />}
              title="تخلفی یافت نشد"
              description="در حال حاضر هیچ فروشگاه متخلفی وجود ندارد."
              size="lg"
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100
                            shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-red-50 flex gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm font-bold text-red-800">
                  {violations.length} مورد گران‌فروشی شناسایی شده
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                      {["فروشگاه","اتحادیه","محصول","قیمت مصوب","قیمت ثبتی","مبلغ تخلف","تاریخ"].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-right text-xs font-bold
                                                uppercase tracking-wider text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {violations
                      .filter((v) =>
                        !search ||
                        v.store_name.includes(search) ||
                        v.product_name.includes(search),
                      )
                      .map((v, i) => (
                        <tr key={v.id ?? i}
                            className="border-b border-slate-50 hover:bg-red-50/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-slate-800">{v.store_name}</span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 text-xs">
                            {v.union_name}
                          </td>
                          <td className="px-5 py-3.5 text-slate-700">{v.product_name}</td>
                          <td className="px-5 py-3.5 text-primary-700 font-semibold">
                            {formatPrice(v.official_price_amount)}
                          </td>
                          <td className="px-5 py-3.5 text-red-600 font-bold">
                            {formatPrice(v.price)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1
                                             bg-red-100 text-red-800 rounded-full text-xs font-bold">
                              +{formatPrice(v.violation_amount)} ریال
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400">
                            {toJalali(v.price_date)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Complaints ── */}
      {activeTab === "complaints" && (
        <div className="space-y-5">
          {/* Chart */}
          <Card padding="md">
            <CardHeader>
              <CardTitle subtitle="تعداد شکایات بر اساس اتحادیه">
                نمودار شکایات
              </CardTitle>
            </CardHeader>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={COMPLAINT_CHART}
                  margin={{ top: 5, right: 5, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    angle={-15}
                    textAnchor="end"
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
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [`${v} شکایت`]}
                  />
                  <Bar dataKey="count" fill="#C0392B" radius={[6,6,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Table */}
          {loadingData ? (
            <SkeletonTable rows={8} cols={5} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                      {["عنوان","فروشگاه","قیمت پرداختی","وضعیت","تاریخ"].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-right text-xs font-bold
                                                uppercase tracking-wider text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {complaints
                      .filter((c) => !search || c.title.includes(search) || c.store_name.includes(search))
                      .map((c) => (
                        <tr key={c.uuid}
                            className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-800">
                            {c.title}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 text-xs">
                            {c.store_name}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-red-600">
                            {formatPrice(c.price_reported)} ریال
                          </td>
                          <td className="px-5 py-3.5">
                            <ComplaintStatusBadge status={c.status} label={c.status_display} />
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400">
                            {toJalali(c.created_at)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {complaints.length === 0 && !loadingData && (
                <EmptyState title="شکایتی یافت نشد" size="sm" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ComplaintStatusBadge({ status, label }: { status: string; label: string }) {
  const map: Record<string, "success"|"danger"|"warning"|"info"|"default"> = {
    submitted:  "info",
    reviewing:  "warning",
    referred:   "warning",
    inspecting: "warning",
    confirmed:  "success",
    rejected:   "danger",
    closed:     "default",
  };
  return (
    <Badge variant={map[status] ?? "default"} size="sm" dot>
      {label}
    </Badge>
  );
}