"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }      from "@/components/layout/PageHeader";
import { Button }          from "@/components/ui/Button";
import { Badge }           from "@/components/ui/Badge";
import { Alert }           from "@/components/ui/Alert";
import { Card }            from "@/components/ui/Card";
import { Spinner }         from "@/components/ui/Spinner";
import apiClient           from "@/services/api.client";
import { ENDPOINTS }       from "@/services/endpoints";
import { parseApiError, extractArray } from "@/utils/error.utils";
import { formatPrice }     from "@/utils/number.utils";
import { getTodayJalali }  from "@/utils/date.utils";
import { CONFIG }          from "@/constants/config";
import toast               from "react-hot-toast";
import { cn }              from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id:            number;
  name:          string;
  unit_symbol:   string;
  category_name: string;
  union:         number;
  union_name:    string;
}

interface TodayPrice {
  product: number;
  price:   number;
  id:      number;
}

interface PriceRow {
  product:        Product;
  todayPrice:     number | null;
  yesterdayPrice: number | null;
  inputValue:     string;
  priceId:        number | null;
  isSaved:        boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcMin(price: number) {
  return Math.ceil(price * CONFIG.MIN_PRICE_RATIO);
}

function getPriceStatus(input: string, yesterday: number | null) {
  const val = Number(input);
  if (!input || isNaN(val) || val <= 0) return "empty";
  if (yesterday && val > yesterday * 1.5)  return "high";
  if (yesterday && val < yesterday * 0.5)  return "low";
  return "ok";
}

// ─────────────────────────────────────────────────────────────────────────────
export default function UnionOfficialPricingPage() {
  const [rows,     setRows]     = useState<PriceRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [unionId,  setUnionId]  = useState<number | null>(null);
  const today = getTodayJalali();

  // ── بارگذاری اولیه: محصولات اتحادیه + قیمت‌های امروز ───────────────────
useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // ۱. گرفتن union_id
        let currentUnionId: number | null = null;

        const storeUser = (await import("@/store")).useAuthStore.getState().user;
        if (storeUser?.union_id) {
          currentUnionId = storeUser.union_id;
        }

        if (!currentUnionId) {
          const meRes = await apiClient.get(ENDPOINTS.AUTH.ME);
          const meData = meRes.data?.data ?? meRes.data;
          currentUnionId = meData?.union_id ?? null;
          if (meData) {
            (await import("@/store")).useAuthStore.getState().setUser(meData);
          }
        }

        // ۲. fallback از لیست اتحادیه‌ها
        if (!currentUnionId) {
          try {
            const { ENDPOINTS: EP } = await import("@/services/endpoints");
            const unionsRes = await apiClient.get(EP.ORGANIZATIONS.UNIONS, {
              params: { page_size: 1 },
            });
            const unionsData = unionsRes.data?.data ?? unionsRes.data;
            const unionsList = extractArray<{ id: number }>(unionsData);
            if (unionsList.length > 0) currentUnionId = unionsList[0].id;
          } catch {
            // silent
          }
        }

        setUnionId(currentUnionId);

        if (!currentUnionId) {
          toast.error("اطلاعات اتحادیه شما یافت نشد");
          setLoading(false);
          return;
        }

        // ۳. بارگذاری موازی محصولات + قیمت‌های امروز
        const [productsRes, todayRes] = await Promise.all([
          apiClient.get(ENDPOINTS.PRODUCTS.LIST, {
            params: { union: currentUnionId, page_size: 200 },
          }),
          apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICES_TODAY, {
            params: { union: currentUnionId },
          }),
        ]);

        const prodData = productsRes.data?.data ?? productsRes.data;
        const products = extractArray<Product>(prodData);

        const todayData = todayRes.data?.data ?? todayRes.data;
        const todayPrices = extractArray<TodayPrice>(todayData);

        const todayMap = new Map<number, TodayPrice>(
          todayPrices.map((tp) => [tp.product, tp])
        );

