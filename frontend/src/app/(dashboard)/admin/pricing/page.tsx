"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  PencilSquareIcon,
  XCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import {
  parseApiError,
  extractArray,
  extractCount,
} from "@/utils/error.utils";
import { formatPrice } from "@/utils/number.utils";
import { toJalali, getTodayJalali, getTodayGregorian } from "@/utils/date.utils";
import { CONFIG } from "@/constants/config";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────
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
  effective_date: string;
  expire_date: string | null;
  description: string;
  is_today: boolean;
  is_expired: boolean;
  is_active: boolean;
  created_by_name: string;
  created_at: string;
}

interface UnionOption {
  id: number;
  name: string;
  city_name: string;
  province_name: string;
}

interface Product {
  id: number;
  name: string;
  unit_symbol: string;
  category_name: string;
  union: number;
}

interface TodayPrice {
  product: number;
  price: number;
  id: number;
}

interface PriceRow {
  product: Product;
  todayPrice: number | null;
  inputValue: string;
  priceId: number | null;
  isSaved: boolean;
}

// ─── Validation ─────────────────────────────────────────────────────────────
const editSchema = z.object({
  price: z
    .number({ error: "قیمت الزامی است" })
    .positive("قیمت باید مثبت باشد")
    .min(1, "قیمت باید حداقل ۱ ریال باشد"),
  expire_date: z.string().optional(),
  description: z.string().optional(),
});
type EditFormData = z.infer<typeof editSchema>;

const newPriceSchema = z.object({
  union_id: z
    .number()
    .refine((v) => !Number.isNaN(v) && v > 0, { message: "اتحادیه الزامی است" }),
  product_id: z
    .number()
    .refine((v) => !Number.isNaN(v) && v > 0, { message: "محصول الزامی است" }),
  price: z
    .number({ error: "قیمت الزامی است" })
    .positive("قیمت باید مثبت باشد"),
  expire_date: z.string().optional(),
  description: z.string().optional(),
});
type NewPriceFormData = z.infer<typeof newPriceSchema>;

const STATUS_FILTERS = [
  { value: "", label: "همه" },
  { value: "today", label: "امروز" },
  { value: "active", label: "فعال" },
  { value: "expired", label: "منقضی" },
] as const;

