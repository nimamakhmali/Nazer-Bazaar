"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  CubeIcon,
  PencilSquareIcon,
  XCircleIcon,
  CheckCircleIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id: number;
  name: string;
  slug: string;
  category_name: string;
  unit_name: string;
  unit_symbol: string;
  brand: string;
  is_active: boolean;
  is_featured: boolean;
  union: number;
  union_name: string;
}

interface OfficialPriceForProduct {
  id: number;
  price: number;
  price_formatted: string;
  min_allowed_price: number;
  max_allowed_price: number;
  min_price_formatted: string;
  effective_date: string;
  expire_date: string | null;
  is_today: boolean;
  is_expired: boolean;
  is_active: boolean;
}

interface ProductWithPrice extends Product {
  todayPrice: OfficialPriceForProduct | null;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const editPriceSchema = z.object({
  price: z
    .number({ required_error: "قیمت الزامی است" })
    .positive("قیمت باید مثبت باشد"),
  expire_date: z.string().optional(),
  description: z.string().optional(),
});
type EditPriceFormData = z.infer<typeof editPriceSchema>;

const addProductSchema = z.object({
  name: z.string().min(2, "نام حداقل ۲ کاراکتر").max(200),
  category_id: z.number({ required_error: "دسته‌بندی الزامی است" }),
  unit_id: z.number({ required_error: "واحد الزامی است" }),
  brand: z.string().optional(),
  description: z.string().optional(),
});
type AddProductFormData = z.infer<typeof addProductSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPriceStatus(p: OfficialPriceForProduct | null) {
  if (!p) return "none";
  if (!p.is_active) return "inactive";
  if (p.is_expired) return "expired";
  if (p.is_today) return "today";
  return "active";
}

const STATUS_BADGE_MAP = {
  none: { variant: "danger" as const, label: "بدون قیمت", dot: true },
  inactive: { variant: "default" as const, label: "غیرفعال", dot: false },
  expired: { variant: "danger" as const, label: "منقضی", dot: false },
  today: { variant: "success" as const, label: "امروز", dot: true },
  active: { variant: "info" as const, label: "فعال", dot: false },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UnionProductsPage() {
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "no_price" | "expired" | "today"
  >("all");
  const [unionId, setUnionId] = useState<number | null>(null);

  const [categories, setCategories] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [units, setUnits] = useState<Array<{ id: number; name: string; symbol: string }>>([]);

  // Edit price modal
  const [editPriceModal, setEditPriceModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithPrice | null>(
    null
  );

  // Add product modal
  const [addProductModal, setAddProductModal] = useState(false);

  // Deactivate confirm
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [deactivatingName, setDeactivatingName] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const today = getTodayJalali();
  const todayISO = new Date().toISOString().split("T")[0];

  const editPriceForm = useForm<EditPriceFormData>({
    resolver: zodResolver(editPriceSchema),
  });
  const addProductForm = useForm<AddProductFormData>({
    resolver: zodResolver(addProductSchema),
  });

  const watchedPrice = editPriceForm.watch("price");
  const minAllowed =
    watchedPrice && watchedPrice > 0
      ? Math.ceil(watchedPrice * CONFIG.MIN_PRICE_RATIO)
      : null;

  // ── بارگذاری اولیه ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await apiClient.get(ENDPOINTS.AUTH.ME);
        const meData = meRes.data?.data ?? meRes.data;
        const uid = meData?.union_id ?? null;
        setUnionId(uid);

        const [catRes, unitRes] = await Promise.allSettled([
          apiClient.get(ENDPOINTS.PRODUCTS.CATEGORIES, {
            params: { page_size: 100 },
          }),
          apiClient.get(ENDPOINTS.PRODUCTS.UNITS),
        ]);

        if (catRes.status === "fulfilled") {
          const cd = catRes.value.data?.data ?? catRes.value.data;
          setCategories(extractArray(cd));
        }
        if (unitRes.status === "fulfilled") {
          const ud = unitRes.value.data?.data ?? unitRes.value.data;
          setUnits(extractArray(ud));
        }
      } catch {
        // silent
      }
    };
    init();
  }, []);

  // ── بارگذاری محصولات + قیمت‌ها ─────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    if (!unionId) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        union: unionId,
        page,
        page_size: 15,
      };
      if (search) params.search = search;

      const [productsRes, todayPricesRes] = await Promise.all([
        apiClient.get(ENDPOINTS.PRODUCTS.LIST, { params }),
        apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICES_TODAY, {
          params: { union: unionId },
        }),
      ]);

      const pd = productsRes.data?.data ?? productsRes.data;
      const productList = extractArray<Product>(pd);

      const tpd = todayPricesRes.data?.data ?? todayPricesRes.data;
      const todayPrices = extractArray<OfficialPriceForProduct & { product: number }>(tpd);
      const priceMap = new Map(todayPrices.map((p) => [p.product, p]));

      let merged: ProductWithPrice[] = productList.map((p) => ({
        ...p,
        todayPrice: priceMap.get(p.id) ?? null,
      }));

      // client-side filter
      if (filter === "no_price") {
        merged = merged.filter((p) => !p.todayPrice || !p.todayPrice.is_active);
      } else if (filter === "expired") {
        merged = merged.filter((p) => p.todayPrice?.is_expired);
      } else if (filter === "today") {
        merged = merged.filter((p) => p.todayPrice?.is_today);
      }

      setProducts(merged);
      const count = extractCount(pd, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 15) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [unionId, page, search, filter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  // ── ویرایش قیمت ──────────────────────────────────────────────────────────────
  const openEditPrice = (product: ProductWithPrice) => {
    setEditingProduct(product);
    editPriceForm.reset({
      price: product.todayPrice?.price ?? undefined,
      expire_date: product.todayPrice?.expire_date ?? "",
      description: "",
    });
    setEditPriceModal(true);
  };

  const onEditPriceSubmit = async (data: EditPriceFormData) => {
    if (!editingProduct || !unionId) return;
    setSubmitting(true);
    try {
      if (editingProduct.todayPrice?.id) {
        // ویرایش قیمت موجود
        await apiClient.patch(
          ENDPOINTS.PRICING.OFFICIAL_PRICE(editingProduct.todayPrice.id),
          {
            price: data.price,
            expire_date: data.expire_date || null,
            description: data.description || "",
          }
        );
      } else {
        // ثبت قیمت جدید
        await apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICES, {
          union_id: unionId,
          product_id: editingProduct.id,
          price: data.price,
          effective_date: todayISO,
          expire_date: data.expire_date || null,
          description: data.description || "",
        });
      }
      toast.success(
        `قیمت مصوب "${editingProduct.name}" با موفقیت ${
          editingProduct.todayPrice ? "ویرایش" : "ثبت"
        } شد`
      );
      setEditPriceModal(false);
      setEditingProduct(null);
      editPriceForm.reset();
      fetchProducts();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── غیرفعال‌سازی محصول ───────────────────────────────────────────────────────
  const handleDeactivateProduct = async () => {
    if (!deactivatingId) return;
    setSubmitting(true);
    try {
      await apiClient.patch(ENDPOINTS.PRODUCTS.DETAIL(deactivatingId), {
        is_active: false,
      });
      toast.success(`محصول "${deactivatingName}" غیرفعال شد`);
      setDeactivateConfirm(false);
      setDeactivatingId(null);
      setDeactivatingName("");
      fetchProducts();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── افزودن محصول جدید ────────────────────────────────────────────────────────
  const onAddProductSubmit = async (data: AddProductFormData) => {
    if (!unionId) return;
    setSubmitting(true);
    try {
      await apiClient.post(ENDPOINTS.PRODUCTS.LIST, {
        name: data.name,
        category_id: data.category_id,
        unit_id: data.unit_id,
        brand: data.brand || "",
        description: data.description || "",
        union_id: unionId,
      });
      toast.success("محصول جدید با موفقیت اضافه شد");
      setAddProductModal(false);
      addProductForm.reset();
      fetchProducts();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const noPriceCount = products.filter((p) => !p.todayPrice?.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت کالاها"
        subtitle={`${totalCount.toLocaleString("fa-IR")} کالا در اتحادیه | امروز: ${today}`}
        breadcrumbs={[{ label: "اتحادیه" }, { label: "کالاها" }]}
        actions={
          <Button
            leftIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setAddProductModal(true)}
          >
            افزودن کالا
          </Button>
        }
      />

      {/* Alert: no price */}
      {noPriceCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{noPriceCount} کالا</strong> امروز قیمت مصوب ندارند. برای
            ثبت قیمت روی دکمه «ثبت قیمت» کلیک کنید.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="جستجوی کالا..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "all", label: "همه" },
              { value: "no_price", label: "بدون قیمت" },
              { value: "today", label: "قیمت‌دار امروز" },
              { value: "expired", label: "منقضی" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as typeof filter)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  filter === f.value
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {f.label}
                {f.value === "no_price" && noPriceCount > 0 && (
                  <span className="mr-1.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 bg-red-500 text-white text-[10px] rounded-full font-bold">
                    {noPriceCount}
                  </span>
                )}
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
        ) : products.length === 0 ? (
          <EmptyState
            title="کالایی یافت نشد"
            action={
              <Button
                leftIcon={<PlusIcon className="h-4 w-4" />}
                onClick={() => setAddProductModal(true)}
              >
                افزودن کالا
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-100">
                    {[
                      "نام کالا",
                      "دسته‌بندی",
                      "واحد",
                      "قیمت مصوب امروز",
                      "حداقل مجاز (۸۰٪)",
                      "حداکثر مجاز",
                      "انقضا قیمت",
                      "وضعیت انقضا",
                      "وضعیت کالا",
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
                  {products.map((product) => {
                    const priceStatus = getPriceStatus(product.todayPrice);
                    const badgeCfg = STATUS_BADGE_MAP[priceStatus];

                    return (
                      <tr
                        key={product.id}
                        className={cn(
                          "border-b border-slate-50 hover:bg-slate-50/60 transition-colors",
                          !product.is_active && "opacity-50"
                        )}
                      >
                        {/* نام */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                priceStatus === "today"
                                  ? "bg-green-100"
                                  : priceStatus === "none"
                                  ? "bg-red-100"
                                  : "bg-primary-50"
                              )}
                            >
                              <CubeIcon
                                className={cn(
                                  "h-4 w-4",
                                  priceStatus === "today"
                                    ? "text-green-600"
                                    : priceStatus === "none"
                                    ? "text-red-500"
                                    : "text-primary-600"
                                )}
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">
                                {product.name}
                              </p>
                              {product.brand && (
                                <p className="text-[10px] text-slate-400">
                                  {product.brand}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* دسته‌بندی */}
                        <td className="px-4 py-4 text-slate-500 text-xs">
                          {product.category_name}
                        </td>

                        {/* واحد */}
                        <td className="px-4 py-4">
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {product.unit_symbol}
                          </span>
                        </td>

                        {/* قیمت مصوب امروز */}
                        <td className="px-4 py-4">
                          {product.todayPrice?.is_active &&
                          !product.todayPrice?.is_expired ? (
                            <span className="font-bold text-primary-700 text-sm">
                              {formatPrice(product.todayPrice.price)} ریال
                            </span>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </td>

                        {/* حداقل مجاز */}
                        <td className="px-4 py-4">
                          {product.todayPrice?.min_allowed_price ? (
                            <span className="text-green-600 text-sm">
                              {formatPrice(product.todayPrice.min_allowed_price)}{" "}
                              ریال
                            </span>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </td>

                        {/* حداکثر مجاز */}
                        <td className="px-4 py-4">
                          {product.todayPrice?.max_allowed_price ? (
                            <span className="text-slate-500 text-sm">
                              {formatPrice(product.todayPrice.max_allowed_price)}{" "}
                              ریال
                            </span>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </td>

                        {/* تاریخ انقضا */}
                        <td className="px-4 py-4">
                          {product.todayPrice?.expire_date ? (
                            <span
                              className={cn(
                                "text-sm",
                                product.todayPrice.is_expired
                                  ? "text-red-500 font-medium"
                                  : "text-slate-500"
                              )}
                            >
                              {toJalali(product.todayPrice.expire_date)}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </td>

                        {/* وضعیت انقضا */}
                        <td className="px-4 py-4">
                          {product.todayPrice ? (
                            product.todayPrice.is_expired ? (
                              <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                                <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                                منقضی
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                معتبر
                              </span>
                            )
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>

                        {/* وضعیت کالا */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={badgeCfg.variant}
                              dot={badgeCfg.dot}
                              size="sm"
                            >
                              {badgeCfg.label}
                            </Badge>
                            {!product.is_active && (
                              <Badge variant="default" size="sm">
                                غیرفعال
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* عملیات */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditPrice(product)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title={
                                product.todayPrice
                                  ? "ویرایش قیمت مصوب"
                                  : "ثبت قیمت مصوب"
                              }
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            {product.is_active && (
                              <button
                                onClick={() => {
                                  setDeactivatingId(product.id);
                                  setDeactivatingName(product.name);
                                  setDeactivateConfirm(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="غیرفعال کردن کالا"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {totalCount.toLocaleString("fa-IR")} کالا
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

      {/* Edit Price Modal */}
      <Modal
        isOpen={editPriceModal}
        onClose={() => {
          setEditPriceModal(false);
          setEditingProduct(null);
          editPriceForm.reset();
        }}
        title={
          editingProduct?.todayPrice
            ? `ویرایش قیمت مصوب — ${editingProduct?.name}`
            : `ثبت قیمت مصوب — ${editingProduct?.name}`
        }
        size="md"
      >
        <form
          onSubmit={editPriceForm.handleSubmit(onEditPriceSubmit)}
          className="space-y-4"
        >
          {editingProduct?.todayPrice && (
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">قیمت فعلی:</span>
                <span className="font-bold text-primary-700">
                  {formatPrice(editingProduct.todayPrice.price)} ریال
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-slate-400">حداقل مجاز:</span>
                <span className="text-green-600">
                  {formatPrice(editingProduct.todayPrice.min_allowed_price)} ریال
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              قیمت جدید (ریال) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              dir="ltr"
              placeholder="مثال: 150000"
              {...editPriceForm.register("price", { valueAsNumber: true })}
              className={cn(
                "w-full border rounded-xl px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2",
                editPriceForm.formState.errors.price
                  ? "border-red-400 focus:ring-red-100"
                  : "border-slate-300 focus:ring-primary-100 focus:border-primary-500"
              )}
            />
            {editPriceForm.formState.errors.price && (
              <p className="mt-1 text-xs text-red-500">
                {editPriceForm.formState.errors.price.message}
              </p>
            )}
            {minAllowed && (
              <div className="mt-2 p-2.5 bg-green-50 border border-green-100 rounded-xl">
                <p className="text-xs text-green-700">
                  حداقل قیمت مجاز فروشگاه‌ها:{" "}
                  <strong>{formatPrice(minAllowed)} ریال</strong>
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  (۸۰٪ قیمت مصوب — سقف فروش:{" "}
                  {formatPrice(editPriceForm.watch("price"))} ریال)
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              تاریخ انقضا (اختیاری)
            </label>
            <input
              type="date"
              {...editPriceForm.register("expire_date")}
              min={todayISO}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              توضیحات
            </label>
            <textarea
              {...editPriceForm.register("description")}
              rows={2}
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
              {editingProduct?.todayPrice ? "ذخیره تغییرات" : "ثبت قیمت"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditPriceModal(false);
                setEditingProduct(null);
                editPriceForm.reset();
              }}
              className="flex-1"
            >
              انصراف
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        isOpen={addProductModal}
        onClose={() => {
          setAddProductModal(false);
          addProductForm.reset();
        }}
        title="افزودن کالای جدید به اتحادیه"
        size="md"
      >
        <form
          onSubmit={addProductForm.handleSubmit(onAddProductSubmit)}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              نام کالا <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...addProductForm.register("name")}
              placeholder="نام کالا"
              className={cn(
                "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all",
                addProductForm.formState.errors.name
                  ? "border-red-400 focus:ring-red-100"
                  : "border-slate-300 focus:ring-primary-100 focus:border-primary-500"
              )}
            />
            {addProductForm.formState.errors.name && (
              <p className="mt-1 text-xs text-red-500">
                {addProductForm.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                دسته‌بندی <span className="text-red-500">*</span>
              </label>
              <select
                {...addProductForm.register("category_id", {
                  valueAsNumber: true,
                })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
              >
                <option value="">انتخاب دسته‌بندی</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {addProductForm.formState.errors.category_id && (
                <p className="mt-1 text-xs text-red-500">
                  {addProductForm.formState.errors.category_id.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                واحد اندازه‌گیری <span className="text-red-500">*</span>
              </label>
              <select
                {...addProductForm.register("unit_id", { valueAsNumber: true })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
              >
                <option value="">انتخاب واحد</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
              {addProductForm.formState.errors.unit_id && (
                <p className="mt-1 text-xs text-red-500">
                  {addProductForm.formState.errors.unit_id.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              برند / نام تجاری
            </label>
            <input
              type="text"
              {...addProductForm.register("brand")}
              placeholder="برند (اختیاری)"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              توضیحات
            </label>
            <textarea
              {...addProductForm.register("description")}
              rows={2}
              placeholder="توضیحات کالا..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              isLoading={submitting}
              className="flex-1"
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              افزودن کالا
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddProductModal(false);
                addProductForm.reset();
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
          setDeactivatingName("");
        }}
        onConfirm={handleDeactivateProduct}
        title="غیرفعال کردن کالا"
        message={`آیا از غیرفعال کردن کالای "${deactivatingName}" اطمینان دارید؟ فروشگاه‌ها دیگر نمی‌توانند برای این کالا قیمت‌گذاری کنند.`}
        confirmText="غیرفعال کن"
        cancelText="انصراف"
        isLoading={submitting}
        variant="danger"
      />
    </div>
  );
}