        setRows(
          products.map((p) => {
            const tp = todayMap.get(p.id);
            return {
              product: p,
              todayPrice: tp?.price ?? null,
              yesterdayPrice: null,
              inputValue: tp ? String(tp.price) : "",
              priceId: tp?.id ?? null,
              isSaved: !!tp,
            };
          })
        );
      } catch (err) {
        toast.error(parseApiError(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── ثبت قیمت تکی ────────────────────────────────────────────────────────
  const saveSingle = async (row: PriceRow) => {
    const price = Number(row.inputValue);
    if (!price || price <= 0) {
      toast.error("قیمت معتبر وارد کنید");
      return;
    }
    if (!unionId) {
      toast.error("اطلاعات اتحادیه یافت نشد");
      return;
    }
    setSavingId(row.product.id);
    try {
      await apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICES, {
        union_id:       unionId,
        product_id:     row.product.id,
        price,
        effective_date: today,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.product.id === row.product.id
            ? { ...r, isSaved: true, todayPrice: price }
            : r,
        ),
      );
      toast.success(`قیمت ${row.product.name} ثبت شد`);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSavingId(null);
    }
  };

  // ── ثبت همه قیمت‌ها ─────────────────────────────────────────────────────
  const saveAll = async () => {
    const toSave = rows.filter(
      (r) => r.inputValue && Number(r.inputValue) > 0 && !r.isSaved,
    );
    if (toSave.length === 0) {
      toast.error("قیمتی برای ثبت وجود ندارد");
      return;
    }
    if (!unionId) {
      toast.error("اطلاعات اتحادیه یافت نشد");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICES_BULK, {
        union_id:       unionId,
        effective_date: today,
        prices: toSave.map((r) => ({
          product_id: r.product.id,
          price:      Number(r.inputValue),
        })),
      });
      setRows((prev) =>
        prev.map((r) => {
          const saved = toSave.find((s) => s.product.id === r.product.id);
          return saved
            ? { ...r, isSaved: true, todayPrice: Number(r.inputValue) }
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

  const updateInput = (productId: number, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.product.id === productId
          ? { ...r, inputValue: value, isSaved: false }
          : r,
      ),
    );
  };

  // ── آمار ─────────────────────────────────────────────────────────────────
  const savedCount   = rows.filter((r) => r.isSaved).length;
  const pendingCount = rows.filter((r) => r.inputValue && !r.isSaved).length;
  const emptyCount   = rows.filter((r) => !r.inputValue && !r.isSaved).length;
  const progress     =
    rows.length > 0 ? Math.round((savedCount / rows.length) * 100) : 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="ثبت قیمت مصوب"
        subtitle={`تاریخ: ${today}`}
        breadcrumbs={[
          { label: "اتحادیه" },
          { label: "قیمت‌گذاری" },
          { label: "ثبت قیمت مصوب" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setRows((prev) =>
                  prev.map((r) => ({ ...r, inputValue: "", isSaved: false })),
                )
              }
            >
              پاک کردن همه
            </Button>
            <Button
              onClick={saveAll}
              isLoading={saving}
              leftIcon={<CheckCircleIcon className="h-4 w-4" />}
              disabled={pendingCount === 0}
            >
              ثبت همه ({pendingCount})
            </Button>
          </div>
        }
      />

      {/* Progress */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-slate-700">
              پیشرفت قیمت‌گذاری امروز
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {savedCount} از {rows.length} محصول قیمت‌گذاری شده
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircleIcon className="h-4 w-4" />
              ثبت شده: {savedCount}
            </span>
            {emptyCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600">
                <ExclamationTriangleIcon className="h-4 w-4" />
                بدون قیمت: {emptyCount}
              </span>
            )}
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-2.5 rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background:
                progress === 100
                  ? "linear-gradient(90deg,#1A7A4A,#22A160)"
                  : "linear-gradient(90deg,#1B3A6B,#2E6DB4)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-400">۰٪</span>
          <span className="text-xs font-bold text-primary-700">{progress}٪</span>
          <span className="text-xs text-slate-400">۱۰۰٪</span>
        </div>
      </Card>

      <Alert
        variant="info"
        message={`فروشگاه‌ها مجاز هستند محصولات را از ${Math.round(CONFIG.MIN_PRICE_RATIO * 100)}٪ قیمت مصوب تا سقف قیمت مصوب به فروش برسانند.`}
        icon
      />

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="xl" />
        </div>
      ) : rows.length === 0 ? (
        <Card padding="lg">
          <p className="text-center text-slate-400">
            محصولی برای قیمت‌گذاری در اتحادیه شما یافت نشد
          </p>
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  {[
                    "محصول",
                    "دسته‌بندی",
                    "واحد",
                    "قیمت دیروز",
                    "قیمت مصوب امروز",
                    `حداقل مجاز (${Math.round(CONFIG.MIN_PRICE_RATIO * 100)}٪)`,
                    "وضعیت",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const inputNum = Number(row.inputValue);
                  const minPrice =
                    row.inputValue && inputNum > 0
                      ? calcMin(inputNum)
                      : null;
                  const status   = getPriceStatus(
                    row.inputValue,
                    row.yesterdayPrice,
                  );
                  const isSaving = savingId === row.product.id;

                  return (
                    <tr
                      key={row.product.id}
                      className={cn(
                        "border-b border-slate-50 transition-colors",
                        row.isSaved
                          ? "bg-green-50/40 hover:bg-green-50/60"
                          : "hover:bg-slate-50/60",
                      )}
                    >
                      {/* نام محصول */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                              row.isSaved
                                ? "bg-green-100"
                                : "bg-primary-50",
                            )}
                          >
                            <CurrencyDollarIcon
                              className={cn(
                                "h-4 w-4",
                                row.isSaved
                                  ? "text-green-600"
                                  : "text-primary-600",
                              )}
                            />
                          </div>
                          <span className="font-semibold text-slate-800">
                            {row.product.name}
                          </span>
                        </div>
                      </td>

                      {/* دسته‌بندی */}
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {row.product.category_name}
                      </td>

                      {/* واحد */}
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                          {row.product.unit_symbol}
                        </span>
                      </td>

                      {/* قیمت دیروز */}
                      <td className="px-5 py-4 text-slate-400 text-sm">
                        {row.yesterdayPrice ? (
                          formatPrice(row.yesterdayPrice) + " ریال"
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* ورودی قیمت */}
                      <td className="px-5 py-4">
                        {row.isSaved ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-700">
                              {formatPrice(row.todayPrice!)} ریال
                            </span>
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            <button
                              onClick={() =>
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.product.id === row.product.id
                                      ? { ...r, isSaved: false }
                                      : r,
                                  ),
                                )
                              }
                              className="text-xs text-slate-400 hover:text-primary-600 underline transition-colors"
                            >
                              ویرایش
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={row.inputValue}
                              onChange={(e) =>
                                updateInput(row.product.id, e.target.value)
                              }
                              placeholder="قیمت به ریال"
                              dir="ltr"
                              className={cn(
                                "w-36 px-3 py-2 text-sm border rounded-xl",
                                "focus:outline-none focus:ring-2 transition-all",
                                status === "high"
                                  ? "border-amber-400 focus:ring-amber-100 bg-amber-50"
                                  : status === "low"
                                  ? "border-orange-400 focus:ring-orange-100 bg-orange-50"
                                  : "border-slate-300 focus:ring-primary-100 focus:border-primary-500",
                              )}
                            />
                            <button
                              onClick={() => saveSingle(row)}
                              disabled={!row.inputValue || isSaving}
                              className={cn(
                                "px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                                "disabled:opacity-40 disabled:cursor-not-allowed",
                                "bg-primary-600 text-white hover:bg-primary-700",
                              )}
                            >
                              {isSaving ? "..." : "ثبت"}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* حداقل مجاز */}
                      <td className="px-5 py-4">
                        {minPrice ? (
                          <span className="text-slate-500 text-sm font-mono">
                            {formatPrice(minPrice)} ریال
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* وضعیت */}
                      <td className="px-5 py-4">
                        {row.isSaved ? (
                          <Badge variant="success" dot size="sm">
                            ثبت شده
                          </Badge>
                        ) : row.inputValue ? (
                          status === "high" ? (
                            <Badge variant="warning" size="sm">
                              افزایش زیاد
                            </Badge>
                          ) : (
                            <Badge variant="info" size="sm">
                              در انتظار ثبت
                            </Badge>
                          )
                        ) : (
                          <Badge variant="default" size="sm">
                            ثبت نشده
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
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {savedCount} محصول ثبت شده از {rows.length} محصول اتحادیه
            </p>
            <Button
              onClick={saveAll}
              isLoading={saving}
              disabled={pendingCount === 0}
              leftIcon={<CheckCircleIcon className="h-4 w-4" />}
            >
              ثبت {pendingCount} قیمت باقی‌مانده
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}