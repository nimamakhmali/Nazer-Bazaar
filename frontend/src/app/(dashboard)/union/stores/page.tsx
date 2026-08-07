"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  NoSymbolIcon,
  ArrowPathIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
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
import { toJalali } from "@/utils/date.utils";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Store {
  id: number;
  name: string;
  union: number;
  union_name: string;
  city_name: string;
  province_name: string;
  owner: number;
  owner_name: string;
  owner_phone: string;
  license_number: string;
  phone: string;
  mobile: string;
  address: string;
  status: string;
  status_display: string;
  is_active: boolean;
  complaints_count: number;
  pending_complaints_count: number;
  rejection_reason: string | null;
  created_at: string;
}

interface StorePrice {
  product_name: string;
  price: number;
  official_price_amount: number;
  min_allowed_price_amount: number;
  is_compliant: boolean;
  is_overpriced: boolean;
  violation_amount: number;
  discount_percent: number;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const suspendSchema = z.object({
  reason: z
    .string()
    .min(10, "دلیل تعلیق باید حداقل ۱۰ کاراکتر باشد")
    .max(500, "حداکثر ۵۰۰ کاراکتر"),
  duration_note: z.string().optional(),
});
type SuspendFormData = z.infer<typeof suspendSchema>;

const registerStoreSchema = z.object({
  name: z.string().min(2, "نام فروشگاه حداقل ۲ کاراکتر").max(100),
  owner_id: z.number({ required_error: "مالک الزامی است" }).positive(),
  license_number: z.string().min(3, "شماره پروانه الزامی است"),
  address: z.string().min(10, "آدرس حداقل ۱۰ کاراکتر"),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  postal_code: z.string().optional(),
});
type RegisterStoreFormData = z.infer<typeof registerStoreSchema>;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<
  string,
  "success" | "danger" | "warning" | "info" | "default"
> = {
  active: "success",
  pending: "warning",
  suspended: "danger",
  rejected: "danger",
  closed: "default",
};

const FILTER_TABS = [
  { value: "", label: "همه" },
  { value: "active", label: "فعال" },
  { value: "pending", label: "در انتظار" },
  { value: "suspended", label: "تعلیق‌شده" },
] as const;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UnionStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [unionId, setUnionId] = useState<number | null>(null);

  // Detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [storePrices, setStorePrices] = useState<StorePrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);

