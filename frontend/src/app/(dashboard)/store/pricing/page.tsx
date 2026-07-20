"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button }     from "@/components/ui/Button";
import { Alert }      from "@/components/ui/Alert";
import { Badge }      from "@/components/ui/Badge";
import { Card }       from "@/components/ui/Card";
import { Spinner }    from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import apiClient      from "@/services/api.client";
import { ENDPOINTS }  from "@/services/endpoints";
import { parseApiError, extractArray } from "@/utils/error.utils";
import { formatPrice } from "@/utils/number.utils";
import { getTodayJalali } from "@/utils/date.utils";
import { CONFIG }     from "@/constants/config";
import toast          from "react-hot-toast";
import { cn }         from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
interface MyStore {
  id:           number;
  name:         string;
  union_name:   string;
  status:       string;
  can_set_price:boolean;
}

interface OfficialPrice {
  id:                  number;
  product:             number;
  product_name:        string;
  product_unit_symbol: string;
  price:               number;
  min_allowed_price:   number;
}

interface PriceRow {
  officialPrice: OfficialPrice;
  inputValue:    string;
  isSaved:       boolean;
  savedPrice:    number | null;
}

type PriceStatus = "empty" | "valid" | "overpriced" | "underpriced";

// ─────────────────────────────────────────────────────────────────────────────
function getPriceStatus(input: string, official: OfficialPrice): PriceStatus {
  const val = Number(input);
  if (!input || isNaN(val) || val <= 0) return "empty";
  if (val > official.price) return "overpriced";
  if (val < official.min_allowed_price) return "underpriced";
  return "valid";
}

