"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }       from "@/components/layout/PageHeader";
import { StatCard }         from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }            from "@/components/ui/Badge";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import { EmptyState }       from "@/components/ui/EmptyState";
import { Spinner }          from "@/components/ui/Spinner";
import apiClient            from "@/services/api.client";
import { ENDPOINTS }        from "@/services/endpoints";
import { extractArray, extractCount } from "@/utils/error.utils";
import { toJalali, timeAgo, getTodayJalali } from "@/utils/date.utils";
import { formatPrice }      from "@/utils/number.utils";
import { cn }               from "@/lib/cn";
import Link                 from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface UrgentComplaint {
  uuid:           string;
  title:          string;
  store_name:     string;
  status:         string;
  status_display: string;
  created_at:     string;
  updated_at:     string;
}

interface OverpricedStore {
  id:                    number;
  store_name:            string;
  union_name:            string;
  product_name:          string;
  price:                 number;
  official_price_amount: number;
  violation_amount:      number;
  price_date:            string;
}

interface InspectorStats {
  assigned:    number;
  inProgress:  number;
  closedMonth: number;
  overpriced:  number;
}

const BADGE_MAP: Record<string,
  "success" | "danger" | "warning" | "info" | "default"
> = {
  submitted: "info", reviewing: "warning", referred: "warning",
  inspecting: "warning", confirmed: "success", rejected: "danger", closed: "default",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function InspectorOverviewPage() {
  const [stats,      setStats]      = useState<InspectorStats>({
    assigned: 0, inProgress: 0, closedMonth: 0, overpriced: 0,
  });
  const [urgent,     setUrgent]     = useState<UrgentComplaint[]>([]);
  const [overpriced, setOverpriced] = useState<OverpricedStore[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [compRes, overRes] = await Promise.allSettled([
          apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { page_size: 5 } }),
          apiClient.get(ENDPOINTS.PRICING.OVERPRICED, { params: { page_size: 5 } }),
        ]);

        if (compRes.status === "fulfilled") {
          const d    = compRes.value.data?.data ?? compRes.value.data;
          const list = extractArray<UrgentComplaint>(d);
          setUrgent(list);
          setStats((p) => ({
            ...p,
            assigned:   extractCount(d, 0),
            inProgress: list.filter((c) =>
              ["reviewing","inspecting"].includes(c.status)
            ).length,
          }));
        }
        if (overRes.status === "fulfilled") {
          const d    = overRes.value.data?.data ?? overRes.value.data;
          const list = extractArray<OverpricedStore>(d);
          setOverpriced(list);
          setStats((p) => ({ ...p, overpriced: extractCount(d, 0) }));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">پنل بازرس</h1>
          <p className="text-sm text-slate-500 mt-1">{getTodayJalali()}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50
                         border border-red-200 rounded-xl">
          <FireIcon className="h-4 w-4 text-red-500" />
          <span className="text-xs font-bold text-red-700">
            {stats.overpriced} مورد تخلف فعال
          </span>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard
              title="شکایات محوله"
              value={stats.assigned.toLocaleString("fa-IR")}
              variant="primary"
              icon={<ClipboardDocumentListIcon />}
            />
            <StatCard
              title="در حال بررسی"
              value={stats.inProgress.toLocaleString("fa-IR")}
              variant="warning"
              icon={<MagnifyingGlassIcon />}
            />
            <StatCard
              title="بسته شده (ماه جاری)"
              value={stats.closedMonth.toLocaleString("fa-IR")}
              variant="success"
              icon={<CheckCircleIcon />}
            />
            <StatCard
              title="موارد گران‌فروشی"
              value={stats.overpriced.toLocaleString("fa-IR")}
              variant="danger"
              icon={<ExclamationTriangleIcon />}
            />
          </>
        )}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Urgent Complaints ── */}
        <Card padding="none">
          <div className="flex items-center justify-between px-6 py-4
                           border-b border-slate-100">
            <div>
              <p className="font-bold text-slate-800">شکایات فوری</p>
              <p className="text-xs text-slate-400 mt-0.5">
                قدیمی‌ترین موارد بدون پاسخ
              </p>
            </div>
            <Link href="/inspector/complaints">
              <button className="text-xs font-semibold text-primary-600
                                  hover:text-primary-800 transition-colors
                                  flex items-center gap-1">
                همه شکایات
                <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
              </button>
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : urgent.length === 0 ? (
            <EmptyState
              icon={<CheckCircleIcon className="h-12 w-12" />}
              title="هیچ شکایت فوری‌ای وجود ندارد"
              size="sm"
            />
          ) : (
            <div className="divide-y divide-slate-50">
              {urgent.map((complaint) => {
                const daysSince = Math.floor(
                  (Date.now() - new Date(complaint.created_at).getTime()) /
                  (1000 * 60 * 60 * 24)
                );
                const isOld = daysSince > 3;

                return (
                  <Link
                    key={complaint.uuid}
                    href={`/inspector/complaints/${complaint.uuid}`}
                  >
                    <div className="flex items-center gap-4 px-6 py-4
                                     hover:bg-slate-50/80 transition-colors group">
                      {/* Urgency indicator */}
                      <div className={cn(
                        "flex-shrink-0 h-10 w-10 rounded-xl flex items-center",
                        "justify-center",
                        isOld
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-600",
                      )}>
                        {isOld ? (
                          <FireIcon className="h-5 w-5" />
                        ) : (
                          <ClockIcon className="h-5 w-5" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate
                                       group-hover:text-primary-700 transition-colors text-sm">
                          {complaint.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <BuildingStorefrontIcon className="h-3 w-3 text-slate-400" />
                          <p className="text-xs text-slate-500 truncate">
                            {complaint.store_name}
                          </p>
                        </div>
                      </div>

                      {/* Badge + time */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <Badge
                          variant={BADGE_MAP[complaint.status] ?? "default"}
                          size="sm"
                          dot
                        >
                          {complaint.status_display}
                        </Badge>
                        <span className={cn(
                          "text-xs font-semibold",
                          isOld ? "text-red-600" : "text-slate-400"
                        )}>
                          {daysSince} روز پیش
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Overpriced Stores ── */}
        <Card padding="none">
          <div className="flex items-center justify-between px-6 py-4
                           border-b border-slate-100">
            <div>
              <p className="font-bold text-slate-800">فروشگاه‌های پرتخلف</p>
              <p className="text-xs text-slate-400 mt-0.5">بیشترین مبلغ تخلف</p>
            </div>
            <Link href="/inspector/overpriced">
              <button className="text-xs font-semibold text-primary-600
                                  hover:text-primary-800 transition-colors
                                  flex items-center gap-1">
                مشاهده همه
                <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
              </button>
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : overpriced.length === 0 ? (
            <EmptyState
              icon={<ShieldExclamationIcon className="h-12 w-12" />}
              title="تخلفی شناسایی نشده"
              size="sm"
            />
          ) : (
            <div className="divide-y divide-slate-50">
              {overpriced.map((store, i) => {
                const violationPct = Math.round(
                  (store.violation_amount / store.official_price_amount) * 100
                );
                const severity =
                  violationPct > 20 ? "high"
                  : violationPct > 10 ? "medium"
                  : "low";
                const colors = {
                  high:   { bg: "bg-red-100",    text: "text-red-700",    bar: "bg-red-500" },
                  medium: { bg: "bg-orange-100",  text: "text-orange-700", bar: "bg-orange-500" },
                  low:    { bg: "bg-amber-100",   text: "text-amber-700",  bar: "bg-amber-400" },
                }[severity];

                return (
                  <div key={store.id ?? i}
                       className="px-6 py-4 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Rank */}
                      <div className={cn(
                        "flex-shrink-0 h-8 w-8 rounded-lg flex items-center",
                        "justify-center text-xs font-bold",
                        colors.bg, colors.text
                      )}>
                        {i + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate text-sm">
                              {store.store_name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {store.product_name} · {store.union_name}
                            </p>
                          </div>
                          <span className={cn(
                            "flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full",
                            colors.bg, colors.text
                          )}>
                            +{violationPct}٪
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-1.5 rounded-full transition-all", colors.bar)}
                              style={{ width: `${Math.min(violationPct * 2, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-red-600 flex-shrink-0">
                            +{formatPrice(store.violation_amount)} ریال
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label:    "مشاهده گران‌فروشان",
            desc:     "لیست کامل فروشگاه‌های متخلف",
            href:     "/inspector/overpriced",
            icon:     ExclamationTriangleIcon,
            gradient: "from-red-500 to-red-600",
          },
          {
            label:    "پیگیری شکایات",
            desc:     "شکایات محوله به شما",
            href:     "/inspector/complaints",
            icon:     ClipboardDocumentListIcon,
            gradient: "from-primary-600 to-primary-700",
          },
          {
            label:    "بازرسی فروشگاه‌ها",
            desc:     "مشاهده اطلاعات فروشگاه‌ها",
            href:     "/inspector/stores",
            icon:     BuildingStorefrontIcon,
            gradient: "from-secondary-500 to-secondary-600",
          },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={cn(
              "bg-gradient-to-br rounded-2xl p-5 text-white cursor-pointer",
              "hover:shadow-lg hover:scale-[1.02] transition-all duration-200",
              item.gradient
            )}>
              <item.icon className="h-8 w-8 mb-3 opacity-90" />
              <p className="font-bold text-base">{item.label}</p>
              <p className="text-sm opacity-80 mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}