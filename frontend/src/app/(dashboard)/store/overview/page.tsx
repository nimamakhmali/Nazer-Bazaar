"use client";

import React, { useState, useEffect } from "react";
import {
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusCircleIcon,
  ArrowRightIcon,
  ShieldExclamationIcon,
  BellAlertIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }       from "@/components/layout/PageHeader";
import { StatCard }         from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }            from "@/components/ui/Badge";
import { Button }           from "@/components/ui/Button";
import { Alert }            from "@/components/ui/Alert";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import apiClient            from "@/services/api.client";
import { ENDPOINTS }        from "@/services/endpoints";
import { extractArray }     from "@/utils/error.utils";
import { formatPrice }      from "@/utils/number.utils";
import { toJalali, getTodayJalali } from "@/utils/date.utils";
import { cn }               from "@/lib/cn";
import Link                 from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface MyStore {
  id:                       number;
  name:                     string;
  union_name:               string;
  city_name:                string;
  status:                   string;
  status_display:           string;
  can_set_price:            boolean;
  is_active:                boolean;
  complaints_count:         number;
  pending_complaints_count: number;
  rejection_reason:         string | null;
  license_number:           string;
}

interface StoreLicense {
  days_until_expiry: number;
  needs_renewal:     boolean;
  is_expired:        boolean;
  expire_date:       string;
}