const STATUS_STYLE: Record<PriceStatus, {
  border:  string;
  bg:      string;
  ring:    string;
  badge:   "success" | "danger" | "warning" | "default";
  label:   string;
  icon:    React.ComponentType<{ className?: string }>;
}> = {
  empty:       {
    border: "border-slate-300",      bg: "",          ring: "focus:ring-primary-100",
    badge: "default",  label: "وارد نشده",
    icon:  InformationCircleIcon,
  },
  valid:       {
    border: "border-green-400",      bg: "bg-green-50", ring: "focus:ring-green-100",
    badge: "success", label: "✓ مجاز",
    icon:  CheckCircleIcon,
  },
  overpriced:  {
    border: "border-red-400",        bg: "bg-red-50",   ring: "focus:ring-red-100",
    badge: "danger",  label: "✗ گران‌فروشی",
    icon:  XCircleIcon,
  },
  underpriced: {
    border: "border-amber-400",      bg: "bg-amber-50", ring: "focus:ring-amber-100",
    badge: "warning", label: "⚠ زیر حداقل",
    icon:  ExclamationTriangleIcon,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function StorePricingPage() {
  const [stores,       setStores]       = useState<MyStore[]>([]);
  const [selectedStore,setSelectedStore]= useState<MyStore | null>(null);
  const [rows,         setRows]         = useState<PriceRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingPrices,setLoadingPrices]= useState(false);
  const [saving,       setSaving]       = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const today = getTodayJalali();

  // ── load my stores ─────────────────────────────────────────────────────────
  useEffect(() => {
    apiClient.get(ENDPOINTS.STORES.MY_STORES)
      .then((r) => {
        const d = r.data?.data ?? r.data;
        const list = extractArray<MyStore>(d).filter((s) => s.status === "active");
        setStores(list);
        if (list.length === 1) setSelectedStore(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── load official prices for selected store ────────────────────────────────
  const loadPrices = useCallback(async (store: MyStore) => {
    if (!store.can_set_price) return;
    setLoadingPrices(true);
    setRows([]);
    try {
      const res  = await apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICES_TODAY, {
        params: { page_size: 200 },
      });
      const data = res.data?.data ?? res.data;
      const prices = extractArray<OfficialPrice>(data);
      setRows(
        prices.map((op) => ({
          officialPrice: op,
          inputValue:    "",
          isSaved:       false,
          savedPrice:    null,
        })),
      );
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setLoadingPrices(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStore) loadPrices(selectedStore);
  }, [selectedStore, loadPrices]);

  // ── update input ──────────────────────────────────────────────────────────
  const updateInput = (productId: number, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.officialPrice.product === productId
          ? { ...r, inputValue: value, isSaved: false }
          : r,
      ),
    );
  };

  // ── validation summary ─────────────────────────────────────────────────────
  const hasOverpriced = rows.some(
    (r) => r.inputValue && getPriceStatus(r.inputValue, r.officialPrice) === "overpriced",
  );
  const readyCount = rows.filter(
    (r) => r.inputValue && !r.isSaved &&
           getPriceStatus(r.inputValue, r.officialPrice) !== "overpriced",
  ).length;
  const savedCount = rows.filter((r) => r.isSaved).length;
  const progress   = rows.length > 0
    ? Math.round((savedCount / rows.length) * 100)
    : 0;

  // ── bulk submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedStore) return;
    const toSave = rows.filter(
      (r) =>
        r.inputValue &&
        !r.isSaved &&
        getPriceStatus(r.inputValue, r.officialPrice) !== "overpriced",
    );
    if (toSave.length === 0) {
      toast.error("قیمت معتبری برای ثبت وجود ندارد");
      return;
    }
    setSaving(true);
    setShowConfirm(false);
    try {
      await apiClient.post(ENDPOINTS.PRICING.STORE_PRICES_BULK, {
        store_id:   selectedStore.id,
        price_date: today,
        prices: toSave.map((r) => ({
          product_id: r.officialPrice.product,
          price:      Number(r.inputValue),
        })),
      });
      setRows((prev) =>
        prev.map((r) => {
          const s = toSave.find(
            (t) => t.officialPrice.product === r.officialPrice.product,
          );
          return s
            ? { ...r, isSaved: true, savedPrice: Number(r.inputValue) }
            : r;
        }),
      );
      toast.success(`${toSave.length} قیمت با موفقیت ثبت شد`);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="xl" />
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex p-6 bg-slate-100 rounded-3xl mb-6">
          <BuildingStorefrontIcon className="h-16 w-16 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-700 mb-2">
          فروشگاه فعالی ندارید
        </h3>
        <p className="text-slate-400">
          برای قیمت‌گذاری باید یک فروشگاه فعال داشته باشید
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="قیمت‌گذاری فروشگاه"
        subtitle={`تاریخ: ${today}`}
        breadcrumbs={[
          { label: "فروشگاه", href: "/store/overview" },
          { label: "قیمت‌گذاری" },
        ]}
      />

      {/* Store selector (if multiple stores) */}
      {stores.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stores.map((store) => (
            <button
              key={store.id}
              onClick={() => setSelectedStore(store)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-right",
                selectedStore?.id === store.id
                  ? "border-primary-500 bg-primary-50 shadow-md"
                  : "border-slate-200 bg-white hover:border-primary-300",
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                selectedStore?.id === store.id ? "bg-primary-100" : "bg-slate-100",
              )}>
                <BuildingStorefrontIcon className={cn(
                  "h-5 w-5",
                  selectedStore?.id === store.id ? "text-primary-600" : "text-slate-400",
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-bold text-sm truncate",
                  selectedStore?.id === store.id ? "text-primary-800" : "text-slate-700",
                )}>
                  {store.name}
                </p>
                <p className="text-xs text-slate-400 truncate">{store.union_name}</p>
              </div>
              {selectedStore?.id === store.id && (
                <CheckCircleIcon className="h-5 w-5 text-primary-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected store not eligible */}
      {selectedStore && !selectedStore.can_set_price && (
        <Alert
          variant="error"
          title="عدم دسترسی به قیمت‌گذاری"
          message="این فروشگاه در حال حاضر مجاز به قیمت‌گذاری نیست. وضعیت فروشگاه را بررسی کنید."
          icon
        />
      )}

      {selectedStore && selectedStore.can_set_price && (
        <>
          {/* Progress + rules */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Progress */}
            <Card padding="md" className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-slate-700">پیشرفت قیمت‌گذاری</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {savedCount} از {rows.length} محصول
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {hasOverpriced && (
                    <Badge variant="danger" size="sm">
                      <XCircleIcon className="h-3 w-3" />
                      گران‌فروشی شناسایی شد
                    </Badge>
                  )}
                  <Badge
                    variant={progress === 100 ? "success" : "info"}
                    size="md"
                  >
                    {progress}٪
                  </Badge>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background:
                      progress === 100
                        ? "linear-gradient(90deg,#1A7A4A,#22A160)"
                        : "linear-gradient(90deg,#1B3A6B,#2E6DB4)",
                  }}
                />
              </div>
            </Card>

            {/* Rules */}
            <Card padding="md" className="bg-primary-700 border-primary-600">
              <p className="text-xs font-bold text-primary-200 uppercase tracking-wider mb-3">
                قوانین قیمت‌گذاری
              </p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-primary-100 leading-relaxed">
                    قیمت باید حداکثر برابر قیمت مصوب باشد
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-primary-100 leading-relaxed">
                    قیمت نباید کمتر از {Math.round(CONFIG.MIN_PRICE_RATIO * 100)}٪ قیمت مصوب باشد
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <XCircleIcon className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-primary-100 leading-relaxed">
                    گران‌فروشی منجر به شکایت و تعلیق می‌شود
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Overpriced warning */}
          {hasOverpriced && (
            <Alert
              variant="error"
              title="هشدار گران‌فروشی"
              message="قیمت برخی محصولات از حد مجاز بیشتر است. این موارد ثبت نخواهند شد."
              icon
            />
          )}

          {/* Pricing table */}
          {loadingPrices ? (
            <div className="flex items-center justify-center py-20 bg-white
                            rounded-2xl border border-slate-100">
              <div className="text-center space-y-3">
                <Spinner size="lg" />
                <p className="text-sm text-slate-400">در حال بارگذاری قیمت‌ها...</p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-12 text-center">
              <CurrencyDollarIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                هیچ قیمت مصوبی برای امروز ثبت نشده است
              </p>
              <p className="text-xs text-slate-400 mt-1">
                رئیس اتحادیه هنوز قیمت‌های امروز را ثبت نکرده است
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100
                            shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{
                      background: "linear-gradient(135deg,#1B3A6B,#2E6DB4)",
                    }}>
                      {[
                        "محصول", "قیمت مصوب (ریال)",
                        "محدوده مجاز (ریال)", "قیمت من (ریال)",
                        "وضعیت",
                      ].map((h) => (
                        <th key={h}
                            className="px-5 py-4 text-right text-xs font-bold
                                       text-white/90 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => {
                      const status  = getPriceStatus(row.inputValue, row.officialPrice);
                      const style   = STATUS_STYLE[status];
                      const Icon    = style.icon;
                      const inputVal = Number(row.inputValue);
                      const overAmt  = status === "overpriced"
                        ? inputVal - row.officialPrice.price : 0;
                      const underAmt = status === "underpriced"
                        ? row.officialPrice.min_allowed_price - inputVal : 0;

                      return (
                        <tr
                          key={row.officialPrice.product}
                          className={cn(
                            "border-b border-slate-50 transition-all duration-200",
                            row.isSaved
                              ? "bg-green-50/50"
                              : status === "overpriced"
                              ? "bg-red-50/40"
                              : status === "underpriced"
                              ? "bg-amber-50/40"
                              : "hover:bg-slate-50/60",
                          )}
                        >
                          {/* Product */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                                row.isSaved ? "bg-green-100" : "bg-primary-50",
                              )}>
                                <CurrencyDollarIcon className={cn(
                                  "h-4 w-4",
                                  row.isSaved ? "text-green-600" : "text-primary-600",
                                )} />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 leading-tight">
                                  {row.officialPrice.product_name}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {row.officialPrice.product_unit_symbol}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Official price */}
                          <td className="px-5 py-4">
                            <span className="font-bold text-primary-700">
                              {formatPrice(row.officialPrice.price)}
                            </span>
                          </td>

                          {/* Allowed range */}
                          <td className="px-5 py-4">
                            <div className="space-y-0.5">
                              <p className="text-xs text-slate-500">
                                از:{" "}
                                <span className="font-semibold text-slate-700">
                                  {formatPrice(row.officialPrice.min_allowed_price)}
                                </span>
                              </p>
                              <p className="text-xs text-slate-500">
                                تا:{" "}
                                <span className="font-semibold text-green-700">
                                  {formatPrice(row.officialPrice.price)}
                                </span>
                              </p>
                            </div>
                          </td>

                          {/* Input */}
                          <td className="px-5 py-4">
                            {row.isSaved ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-green-700">
                                  {formatPrice(row.savedPrice!)}
                                </span>
                                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                <button
                                  onClick={() =>
                                    setRows((p) =>
                                      p.map((r) =>
                                        r.officialPrice.product === row.officialPrice.product
                                          ? { ...r, isSaved: false, inputValue: String(r.savedPrice ?? "") }
                                          : r,
                                      ),
                                    )
                                  }
                                  className="text-xs text-primary-500 hover:text-primary-700
                                             underline transition-colors"
                                >
                                  ویرایش
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="relative inline-flex items-center">
                                  <input
                                    type="number"
                                    value={row.inputValue}
                                    onChange={(e) =>
                                      updateInput(row.officialPrice.product, e.target.value)
                                    }
                                    placeholder="قیمت..."
                                    dir="ltr"
                                    className={cn(
                                      "w-36 px-3 py-2 text-sm border-2 rounded-xl",
                                      "focus:outline-none focus:ring-2 transition-all",
                                      style.border, style.bg, style.ring,
                                    )}
                                  />
                                  {row.inputValue && (
                                    <Icon className={cn(
                                      "absolute left-2.5 h-4 w-4 pointer-events-none",
                                      status === "valid"       && "text-green-500",
                                      status === "overpriced"  && "text-red-500",
                                      status === "underpriced" && "text-amber-500",
                                    )} />
                                  )}
                                </div>

                                {/* Violation message */}
                                {status === "overpriced" && (
                                  <p className="text-[11px] text-red-600 mt-1 font-medium">
                                    +{formatPrice(overAmt)} بیشتر از حد مجاز
                                  </p>
                                )}
                                {status === "underpriced" && (
                                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                                    {formatPrice(underAmt)} کمتر از حداقل
                                  </p>
                                )}

                                {/* Helper text */}
                                {status === "empty" && (
                                  <p className="text-[11px] text-slate-400 mt-1">
                                    بین {formatPrice(row.officialPrice.min_allowed_price)} تا{" "}
                                    {formatPrice(row.officialPrice.price)}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status badge */}
                          <td className="px-5 py-4">
                            {row.isSaved ? (
                              <Badge variant="success" dot size="sm">ثبت شد</Badge>
                            ) : (
                              <Badge variant={style.badge} size="sm">
                                {style.label}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50
                              flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 space-x-3 space-x-reverse">
                  <span className="text-green-600 font-semibold">✓ ثبت شده: {savedCount}</span>
                  <span>|</span>
                  <span className="text-primary-600 font-semibold">
                    در انتظار: {readyCount}
                  </span>
                  {hasOverpriced && (
                    <>
                      <span>|</span>
                      <span className="text-red-600 font-semibold">
                        گران‌فروش: {rows.filter(
                          (r) =>
                            r.inputValue &&
                            !r.isSaved &&
                            getPriceStatus(r.inputValue, r.officialPrice) === "overpriced",
                        ).length}
                      </span>
                    </>
                  )}
                </div>

                <Button
                  onClick={() => setShowConfirm(true)}
                  isLoading={saving}
                  disabled={readyCount === 0}
                  leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                >
                  ثبت {readyCount} قیمت
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        title="تایید قیمت‌گذاری"
        message={`آیا از ثبت ${readyCount} قیمت برای فروشگاه «${selectedStore?.name}» اطمینان دارید؟`}
        confirmLabel="بله، ثبت کن"
        cancelLabel="بازگشت"
        variant="info"
      />
    </div>
  );
}