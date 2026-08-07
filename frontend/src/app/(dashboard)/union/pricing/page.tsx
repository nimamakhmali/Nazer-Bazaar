"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  PencilSquareIcon,
  XCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import {
  parseApiError,
  extractArray,
  extractCount,
} from "@/utils/error.utils";
import { formatPrice } from "@/utils/number.utils";
import { toJalali, getTodayJalali } from "@/utils/date.utils";
import { CONFIG } from "@/constants/config";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OfficialPrice {
  id: number;
  product: number;
  product_name: string;
  product_unit_symbol: string;
  product_unit_name: string;
  union: number;
  union_name: string;
  price: number;
  price_formatted: string;
  min_allowed_price: number;
  max_allowed_price: number;
  min_price_formatted: string;
  effective_date: string;
  expire_date: string | null;
  description: string;
  is_today: boolean;
  is_expired: boolean;
  is_active: boolean;
  created_by_name: string;
  created_at: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────
const editSchema = z.object({
  price: z
    .number({ required_error: "قیمت الزامی است" })
    .positive("قیمت باید مثبت باشد")
    .min(1, "قیمت باید حداقل ۱ ریال باشد"),
  expire_date: z.string().optional(),
  description: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
const FILTERS = [
  { value: "", label: "همه" },
  { value: "today", label: "امروز" },
  { value: "active", label: "فعال" },
  { value: "expired", label: "منقضی" },
] as const;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UnionPricingPage() {
  const [prices, setPrices] = useState<OfficialPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [unionId, setUnionId] = useState<number | null>(null);

  // Modal states
  const [editModal, setEditModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<OfficialPrice | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const today = getTodayJalali();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  });

  const watchedPrice = watch("price");

  // ── بارگذاری union_id ────────────────────────────────────────────────────────
  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await apiClient.get(ENDPOINTS.AUTH.ME);
        const data = res.data?.data ?? res.data;
        setUnionId(data?.union_id ?? null);
      } catch {
        // silent
      }
    };
    loadMe();
  }, []);

  // ── بارگذاری قیمت‌های مصوب ──────────────────────────────────────────────────
  const fetchPrices = useCallback(async () => {
    if (!unionId) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        union: unionId,
        page,
        page_size: 15,
      };
      if (search) params.search = search;
      if (filter === "today") {
        // فقط امروز
        const todayDate = new Date().toISOString().split("T")[0];
        params.date = todayDate;
      }

      const endpoint =
        filter === "today"
          ? ENDPOINTS.PRICING.OFFICIAL_PRICES_TODAY
          : ENDPOINTS.PRICING.OFFICIAL_PRICES;

      const res = await apiClient.get(endpoint, { params });
      const data = res.data?.data ?? res.data;
      let list = extractArray<OfficialPrice>(data);

      // فیلتر client-side برای حالت‌های خاص
      if (filter === "active") {
        list = list.filter((p) => p.is_active && !p.is_expired);
      } else if (filter === "expired") {
        list = list.filter((p) => p.is_expired || !p.is_active);
      }

      setPrices(list);
      const count = extractCount(data, list.length);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 15) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [unionId, page, search, filter]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  // ── باز کردن ویرایش ─────────────────────────────────────────────────────────
  const openEdit = (price: OfficialPrice) => {
    setEditingPrice(price);
    reset({
      price: price.price,
      expire_date: price.expire_date ?? "",
      description: price.description ?? "",
    });
    setEditModal(true);
  };

  // ── ثبت ویرایش ──────────────────────────────────────────────────────────────
  const onEditSubmit = async (data: EditFormData) => {
    if (!editingPrice) return;
    setSubmitting(true);
    try {
      await apiClient.patch(ENDPOINTS.PRICING.OFFICIAL_PRICE(editingPrice.id), {
        price: data.price,
        expire_date: data.expire_date || null,
        description: data.description || "",
      });
      toast.success("قیمت مصوب با موفقیت ویرایش شد");
      setEditModal(false);
      setEditingPrice(null);
      fetchPrices();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── غیرفعال‌سازی ─────────────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!deactivatingId) return;
    setSubmitting(true);
    try {
      await apiClient.post(
        ENDPOINTS.PRICING.OFFICIAL_PRICE_DEACTIVATE(deactivatingId)
      );
      toast.success("قیمت مصوب غیرفعال شد");
      setDeactivateConfirm(false);
      setDeactivatingId(null);
      fetchPrices();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── status badge ─────────────────────────────────────────────────────────────
  const getPriceBadge = (price: OfficialPrice) => {
    if (!price.is_active)
      return <Badge variant="default" size="sm">غیرفعال</Badge>;
    if (price.is_expired)
      return <Badge variant="danger" size="sm">منقضی</Badge>;
    if (price.is_today)
      return (
        <Badge variant="success" dot size="sm">
          امروز
        </Badge>
      );
    return <Badge variant="info" size="sm">فعال</Badge>;
  };

  const minAllowed =
    watchedPrice && watchedPrice > 0
      ? Math.ceil(watchedPrice * CONFIG.MIN_PRICE_RATIO)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="قیمت‌های مصوب"
        subtitle={`مدیریت قیمت‌های مصوب اتحادیه | امروز: ${today}`}
        breadcrumbs={[
          { label: "اتحادیه" },
          { label: "قیمت‌گذاری" },
          { label: "قیمت‌های مصوب" },
        ]}
        actions={
          <Link href="/union/pricing/official">
            <Button leftIcon={<CurrencyDollarIcon className="h-4 w-4" />}>
              ثبت قیمت جدید
            </Button>
          </Link>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="جستجوی محصول..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  filter === f.value
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : prices.length === 0 ? (
          <EmptyState
            title="قیمت مصوبی یافت نشد"
            description="هنوز قیمت مصوبی ثبت نشده یا فیلتر نتیجه‌ای ندارد"
            action={
              <Link href="/union/pricing/official">
                <Button leftIcon={<CurrencyDollarIcon className="h-4 w-4" />}>
                  ثبت اولین قیمت
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-100">
                    {[
                      "محصول",
                      "قیمت مصوب",
                      "حداقل مجاز",
                      "حداکثر مجاز",
                      "تاریخ اعتبار",
                      "تاریخ انقضا",
                      "وضعیت",
                      "ثبت‌کننده",
                      "عملیات",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prices.map((price) => (
                    <tr
                      key={price.id}
                      className={cn(
                        "border-b border-slate-50 hover:bg-slate-50/60 transition-colors",
                        !price.is_active && "opacity-60"
                      )}
                    >
                      {/* محصول */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                            <CurrencyDollarIcon className="h-4 w-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">
                              {price.product_name}
                            </p>
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              {price.product_unit_symbol}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* قیمت مصوب */}
                      <td className="px-4 py-4">
                        <span className="font-bold text-primary-700 text-sm">
                          {formatPrice(price.price)} ریال
                        </span>
                      </td>

                      {/* حداقل مجاز */}
                      <td className="px-4 py-4">
                        <span className="text-green-600 text-sm font-medium">
                          {formatPrice(price.min_allowed_price)} ریال
                        </span>
                      </td>

                      {/* حداکثر مجاز */}
                      <td className="px-4 py-4">
                        <span className="text-slate-500 text-sm">
                          {formatPrice(price.max_allowed_price)} ریال
                        </span>
                      </td>

                      {/* تاریخ اعتبار */}
                      <td className="px-4 py-4 text-slate-600 text-sm">
                        {toJalali(price.effective_date)}
                      </td>

                      {/* تاریخ انقضا */}
                      <td className="px-4 py-4">
                        {price.expire_date ? (
                          <span
                            className={cn(
                              "text-sm",
                              price.is_expired
                                ? "text-red-500 font-medium"
                                : "text-slate-500"
                            )}
                          >
                            {toJalali(price.expire_date)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>

                      {/* وضعیت */}
                      <td className="px-4 py-4">{getPriceBadge(price)}</td>

                      {/* ثبت‌کننده */}
                      <td className="px-4 py-4 text-slate-500 text-xs">
                        {price.created_by_name}
                      </td>

                      {/* عملیات */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          {price.is_active && !price.is_expired && (
                            <>
                              <button
                                onClick={() => openEdit(price)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                title="ویرایش"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeactivatingId(price.id);
                                  setDeactivateConfirm(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="غیرفعال کردن"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {totalCount.toLocaleString("fa-IR")} قیمت مصوب
                </p>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => {
          setEditModal(false);
          setEditingPrice(null);
        }}
        title={`ویرایش قیمت مصوب — ${editingPrice?.product_name ?? ""}`}
        size="md"
      >
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
          {/* قیمت فعلی */}
          {editingPrice && (
            <div className="p-3 bg-slate-50 rounded-xl text-sm">
              <p className="text-slate-500 text-xs mb-1">قیمت فعلی</p>
              <p className="font-bold text-primary-700">
                {formatPrice(editingPrice.price)} ریال
              </p>
            </div>
          )}

          {/* قیمت جدید */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              قیمت جدید (ریال) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="قیمت به ریال"
              dir="ltr"
              {...register("price", { valueAsNumber: true })}
              className={cn(
                "w-full border rounded-xl px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2",
                errors.price
                  ? "border-red-400 focus:ring-red-100"
                  : "border-slate-300 focus:ring-primary-100 focus:border-primary-500"
              )}
            />
            {errors.price && (
              <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>
            )}
            {minAllowed && (
              <p className="mt-1.5 text-xs text-green-600">
                حداقل قیمت مجاز فروشگاه‌ها:{" "}
                <strong>{formatPrice(minAllowed)} ریال</strong>
                {" "}(۸۰٪ قیمت مصوب)
              </p>
            )}
          </div>

          {/* تاریخ انقضا */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              تاریخ انقضا (اختیاری)
            </label>
            <input
              type="date"
              {...register("expire_date")}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            />
          </div>

          {/* توضیحات */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              توضیحات
            </label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="توضیحات تکمیلی..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              isLoading={submitting}
              className="flex-1"
              leftIcon={<CheckCircleIcon className="h-4 w-4" />}
            >
              ذخیره تغییرات
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditModal(false);
                setEditingPrice(null);
              }}
              className="flex-1"
            >
              انصراف
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        isOpen={deactivateConfirm}
        onClose={() => {
          setDeactivateConfirm(false);
          setDeactivatingId(null);
        }}
        onConfirm={handleDeactivate}
        title="غیرفعال کردن قیمت مصوب"
        message="آیا از غیرفعال کردن این قیمت مصوب اطمینان دارید؟ فروشگاه‌ها دیگر نمی‌توانند بر اساس این قیمت، قیمت‌گذاری کنند."
        confirmText="غیرفعال کن"
        cancelText="انصراف"
        isLoading={submitting}
        variant="danger"
      />
    </div>
  );
}