  // Suspend modal
  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendingStore, setSuspendingStore] = useState<Store | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reactivate confirm
  const [reactivateConfirm, setReactivateConfirm] = useState(false);
  const [reactivatingStore, setReactivatingStore] = useState<Store | null>(
    null
  );

  // Register store modal
  const [registerModal, setRegisterModal] = useState(false);

  const suspendForm = useForm<SuspendFormData>({
    resolver: zodResolver(suspendSchema),
  });

  const registerForm = useForm<RegisterStoreFormData>({
    resolver: zodResolver(registerStoreSchema),
  });

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

  // ── بارگذاری فروشگاه‌ها ─────────────────────────────────────────────────────
  const fetchStores = useCallback(async () => {
    if (!unionId) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        union: unionId,
        page,
        page_size: 12,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get(ENDPOINTS.STORES.LIST, { params });
      const data = res.data?.data ?? res.data;
      setStores(extractArray<Store>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 12) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [unionId, page, search, statusFilter]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // ── باز کردن drawer جزئیات ────────────────────────────────────────────────
  const openStoreDrawer = async (store: Store) => {
    setSelectedStore(store);
    setDrawerOpen(true);
    setStorePrices([]);
    setPricesLoading(true);
    try {
      const res = await apiClient.get(ENDPOINTS.PRICING.STORE_PRICES_TODAY, {
        params: { store: store.id },
      });
      const data = res.data?.data ?? res.data;
      setStorePrices(extractArray<StorePrice>(data));
    } catch {
      setStorePrices([]);
    } finally {
      setPricesLoading(false);
    }
  };

  // ── تعلیق فروشگاه ───────────────────────────────────────────────────────────
  const onSuspendSubmit = async (data: SuspendFormData) => {
    if (!suspendingStore) return;
    setSubmitting(true);
    try {
      const reason = data.duration_note
        ? `${data.reason} — ${data.duration_note}`
        : data.reason;

      await apiClient.post(ENDPOINTS.STORES.SUSPEND(suspendingStore.id), {
        reason,
      });
      toast.success(`فروشگاه "${suspendingStore.name}" تعلیق شد`);
      setSuspendModal(false);
      setSuspendingStore(null);
      suspendForm.reset();
      fetchStores();
      if (selectedStore?.id === suspendingStore.id) {
        setDrawerOpen(false);
      }
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── بازگرداندن فروشگاه ──────────────────────────────────────────────────────
  const handleReactivate = async () => {
    if (!reactivatingStore) return;
    setSubmitting(true);
    try {
      await apiClient.post(ENDPOINTS.STORES.REACTIVATE(reactivatingStore.id));
      toast.success(`فروشگاه "${reactivatingStore.name}" بازگردانده شد`);
      setReactivateConfirm(false);
      setReactivatingStore(null);
      fetchStores();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── ثبت فروشگاه جدید ────────────────────────────────────────────────────────
  const onRegisterSubmit = async (data: RegisterStoreFormData) => {
    if (!unionId) return;
    setSubmitting(true);
    try {
      await apiClient.post(ENDPOINTS.STORES.LIST, {
        union_id: unionId,
        owner_id: data.owner_id,
        name: data.name,
        license_number: data.license_number,
        address: data.address,
        phone: data.phone || "",
        mobile: data.mobile || "",
        postal_code: data.postal_code || "",
      });
      toast.success("فروشگاه جدید ثبت شد و در انتظار تایید است");
      setRegisterModal(false);
      registerForm.reset();
      fetchStores();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Counts ──────────────────────────────────────────────────────────────────
  const activeCount = stores.filter((s) => s.status === "active").length;
  const pendingCount = stores.filter((s) => s.status === "pending").length;
  const suspendedCount = stores.filter((s) => s.status === "suspended").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="فروشگاه‌های اتحادیه"
        subtitle={`${totalCount.toLocaleString("fa-IR")} فروشگاه عضو`}
        breadcrumbs={[{ label: "اتحادیه" }, { label: "فروشگاه‌ها" }]}
        actions={
          <Button
            leftIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setRegisterModal(true)}
          >
            افزودن فروشگاه
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "فعال",
            count: activeCount,
            color: "bg-green-50 border-green-100 text-green-700",
            dot: "bg-green-500",
          },
          {
            label: "در انتظار تایید",
            count: pendingCount,
            color: "bg-amber-50 border-amber-100 text-amber-700",
            dot: "bg-amber-500",
          },
          {
            label: "تعلیق‌شده",
            count: suspendedCount,
            color: "bg-red-50 border-red-100 text-red-700",
            dot: "bg-red-500",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border",
              item.color
            )}
          >
            <span
              className={cn("h-3 w-3 rounded-full flex-shrink-0", item.dot)}
            />
            <div>
              <p className="text-2xl font-bold">
                {item.count.toLocaleString("fa-IR")}
              </p>
              <p className="text-xs opacity-70">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="جستجوی فروشگاه..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  statusFilter === tab.value
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {tab.label}
                {tab.value === "pending" && pendingCount > 0 && (
                  <span className="mr-1.5 inline-flex items-center justify-center h-4 w-4 bg-amber-500 text-white text-[10px] rounded-full font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Store Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : stores.length === 0 ? (
        <EmptyState
          title="فروشگاهی یافت نشد"
          description="هنوز فروشگاهی در این اتحادیه ثبت نشده یا فیلتر نتیجه‌ای ندارد"
          action={
            <Button
              leftIcon={<PlusIcon className="h-4 w-4" />}
              onClick={() => setRegisterModal(true)}
            >
              افزودن فروشگاه
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stores.map((store) => {
              const isActive = store.status === "active";
              const isSuspended = store.status === "suspended";
              const isPending = store.status === "pending";

              return (
                <div
                  key={store.id}
                  className={cn(
                    "bg-white rounded-2xl border shadow-card p-5 hover:shadow-card-hover transition-all",
                    isSuspended
                      ? "border-red-100"
                      : isPending
                      ? "border-amber-100"
                      : "border-slate-100"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className={cn(
                        "h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0",
                        isActive
                          ? "bg-primary-100"
                          : isSuspended
                          ? "bg-red-100"
                          : "bg-amber-100"
                      )}
                    >
                      <BuildingStorefrontIcon
                        className={cn(
                          "h-5 w-5",
                          isActive
                            ? "text-primary-600"
                            : isSuspended
                            ? "text-red-500"
                            : "text-amber-500"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 truncate text-sm">
                        {store.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {store.address}
                      </p>
                    </div>
                    <Badge
                      variant={STATUS_BADGE[store.status] ?? "default"}
                      size="sm"
                    >
                      {store.status_display}
                    </Badge>
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">مالک:</span>
                      <span className="font-medium text-slate-700">
                        {store.owner_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">موبایل:</span>
                      <span className="font-mono text-slate-600">
                        {store.owner_phone}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">شکایات:</span>
                      <span
                        className={cn(
                          "font-bold",
                          store.complaints_count > 0
                            ? "text-red-500"
                            : "text-slate-500"
                        )}
                      >
                        {(store.complaints_count ?? 0).toLocaleString("fa-IR")}
                      </span>
                    </div>
                    {store.rejection_reason && (
                      <div className="mt-2 p-2 bg-red-50 rounded-lg">
                        <p className="text-[11px] text-red-600">
                          دلیل تعلیق: {store.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 border-t border-slate-50 pt-3">
                    <button
                      onClick={() => openStoreDrawer(store)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-primary-50 hover:text-primary-600 transition-colors text-xs font-medium"
                    >
                      <EyeIcon className="h-3.5 w-3.5" />
                      جزئیات
                    </button>

                    {isActive && (
                      <button
                        onClick={() => {
                          setSuspendingStore(store);
                          setSuspendModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-xs font-medium"
                      >
                        <NoSymbolIcon className="h-3.5 w-3.5" />
                        تعلیق
                      </button>
                    )}

                    {isSuspended && (
                      <button
                        onClick={() => {
                          setReactivatingStore(store);
                          setReactivateConfirm(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-xs font-medium"
                      >
                        <ArrowPathIcon className="h-3.5 w-3.5" />
                        بازگردانی
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Store Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedStore?.name ?? "جزئیات فروشگاه"}
        position="right"
        size="lg"
      >
        {selectedStore && (
          <div className="space-y-5">
            {/* Info */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "وضعیت", value: selectedStore.status_display },
                { label: "شهر", value: selectedStore.city_name },
                { label: "مالک", value: selectedStore.owner_name },
                { label: "موبایل", value: selectedStore.owner_phone },
                { label: "تلفن", value: selectedStore.phone || "—" },
                {
                  label: "پروانه",
                  value: selectedStore.license_number,
                },
                { label: "آدرس", value: selectedStore.address },
              ].map(({ label, value }) => (
                <div key={label} className="p-2.5 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 text-center">
                  <p className="text-xl font-bold text-orange-600">
                    {(selectedStore.complaints_count ?? 0).toLocaleString(
                      "fa-IR"
                    )}
                  </p>
                  <p className="text-xs text-orange-500">کل شکایات</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                  <p className="text-xl font-bold text-red-600">
                    {(selectedStore.pending_complaints_count ?? 0).toLocaleString(
                      "fa-IR"
                    )}
                  </p>
                  <p className="text-xs text-red-500">شکایات در انتظار</p>
                </div>
              </div>

            {/* Today prices */}
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <span>قیمت‌های امروز فروشگاه</span>
                {storePrices.length > 0 && (
                  <Badge variant="info" size="sm">
                    {storePrices.length} محصول
                  </Badge>
                )}
              </h4>

              {pricesLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="md" />
                </div>
              ) : storePrices.length === 0 ? (
                <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    این فروشگاه امروز قیمتی ثبت نکرده است
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {storePrices.map((sp, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border",
                        sp.is_overpriced
                          ? "bg-red-50 border-red-200"
                          : sp.is_compliant
                          ? "bg-green-50 border-green-200"
                          : "bg-amber-50 border-amber-200"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {sp.product_name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          مصوب: {formatPrice(sp.official_price_amount)} ریال |
                          حداقل: {formatPrice(sp.min_allowed_price_amount)} ریال
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 mr-3">
                        <p
                          className={cn(
                            "text-sm font-bold",
                            sp.is_overpriced ? "text-red-600" : "text-green-700"
                          )}
                        >
                          {formatPrice(sp.price)} ریال
                        </p>
                        {sp.is_overpriced && (
                          <p className="text-[10px] text-red-500 mt-0.5">
                            +{formatPrice(sp.violation_amount)} تخلف
                          </p>
                        )}
                        {sp.is_compliant && (
                          <p className="text-[10px] text-green-500 mt-0.5">
                            {sp.discount_percent}% تخفیف
                          </p>
                        )}
                      </div>
                      <div className="mr-2 flex-shrink-0">
                        {sp.is_overpriced ? (
                          <XCircleIcon className="h-5 w-5 text-red-500" />
                        ) : sp.is_compliant ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions in drawer */}
            {selectedStore.status === "active" && (
              <div className="border-t border-slate-100 pt-4">
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    setSuspendingStore(selectedStore);
                    setSuspendModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  <NoSymbolIcon className="h-4 w-4" />
                  تعلیق این فروشگاه
                </button>
              </div>
            )}

            {selectedStore.status === "suspended" && (
              <div className="border-t border-slate-100 pt-4">
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    setReactivatingStore(selectedStore);
                    setReactivateConfirm(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-sm font-medium"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  بازگرداندن فروشگاه
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Suspend Modal */}
      <Modal
        isOpen={suspendModal}
        onClose={() => {
          setSuspendModal(false);
          setSuspendingStore(null);
          suspendForm.reset();
        }}
        title={`تعلیق فروشگاه — ${suspendingStore?.name ?? ""}`}
        size="md"
      >
        <form
          onSubmit={suspendForm.handleSubmit(onSuspendSubmit)}
          className="space-y-4"
        >
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700 font-medium">
              ⚠️ با تعلیق این فروشگاه، صاحب آن دیگر نمی‌تواند قیمت‌گذاری
              کند.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              دلیل تعلیق <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 mb-2"
              onChange={(e) => {
                if (e.target.value) {
                  suspendForm.setValue("reason", e.target.value);
                }
              }}
            >
              <option value="">انتخاب دلیل...</option>
              <option value="گران‌فروشی — قیمت بالاتر از سقف مصوب">
                گران‌فروشی
              </option>
              <option value="کم‌فروشی — عرضه محصول کمتر از حد مجاز">
                کم‌فروشی
              </option>
              <option value="مدارک ناقص یا منقضی">مدارک ناقص / منقضی</option>
              <option value="تخلف از قوانین اتحادیه">تخلف از قوانین</option>
              <option value="سایر موارد">سایر موارد</option>
            </select>
            <textarea
              {...suspendForm.register("reason")}
              rows={3}
              placeholder="توضیح دقیق دلیل تعلیق..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 resize-none"
            />
            {suspendForm.formState.errors.reason && (
              <p className="mt-1 text-xs text-red-500">
                {suspendForm.formState.errors.reason.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              مدت تعلیق (اختیاری)
            </label>
            <input
              type="text"
              {...suspendForm.register("duration_note")}
              placeholder="مثال: ۱۵ روز، تا رفع تخلف"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="danger"
              isLoading={submitting}
              className="flex-1"
              leftIcon={<NoSymbolIcon className="h-4 w-4" />}
            >
              تعلیق فروشگاه
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSuspendModal(false);
                setSuspendingStore(null);
                suspendForm.reset();
              }}
              className="flex-1"
            >
              انصراف
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reactivate Confirm */}
      <ConfirmDialog
        isOpen={reactivateConfirm}
        onClose={() => {
          setReactivateConfirm(false);
          setReactivatingStore(null);
        }}
        onConfirm={handleReactivate}
        title="بازگرداندن فروشگاه"
        message={`آیا از بازگرداندن فروشگاه "${reactivatingStore?.name}" اطمینان دارید؟`}
        confirmText="بازگرداندن"
        cancelText="انصراف"
        isLoading={submitting}
        variant="success"
      />

      {/* Register Store Modal */}
      <Modal
        isOpen={registerModal}
        onClose={() => {
          setRegisterModal(false);
          registerForm.reset();
        }}
        title="ثبت فروشگاه جدید در اتحادیه"
        size="lg"
      >
        <form
          onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
          className="space-y-4"
        >
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
            فروشگاه پس از ثبت در وضعیت «در انتظار تایید» قرار می‌گیرد.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                نام فروشگاه <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...registerForm.register("name")}
                placeholder="نام فروشگاه"
                className={cn(
                  "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all",
                  registerForm.formState.errors.name
                    ? "border-red-400 focus:ring-red-100"
                    : "border-slate-300 focus:ring-primary-100 focus:border-primary-500"
                )}
              />
              {registerForm.formState.errors.name && (
                <p className="mt-1 text-xs text-red-500">
                  {registerForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                شناسه مالک (ID) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...registerForm.register("owner_id", { valueAsNumber: true })}
                placeholder="شناسه عددی کاربر"
                dir="ltr"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
              />
              {registerForm.formState.errors.owner_id && (
                <p className="mt-1 text-xs text-red-500">
                  {registerForm.formState.errors.owner_id.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                شماره پروانه کسب <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...registerForm.register("license_number")}
                placeholder="شماره پروانه"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
              />
              {registerForm.formState.errors.license_number && (
                <p className="mt-1 text-xs text-red-500">
                  {registerForm.formState.errors.license_number.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                تلفن
              </label>
              <input
                type="text"
                {...registerForm.register("phone")}
                placeholder="تلفن ثابت"
                dir="ltr"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                موبایل
              </label>
              <input
                type="text"
                {...registerForm.register("mobile")}
                placeholder="شماره موبایل"
                dir="ltr"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                آدرس <span className="text-red-500">*</span>
              </label>
              <textarea
                {...registerForm.register("address")}
                rows={2}
                placeholder="آدرس کامل فروشگاه"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
              />
              {registerForm.formState.errors.address && (
                <p className="mt-1 text-xs text-red-500">
                  {registerForm.formState.errors.address.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              isLoading={submitting}
              className="flex-1"
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              ثبت فروشگاه
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRegisterModal(false);
                registerForm.reset();
              }}
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