type TabKey = "list" | "entry";

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdminPricingPage() {
  const [tab, setTab] = useState<TabKey>("list");

  // Unions
  const [unions, setUnions] = useState<UnionOption[]>([]);
  const [unionsLoading, setUnionsLoading] = useState(true);
  const [selectedUnionId, setSelectedUnionId] = useState<number | "">("");

  // ── Tab 1: List/manage prices ──────────────────────────────────────────
  const [prices, setPrices] = useState<OfficialPrice[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [editModal, setEditModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<OfficialPrice | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Tab 2: Today's entry grid ───────────────────────────────────────────
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  // ── New price modal ──────────────────────────────────────────────────────
  const [newPriceModal, setNewPriceModal] = useState(false);
  const [newPriceProducts, setNewPriceProducts] = useState<Product[]>([]);

  const today = getTodayJalali();
  const todayAPI = getTodayGregorian();

  const editForm = useForm<EditFormData>({ resolver: zodResolver(editSchema) });
  const newForm = useForm<NewPriceFormData>({ resolver: zodResolver(newPriceSchema) });

  // ── Load unions once ─────────────────────────────────────────────────────
  useEffect(() => {
    const loadUnions = async () => {
      setUnionsLoading(true);
      try {
        const res = await apiClient.get(ENDPOINTS.ORGANIZATIONS.UNIONS, {
          params: { page_size: 500 },
        });
        const data = res.data?.data ?? res.data;
        setUnions(extractArray<UnionOption>(data));
      } catch (err) {
        toast.error(parseApiError(err));
      } finally {
        setUnionsLoading(false);
      }
    };
    loadUnions();
  }, []);

  // ── Fetch official prices list (tab 1) ──────────────────────────────────
  const fetchPrices = useCallback(async () => {
    setListLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 15 };
      if (selectedUnionId) params.union = selectedUnionId;
      if (search) params.search = search;

      const endpoint =
        statusFilter === "today"
          ? ENDPOINTS.PRICING.OFFICIAL_PRICES_TODAY
          : ENDPOINTS.PRICING.OFFICIAL_PRICES;

      const res = await apiClient.get(endpoint, { params });
      const data = res.data?.data ?? res.data;
      let list = extractArray<OfficialPrice>(data);

      if (statusFilter === "active") {
        list = list.filter((p) => p.is_active && !p.is_expired);
      } else if (statusFilter === "expired") {
        list = list.filter((p) => p.is_expired || !p.is_active);
      }

      setPrices(list);
      const count = extractCount(data, list.length);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 15) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setListLoading(false);
    }
  }, [page, search, statusFilter, selectedUnionId]);

  useEffect(() => {
    if (tab === "list") fetchPrices();
  }, [tab, fetchPrices]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, selectedUnionId]);

  // ── Fetch entry grid (tab 2) — requires union selected ──────────────────
  const fetchEntryGrid = useCallback(async () => {
    if (!selectedUnionId) {
      setRows([]);
      return;
    }
    setRowsLoading(true);
    try {
      const [productsRes, todayRes] = await Promise.all([
        apiClient.get(ENDPOINTS.PRODUCTS.LIST, {
          params: { union: selectedUnionId, page_size: 200 },
        }),
        apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICES_TODAY, {
          params: { union: selectedUnionId },
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
            inputValue: tp ? String(tp.price) : "",
            priceId: tp?.id ?? null,
            isSaved: !!tp,
          };
        })
      );
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setRowsLoading(false);
    }
  }, [selectedUnionId]);

  useEffect(() => {
    if (tab === "entry") fetchEntryGrid();
  }, [tab, fetchEntryGrid]);

  const updateInput = (productId: number, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.product.id === productId ? { ...r, inputValue: value, isSaved: false } : r
      )
    );
  };

  const saveSingleRow = async (row: PriceRow) => {
    const price = Number(row.inputValue);
    if (!price || price <= 0) {
      toast.error("قیمت معتبر وارد کنید");
      return;
    }
    if (!selectedUnionId) return;
    setSavingId(row.product.id);
    try {
      await apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICES, {
        union_id: selectedUnionId,
        product_id: row.product.id,
        price,
        effective_date: todayAPI,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.product.id === row.product.id ? { ...r, isSaved: true, todayPrice: price } : r
        )
      );
      toast.success(`قیمت ${row.product.name} ثبت شد`);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSavingId(null);
    }
  };

  const saveAllRows = async () => {
    const toSave = rows.filter((r) => r.inputValue && Number(r.inputValue) > 0 && !r.isSaved);
    if (toSave.length === 0) {
      toast.error("قیمتی برای ثبت وجود ندارد");
      return;
    }
    if (!selectedUnionId) return;
    setSavingAll(true);
    try {
      await apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICES_BULK, {
        union_id: selectedUnionId,
        effective_date: todayAPI,
        prices: toSave.map((r) => ({ product_id: r.product.id, price: Number(r.inputValue) })),
      });
      setRows((prev) =>
        prev.map((r) => {
          const saved = toSave.find((s) => s.product.id === r.product.id);
          return saved ? { ...r, isSaved: true, todayPrice: Number(r.inputValue) } : r;
        })
      );
      toast.success(`${toSave.length} قیمت با موفقیت ثبت شد`);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSavingAll(false);
    }
  };

  // ── Edit price (tab 1) ───────────────────────────────────────────────────
  const openEdit = (price: OfficialPrice) => {
    setEditingPrice(price);
    editForm.reset({
      price: price.price,
      expire_date: price.expire_date ?? "",
      description: price.description ?? "",
    });
    setEditModal(true);
  };

  const onEditSubmit = async (data: EditFormData) => {
    if (!editingPrice) return;
    setSubmitting(true);
    try {
      await apiClient.patch(ENDPOINTS.PRICING.OFFICIAL_PRICE(editingPrice.id), {
        price: data.price,
        expire_date: data.expire_date || null,
        description: data.description || "",
      });
      toast.success("قیمت مصوب ویرایش شد");
      setEditModal(false);
      setEditingPrice(null);
      fetchPrices();
      if (tab === "entry") fetchEntryGrid();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingId) return;
    setSubmitting(true);
    try {
      await apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICE_DEACTIVATE(deactivatingId));
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

  // ── New price modal ──────────────────────────────────────────────────────
  const openNewPriceModal = () => {
    newForm.reset({
      union_id: typeof selectedUnionId === "number" ? selectedUnionId : undefined,
      product_id: undefined,
      price: undefined,
      expire_date: "",
      description: "",
    });
    setNewPriceModal(true);
    if (typeof selectedUnionId === "number") loadProductsForNewModal(selectedUnionId);
  };

  const loadProductsForNewModal = async (unionId: number) => {
    try {
      const res = await apiClient.get(ENDPOINTS.PRODUCTS.LIST, {
        params: { union: unionId, page_size: 200 },
      });
      const data = res.data?.data ?? res.data;
      setNewPriceProducts(extractArray<Product>(data));
    } catch {
      setNewPriceProducts([]);
    }
  };

  const onNewPriceSubmit = async (data: NewPriceFormData) => {
    setSubmitting(true);
    try {
      await apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICES, {
        union_id: data.union_id,
        product_id: data.product_id,
        price: data.price,
        effective_date: todayAPI,
        expire_date: data.expire_date || undefined,
        description: data.description || "",
      });
      toast.success("قیمت مصوب جدید ثبت شد");
      setNewPriceModal(false);
      fetchPrices();
      if (tab === "entry" && data.union_id === selectedUnionId) fetchEntryGrid();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Badge for price status ──────────────────────────────────────────────
  const getPriceBadge = (price: OfficialPrice) => {
    if (!price.is_active) return <Badge variant="default" size="sm">غیرفعال</Badge>;
    if (price.is_expired) return <Badge variant="danger" size="sm">منقضی</Badge>;
    if (price.is_today) return <Badge variant="success" size="sm">امروز</Badge>;
    return <Badge variant="info" size="sm">فعال</Badge>;
  };

  // ── Stats for entry grid ────────────────────────────────────────────────
  const savedCount = rows.filter((r) => r.isSaved).length;
  const pendingCount = rows.filter((r) => r.inputValue && !r.isSaved).length;
  const emptyCount = rows.filter((r) => !r.inputValue && !r.isSaved).length;
  const progress = rows.length > 0 ? Math.round((savedCount / rows.length) * 100) : 0;

  const selectedUnion = useMemo(
    () => unions.find((u) => u.id === selectedUnionId),
    [unions, selectedUnionId]
  );

  const watchedNewPrice = newForm.watch("price");
  const watchedNewUnion = newForm.watch("union_id");

  return (
    <div className="space-y-6">
      <PageHeader
        title="قیمت‌گذاری مصوب"
        subtitle={`مدیریت قیمت‌های مصوب تمام اتحادیه‌ها | امروز: ${today}`}
        breadcrumbs={[{ label: "ادمین" }, { label: "قیمت‌گذاری" }]}
        actions={
          <Button
            leftIcon={<CurrencyDollarIcon className="h-4 w-4" />}
            onClick={openNewPriceModal}
          >
            ثبت قیمت جدید
          </Button>
        }
      />

      {/* انتخاب اتحادیه */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
            فیلتر بر اساس اتحادیه:
          </label>
          <select
            value={selectedUnionId}
            onChange={(e) =>
              setSelectedUnionId(e.target.value ? Number(e.target.value) : "")
            }
            disabled={unionsLoading}
            className="flex-1 max-w-md border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 bg-white"
          >
            <option value="">همه اتحادیه‌ها</option>
            {unions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.city_name}
              </option>
            ))}
          </select>
          {selectedUnion && (
            <Badge variant="info" size="sm">
              {selectedUnion.province_name} / {selectedUnion.city_name}
            </Badge>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100">
        {[
          { key: "list" as TabKey, label: "لیست قیمت‌های مصوب", icon: ClipboardDocumentListIcon },
          { key: "entry" as TabKey, label: "ثبت قیمت امروز", icon: TagIcon },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: List ──────────────────────────────────────────────────── */}
      {tab === "list" && (
        <div className="space-y-4">
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
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      statusFilter === f.value
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

          <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
            {listLoading ? (
              <div className="flex items-center justify-center py-20">
                <Spinner size="lg" />
              </div>
            ) : prices.length === 0 ? (
              <EmptyState
                title="قیمت مصوبی یافت نشد"
                description="هنوز قیمت مصوبی ثبت نشده یا فیلتر نتیجه‌ای ندارد"
                action={
                  <Button
                    leftIcon={<CurrencyDollarIcon className="h-4 w-4" />}
                    onClick={openNewPriceModal}
                  >
                    ثبت اولین قیمت
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
                          "محصول",
                          "اتحادیه",
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

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                              <BuildingStorefrontIcon className="h-3.5 w-3.5 text-slate-400" />
                              {price.union_name}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="font-bold text-primary-700 text-sm">
                              {formatPrice(price.price)} ریال
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span className="text-green-600 text-sm font-medium">
                              {formatPrice(price.min_allowed_price)} ریال
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span className="text-slate-500 text-sm">
                              {formatPrice(price.max_allowed_price)} ریال
                            </span>
                          </td>

                          <td className="px-4 py-4 text-slate-600 text-sm">
                            {toJalali(price.effective_date)}
                          </td>

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

                          <td className="px-4 py-4">{getPriceBadge(price)}</td>

                          <td className="px-4 py-4 text-slate-500 text-xs">
                            {price.created_by_name}
                          </td>

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
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Entry grid ────────────────────────────────────────────── */}
      {tab === "entry" && (
        <div className="space-y-4">
          {!selectedUnionId ? (
            <Card padding="lg">
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">
                  برای ثبت قیمت روزانه، ابتدا یک اتحادیه را از باکس بالا انتخاب کنید.
                </p>
              </div>
            </Card>
          ) : rowsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="xl" />
            </div>
          ) : rows.length === 0 ? (
            <Card padding="lg">
              <p className="text-center text-slate-400">
                محصولی برای این اتحادیه یافت نشد
              </p>
            </Card>
          ) : (
            <>
              <Card padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      پیشرفت قیمت‌گذاری امروز — {selectedUnion?.name}
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
              </Card>

              <Alert
                variant="info"
                message={`فروشگاه‌ها مجاز هستند محصولات را از ${Math.round(
                  CONFIG.MIN_PRICE_RATIO * 100
                )}٪ قیمت مصوب تا سقف قیمت مصوب به فروش برسانند.`}
                icon
              />

              <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b-2 border-slate-100">
                        {[
                          "محصول",
                          "دسته‌بندی",
                          "واحد",
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
                            ? Math.ceil(inputNum * CONFIG.MIN_PRICE_RATIO)
                            : null;
                        const isSaving = savingId === row.product.id;

                        return (
                          <tr
                            key={row.product.id}
                            className={cn(
                              "border-b border-slate-50 transition-colors",
                              row.isSaved
                                ? "bg-green-50/40 hover:bg-green-50/60"
                                : "hover:bg-slate-50/60"
                            )}
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                    row.isSaved ? "bg-green-100" : "bg-primary-50"
                                  )}
                                >
                                  <CurrencyDollarIcon
                                    className={cn(
                                      "h-4 w-4",
                                      row.isSaved ? "text-green-600" : "text-primary-600"
                                    )}
                                  />
                                </div>
                                <span className="font-semibold text-slate-800">
                                  {row.product.name}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-slate-500 text-xs">
                              {row.product.category_name}
                            </td>

                            <td className="px-5 py-4">
                              <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                                {row.product.unit_symbol}
                              </span>
                            </td>

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
                                            : r
                                        )
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
                                    onChange={(e) => updateInput(row.product.id, e.target.value)}
                                    placeholder="قیمت به ریال"
                                    dir="ltr"
                                    className="w-36 px-3 py-2 text-sm border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all"
                                  />
                                  <button
                                    onClick={() => saveSingleRow(row)}
                                    disabled={!row.inputValue || isSaving}
                                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary-600 text-white hover:bg-primary-700"
                                  >
                                    {isSaving ? "..." : "ثبت"}
                                  </button>
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {minPrice ? (
                                <span className="text-slate-500 text-sm font-mono">
                                  {formatPrice(minPrice)} ریال
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {row.isSaved ? (
                                <Badge variant="success" size="sm">ثبت شده</Badge>
                              ) : row.inputValue ? (
                                <Badge variant="info" size="sm">در انتظار ثبت</Badge>
                              ) : (
                                <Badge variant="default" size="sm">ثبت نشده</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    {savedCount} محصول ثبت شده از {rows.length} محصول اتحادیه
                  </p>
                  <Button
                    onClick={saveAllRows}
                    isLoading={savingAll}
                    disabled={pendingCount === 0}
                    leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                  >
                    ثبت {pendingCount} قیمت باقی‌مانده
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
          {editingPrice && (
            <div className="p-3 bg-slate-50 rounded-xl text-sm">
              <p className="text-slate-500 text-xs mb-1">
                قیمت فعلی — {editingPrice.union_name}
              </p>
              <p className="font-bold text-primary-700">
                {formatPrice(editingPrice.price)} ریال
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              قیمت جدید (ریال) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="قیمت به ریال"
              dir="ltr"
              {...editForm.register("price", { valueAsNumber: true })}
              className={cn(
                "w-full border rounded-xl px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2",
                editForm.formState.errors.price
                  ? "border-red-400 focus:ring-red-100"
                  : "border-slate-300 focus:ring-primary-100 focus:border-primary-500"
              )}
            />
            {editForm.formState.errors.price && (
              <p className="mt-1 text-xs text-red-500">
                {editForm.formState.errors.price.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              تاریخ انقضا (اختیاری)
            </label>
            <input
              type="date"
              {...editForm.register("expire_date")}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">توضیحات</label>
            <textarea
              {...editForm.register("description")}
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

      {/* New Price Modal */}
      <Modal
        isOpen={newPriceModal}
        onClose={() => setNewPriceModal(false)}
        title="ثبت قیمت مصوب جدید"
        size="md"
      >
        <form onSubmit={newForm.handleSubmit(onNewPriceSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              اتحادیه <span className="text-red-500">*</span>
            </label>
            <select
              {...newForm.register("union_id", {
                valueAsNumber: true,
                onChange: (e) => {
                  const id = Number(e.target.value);
                  if (id) loadProductsForNewModal(id);
                  newForm.resetField("product_id");
                },
              })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            >
              <option value="">انتخاب اتحادیه...</option>
              {unions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.city_name}
                </option>
              ))}
            </select>
            {newForm.formState.errors.union_id && (
              <p className="mt-1 text-xs text-red-500">
                {newForm.formState.errors.union_id.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              محصول <span className="text-red-500">*</span>
            </label>
            <select
              {...newForm.register("product_id", { valueAsNumber: true })}
              disabled={!watchedNewUnion || newPriceProducts.length === 0}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {!watchedNewUnion ? "ابتدا اتحادیه را انتخاب کنید" : "انتخاب محصول..."}
              </option>
              {newPriceProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {newForm.formState.errors.product_id && (
              <p className="mt-1 text-xs text-red-500">
                {newForm.formState.errors.product_id.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              قیمت (ریال) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              dir="ltr"
              placeholder="قیمت به ریال"
              {...newForm.register("price", { valueAsNumber: true })}
              className={cn(
                "w-full border rounded-xl px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2",
                newForm.formState.errors.price
                  ? "border-red-400 focus:ring-red-100"
                  : "border-slate-300 focus:ring-primary-100 focus:border-primary-500"
              )}
            />
            {newForm.formState.errors.price && (
              <p className="mt-1 text-xs text-red-500">
                {newForm.formState.errors.price.message}
              </p>
            )}
            {watchedNewPrice && watchedNewPrice > 0 && (
              <p className="mt-1.5 text-xs text-green-600">
                حداقل قیمت مجاز فروشگاه‌ها:{" "}
                <strong>
                  {formatPrice(Math.ceil(watchedNewPrice * CONFIG.MIN_PRICE_RATIO))} ریال
                </strong>{" "}
                (۸۰٪ قیمت مصوب)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              تاریخ انقضا (اختیاری)
            </label>
            <input
              type="date"
              {...newForm.register("expire_date")}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">توضیحات</label>
            <textarea
              {...newForm.register("description")}
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
              ثبت قیمت
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewPriceModal(false)}
              className="flex-1"
            >
              انصراف
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}