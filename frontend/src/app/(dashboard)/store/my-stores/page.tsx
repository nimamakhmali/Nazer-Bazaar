"use client";

import React, { useState, useEffect } from "react";
import {
  BuildingStorefrontIcon, PlusCircleIcon,
  ArrowRightIcon, CurrencyDollarIcon,
  DocumentCheckIcon, ClockIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button }     from "@/components/ui/Button";
import { Badge }      from "@/components/ui/Badge";
import { Spinner }    from "@/components/ui/Spinner";
import apiClient      from "@/services/api.client";
import { ENDPOINTS }  from "@/services/endpoints";
import { extractArray } from "@/utils/error.utils";
import { toJalali }   from "@/utils/date.utils";
import { cn }         from "@/lib/cn";
import Link           from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface MyStore {
  id:               number;
  name:             string;
  union_name:       string;
  city_name:        string;
  province_name:    string;
  license_number:   string;
  status:           string;
  status_display:   string;
  is_active:        boolean;
  has_location:     boolean;
  can_set_price:    boolean;
  complaints_count: number;
  created_at:       string;
}

const STATUS_CFG: Record<string, {
  variant: "success" | "warning" | "danger" | "default";
  bar:     string;
}> = {
  active:    { variant: "success", bar: "bg-green-500" },
  pending:   { variant: "warning", bar: "bg-amber-500" },
  suspended: { variant: "danger",  bar: "bg-red-500"   },
  rejected:  { variant: "danger",  bar: "bg-red-500"   },
  closed:    { variant: "default", bar: "bg-slate-400" },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function MyStoresPage() {
  const [stores,  setStores]  = useState<MyStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(ENDPOINTS.STORES.MY_STORES)
      .then((r) => {
        const d = r.data?.data ?? r.data;
        setStores(extractArray<MyStore>(d));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="فروشگاه‌های من"
        subtitle={`${stores.length} فروشگاه ثبت شده`}
        breadcrumbs={[
          { label: "فروشگاه", href: "/store/overview" },
          { label: "فروشگاه‌های من" },
        ]}
        actions={
          <Link href="/store/register-store">
            <Button leftIcon={<PlusCircleIcon className="h-4 w-4" />}>
              فروشگاه جدید
            </Button>
          </Link>
        }
      />

      {stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-8 bg-primary-50 rounded-3xl mb-6">
            <BuildingStorefrontIcon className="h-20 w-20 text-primary-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-700 mb-3">
            هنوز فروشگاهی ندارید
          </h3>
          <p className="text-slate-400 mb-8 max-w-md leading-relaxed">
            فروشگاه خود را ثبت کنید و پس از تایید توسط اتاق اصناف، می‌توانید قیمت‌گذاری را شروع کنید.
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {stores.map((store) => {
            const cfg = STATUS_CFG[store.status] ?? STATUS_CFG.pending;
            return (
              <div
                key={store.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-card
                           overflow-hidden hover:shadow-card-hover transition-all duration-200"
              >
                {/* Status bar */}
                <div className={cn("h-1.5", cfg.bar)} />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary-50
                                     flex items-center justify-center flex-shrink-0">
                      <BuildingStorefrontIcon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 truncate text-lg">
                        {store.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {store.union_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {store.city_name}، {store.province_name}
                      </p>
                    </div>
                    <Badge variant={cfg.variant} dot size="sm">
                      {store.status_display}
                    </Badge>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">شماره پروانه</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {store.license_number}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">تاریخ ثبت</span>
                      <span className="text-slate-600">{toJalali(store.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">شکایات</span>
                      <span className={cn(
                        "font-semibold",
                        store.complaints_count > 0 ? "text-red-600" : "text-slate-600",
                      )}>
                        {store.complaints_count} مورد
                      </span>
                    </div>
                  </div>

                  {/* Status indicators */}
                  <div className="flex items-center gap-1.5 mb-4">
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium",
                      store.can_set_price
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500",
                    )}>
                      <CurrencyDollarIcon className="h-3 w-3" />
                      قیمت‌گذاری
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg
                                     text-[10px] font-medium bg-slate-100 text-slate-500">
                      <ClockIcon className="h-3 w-3" />
                      {store.status_display}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link href={`/store/my-stores/${store.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        rightIcon={<ArrowRightIcon className="h-3.5 w-3.5" />}
                      >
                        مشاهده
                      </Button>
                    </Link>
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

          {/* Add card */}
          <Link
            href="/store/register-store"
            className={cn(
              "flex flex-col items-center justify-center gap-4 p-8 min-h-[280px]",
              "bg-white rounded-2xl border-2 border-dashed border-slate-200",
              "hover:border-primary-400 hover:bg-primary-50/30",
              "transition-all duration-200 cursor-pointer group",
            )}
          >
            <div className="p-4 bg-slate-100 rounded-2xl
                             group-hover:bg-primary-100 transition-colors">
              <PlusCircleIcon className="h-8 w-8 text-slate-400
                                          group-hover:text-primary-600 transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-500
                             group-hover:text-primary-700 transition-colors">
                ثبت فروشگاه جدید
              </p>
              <p className="text-xs text-slate-400 mt-1">
                فروشگاه جدید اضافه کنید
              </p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}