const STATUS_CONFIG: Record<string, {
  variant: "success" | "warning" | "danger" | "info" | "default";
  bg:      string;
  border:  string;
  icon:    React.ComponentType<{ className?: string }>;
  label:   string;
}> = {
  active:    {
    variant: "success", label: "فعال",
    bg: "bg-green-50", border: "border-green-200",
    icon: CheckCircleIcon,
  },
  pending:   {
    variant: "warning", label: "در انتظار تایید",
    bg: "bg-amber-50", border: "border-amber-200",
    icon: ClockIcon,
  },
  suspended: {
    variant: "danger",  label: "تعلیق شده",
    bg: "bg-red-50",   border: "border-red-200",
    icon: XCircleIcon,
  },
  rejected:  {
    variant: "danger",  label: "رد شده",
    bg: "bg-red-50",   border: "border-red-200",
    icon: XCircleIcon,
  },
  closed:    {
    variant: "default", label: "تعطیل",
    bg: "bg-slate-50", border: "border-slate-200",
    icon: XCircleIcon,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function StoreOverviewPage() {
  const [stores,    setStores]    = useState<MyStore[]>([]);
  const [licenses,  setLicenses]  = useState<Record<number, StoreLicense>>({});
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res  = await apiClient.get(ENDPOINTS.STORES.MY_STORES);
        const data = res.data?.data ?? res.data;
        const list = extractArray<MyStore>(data);
        setStores(list);

        // fetch licenses for each store
        const licMap: Record<number, StoreLicense> = {};
        await Promise.allSettled(
          list.map(async (s) => {
            try {
              const lr   = await apiClient.get(ENDPOINTS.STORES.LICENSE(s.id));
              const ldata = lr.data?.data ?? lr.data;
              if (ldata) licMap[s.id] = ldata as StoreLicense;
            } catch { /* no license */ }
          }),
        );
        setLicenses(licMap);
      } catch { /* handled */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // ── derived stats ──────────────────────────────────────────────────────────
  const activeCount    = stores.filter((s) => s.status === "active").length;
  const pendingCount   = stores.filter((s) => s.status === "pending").length;
  const totalComplaints = stores.reduce((sum, s) => sum + (s.complaints_count ?? 0), 0);
  const pendingComplaints = stores.reduce(
    (sum, s) => sum + (s.pending_complaints_count ?? 0), 0,
  );

  // ── alerts ─────────────────────────────────────────────────────────────────
  const expiringLicenses = Object.entries(licenses).filter(
    ([, l]) => l.needs_renewal && !l.is_expired,
  );
  const expiredLicenses = Object.entries(licenses).filter(([, l]) => l.is_expired);
  const needsPricing = stores.filter(
    (s) => s.status === "active" && s.can_set_price,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="نمای کلی فروشگاه‌ها"
        subtitle={`امروز — ${getTodayJalali()}`}
        breadcrumbs={[{ label: "فروشگاه" }, { label: "نمای کلی" }]}
        actions={
          <Link href="/store/register-store">
            <Button leftIcon={<PlusCircleIcon className="h-4 w-4" />}>
              ثبت فروشگاه جدید
            </Button>
          </Link>
        }
      />

      {/* ── Alerts ── */}
      <div className="space-y-3">
        {expiredLicenses.length > 0 && (
          <Alert
            variant="error"
            title="پروانه کسب منقضی شده"
            message={`پروانه کسب ${expiredLicenses.length} فروشگاه منقضی شده است. برای تمدید اقدام کنید.`}
            icon
          />
        )}
        {expiringLicenses.length > 0 && (
          <Alert
            variant="warning"
            title="پروانه کسب رو به انقضا"
            message={`پروانه کسب ${expiringLicenses.length} فروشگاه در ۳۰ روز آینده منقضی می‌شود.`}
            icon
            dismissible
          />
        )}
        {needsPricing.length > 0 && (
          <div className="flex items-center justify-between gap-4 p-4 bg-primary-50
                           border border-primary-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-xl">
                <BellAlertIcon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary-800">
                  قیمت‌گذاری امروز انجام نشده
                </p>
                <p className="text-xs text-primary-600 mt-0.5">
                  {needsPricing.length} فروشگاه منتظر ثبت قیمت امروز هستند
                </p>
              </div>
            </div>
            <Link href="/store/pricing">
              <Button size="sm">ثبت قیمت</Button>
            </Link>
          </div>
        )}
        {pendingCount > 0 && (
          <Alert
            variant="info"
            title="فروشگاه در انتظار تایید"
            message={`${pendingCount} فروشگاه در انتظار بررسی و تایید توسط اتاق اصناف است.`}
            icon
          />
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
              value={activeCount.toLocaleString("fa-IR")}
              variant="primary"
              icon={<BuildingStorefrontIcon />}
              suffix={`از ${stores.length}`}
            />
            <StatCard
              title="قیمت‌گذاری امروز"
              value={needsPricing.length === 0 ? "کامل" : `${needsPricing.length} باقی‌مانده`}
              variant={needsPricing.length === 0 ? "success" : "warning"}
              icon={<CurrencyDollarIcon />}
            />
            <StatCard
              title="شکایات کل"
              value={totalComplaints.toLocaleString("fa-IR")}
              variant="danger"
              icon={<ClipboardDocumentListIcon />}
            />
            <StatCard
              title="شکایات در انتظار"
              value={pendingComplaints.toLocaleString("fa-IR")}
              variant="warning"
              icon={<ExclamationTriangleIcon />}
            />
          </>
        )}
      </div>

      {/* ── Store Cards ── */}
      {!loading && stores.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-6 bg-primary-50 rounded-3xl mb-6">
            <BuildingStorefrontIcon className="h-16 w-16 text-primary-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">
            هنوز فروشگاهی ثبت نکرده‌اید
          </h3>
          <p className="text-slate-400 mb-8 max-w-sm">
            با ثبت فروشگاه خود در سامانه، می‌توانید قیمت محصولات را مدیریت کنید.
          </p>
          <Link href="/store/register-store">
            <Button
              size="lg"
              leftIcon={<PlusCircleIcon className="h-5 w-5" />}
            >
              ثبت اولین فروشگاه
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {stores.map((store) => {
            const cfg     = STATUS_CONFIG[store.status] ?? STATUS_CONFIG.pending;
            const license = licenses[store.id];
            const Icon    = cfg.icon;

            return (
              <div
                key={store.id}
                className={cn(
                  "bg-white rounded-2xl border shadow-card overflow-hidden",
                  "hover:shadow-card-hover transition-all duration-200",
                  cfg.border,
                )}
              >
                {/* Top color bar */}
                <div className={cn(
                  "h-1.5",
                  store.status === "active"    && "bg-gradient-to-r from-green-400 to-green-600",
                  store.status === "pending"   && "bg-gradient-to-r from-amber-400 to-amber-600",
                  store.status === "suspended" && "bg-gradient-to-r from-red-400 to-red-600",
                  store.status === "rejected"  && "bg-gradient-to-r from-red-400 to-red-600",
                  store.status === "closed"    && "bg-slate-300",
                )} />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0",
                      cfg.bg,
                    )}>
                      <BuildingStorefrontIcon className={cn(
                        "h-7 w-7",
                        store.status === "active"    && "text-green-600",
                        store.status === "pending"   && "text-amber-600",
                        (store.status === "suspended" || store.status === "rejected") && "text-red-600",
                        store.status === "closed"    && "text-slate-500",
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-800 text-lg leading-tight truncate">
                          {store.name}
                        </h3>
                        <Badge variant={cfg.variant} size="sm" dot>
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        {store.union_name} · {store.city_name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        پروانه: {store.license_number}
                      </p>
                    </div>
                  </div>

                  {/* Rejection reason */}
                  {store.rejection_reason && (
                    <div className="flex items-start gap-2 p-3 bg-red-50
                                    border border-red-200 rounded-xl mb-4">
                      <ShieldExclamationIcon className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{store.rejection_reason}</p>
                    </div>
                  )}

                  {/* License warning */}
                  {license && (license.needs_renewal || license.is_expired) && (
                    <div className={cn(
                      "flex items-center gap-2 p-3 rounded-xl mb-4 text-xs",
                      license.is_expired
                        ? "bg-red-50 border border-red-200 text-red-700"
                        : "bg-amber-50 border border-amber-200 text-amber-700",
                    )}>
                      <DocumentCheckIcon className="h-4 w-4 flex-shrink-0" />
                      {license.is_expired
                        ? `پروانه کسب منقضی شده (${toJalali(license.expire_date)})`
                        : `پروانه کسب ${license.days_until_expiry} روز دیگر منقضی می‌شود`}
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    <div className="p-3 bg-slate-50 rounded-xl text-center">
                      <p className="text-xl font-bold text-slate-800">
                        {store.complaints_count ?? 0}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">کل شکایات</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl text-center">
                      <p className={cn(
                        "text-xl font-bold",
                        (store.pending_complaints_count ?? 0) > 0
                          ? "text-red-600"
                          : "text-slate-800",
                      )}>
                        {store.pending_complaints_count ?? 0}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">در انتظار</p>
                    </div>
                    <div className={cn(
                      "p-3 rounded-xl text-center",
                      store.can_set_price ? "bg-green-50" : "bg-slate-50",
                    )}>
                      {store.can_set_price ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-slate-300 mx-auto" />
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">قیمت‌گذاری</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link href={`/store/my-stores/${store.id}`} className="flex-1">
                      <Button variant="outline" size="sm" fullWidth
                              rightIcon={<ArrowRightIcon className="h-3.5 w-3.5" />}>
                        جزئیات فروشگاه
                      </Button>
                    </Link>
                    {store.can_set_price && (
                      <Link href="/store/pricing">
                        <Button size="sm"
                                leftIcon={<CurrencyDollarIcon className="h-4 w-4" />}>
                          قیمت‌گذاری
                        </Button>
                      </Link>
                    )}
                    <Link href={`/store/my-stores/${store.id}/documents`}>
                      <Button variant="ghost" size="sm"
                              leftIcon={<DocumentCheckIcon className="h-4 w-4" />}>
                        مدارک
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add new store card */}
          <Link
            href="/store/register-store"
            className={cn(
              "flex flex-col items-center justify-center gap-4 p-8",
              "bg-white rounded-2xl border-2 border-dashed border-slate-200",
              "hover:border-primary-400 hover:bg-primary-50/30",
              "transition-all duration-200 cursor-pointer group min-h-[200px]",
            )}
          >
            <div className="p-4 bg-slate-100 rounded-2xl
                             group-hover:bg-primary-100 transition-colors">
              <PlusCircleIcon className="h-8 w-8 text-slate-400
                                          group-hover:text-primary-600 transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-500 group-hover:text-primary-700
                             transition-colors">
                ثبت فروشگاه جدید
              </p>
              <p className="text-xs text-slate-400 mt-1">
                فروشگاه جدید به سامانه اضافه کنید
              </p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}