"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { parseApiError, extractArray, extractCount } from "@/utils/error.utils";
import { toJalali } from "@/utils/date.utils";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Store {
  id: number;
  name: string;
  union_name: string;
  city_name: string;
  province_name: string;
  owner_name: string;
  owner_phone: string;
  license_number: string;
  phone: string;
  status: string;
  status_display: string;
  is_active: boolean;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "success" | "danger" | "warning" | "info" | "default";
  }
> = {
  pending:   { label: "در انتظار", variant: "warning" },
  active:    { label: "فعال",      variant: "success" },
  suspended: { label: "تعلیق",    variant: "danger"  },
  rejected:  { label: "رد شده",   variant: "danger"  },
  closed:    { label: "تعطیل",    variant: "default" },
};

const STATUS_FILTER_OPTIONS = [
  { value: "",          label: "همه وضعیت‌ها"    },
  { value: "pending",   label: "در انتظار تایید" },
  { value: "active",    label: "فعال"             },
  { value: "suspended", label: "تعلیق شده"       },
  { value: "rejected",  label: "رد شده"           },
  { value: "closed",    label: "تعطیل"            },
];

// ─── Sub-components (همه client) ─────────────────────────────────────────────

/** مودال جزئیات فروشگاه — کاملاً مجزا تا onClick ایزوله بماند */
function StoreDetailModal({
  store,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: {
  store: Store | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (!store) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="جزئیات فروشگاه" size="md">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
          <div className="h-14 w-14 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <BuildingStorefrontIcon className="h-7 w-7 text-primary-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-primary-700">{store.name}</h3>
            <p className="text-sm text-slate-400">{store.union_name}</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "مالک",         value: store.owner_name  },
            { label: "موبایل مالک", value: store.owner_phone  },
            { label: "شماره پروانه", value: store.license_number },
            { label: "شهر",          value: `${store.city_name} — ${store.province_name}` },
            { label: "تلفن",         value: store.phone || "—" },
            { label: "وضعیت",        value: STATUS_CONFIG[store.status]?.label ?? store.status },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 mb-0.5">{label}</p>
              <p className="font-semibold text-slate-800 text-sm">{value}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        {store.status === "pending" && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="success"
              size="sm"
              fullWidth
              onClick={onApprove}
            >
              تایید فروشگاه
            </Button>
            <Button
              variant="danger"
              size="sm"
              fullWidth
              onClick={onReject}
            >
              رد فروشگاه
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** مودال رد فروشگاه */
function RejectModal({
  store,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  store: Store | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState("");

  // reset هنگام باز شدن
  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("دلیل رد الزامی است");
      return;
    }
    onConfirm(reason);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="رد فروشگاه" size="sm">
      <div className="space-y-4">
        {store && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-semibold text-red-800">{store.name}</p>
            <p className="text-xs text-red-500 mt-0.5">{store.union_name}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">
            دلیل رد <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="دلیل رد شدن فروشگاه را توضیح دهید..."
            rows={4}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-red-100
                       focus:border-red-400 resize-none transition-all"
          />
        </div>

        {/* Footer داخل مودال — نه prop */}
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading} fullWidth>
            انصراف
          </Button>
          <Button variant="danger" onClick={handleSubmit} isLoading={isLoading} fullWidth>
            رد کردن
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminStoresPage() {
  const [stores,       setStores]       = useState<Store[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [totalCount,   setTotalCount]   = useState(0);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // modal states
  const [showDetail,  setShowDetail]  = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject,  setShowReject]  = useState(false);
  const [selected,    setSelected]    = useState<Store | null>(null);
  const [acting,      setActing]      = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchStores = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 10 };
      if (search)       params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res  = await apiClient.get(ENDPOINTS.STORES.LIST, { params });
      const data = res.data?.data ?? res.data;

      setStores(extractArray<Store>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 10) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchStores(); }, [fetchStores]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selected) return;
    setActing(true);
    try {
      await apiClient.post(ENDPOINTS.STORES.APPROVE(selected.id));
      toast.success("فروشگاه تایید شد");
      setShowApprove(false);
      void fetchStores();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setActing(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!selected) return;
    setActing(true);
    try {
      await apiClient.post(ENDPOINTS.STORES.REJECT(selected.id), { reason });
      toast.success("فروشگاه رد شد");
      setShowReject(false);
      void fetchStores();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setActing(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openDetail = (store: Store) => {
    setSelected(store);
    setShowDetail(true);
  };

  const openApprove = (store: Store) => {
    setSelected(store);
    setShowApprove(true);
  };

  const openReject = (store: Store) => {
    setSelected(store);
    setShowReject(true);
  };

  // از detail modal به approve
  const handleDetailApprove = () => {
    setShowDetail(false);
    setShowApprove(true);
  };

  // از detail modal به reject
  const handleDetailReject = () => {
    setShowDetail(false);
    setShowReject(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت فروشگاه‌ها"
        subtitle={`${totalCount.toLocaleString("fa-IR")} فروشگاه در سامانه`}
        breadcrumbs={[{ label: "ادمین" }, { label: "فروشگاه‌ها" }]}
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4
                                            text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="جستجو بر اساس نام، شماره پروانه..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-primary-100
                         focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-primary-100
                       bg-white min-w-[160px]"
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : stores.length === 0 ? (
          <EmptyState title="فروشگاهی یافت نشد" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["فروشگاه", "اتحادیه", "مالک", "وضعیت", "تاریخ ثبت", "عملیات"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-right text-xs font-bold
                                 uppercase tracking-wider text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <StoreRow
                    key={store.id}
                    store={store}
                    onDetail={openDetail}
                    onApprove={openApprove}
                    onReject={openReject}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50
                          flex items-center justify-between">
            <p className="text-xs text-slate-500">
              نمایش {stores.length} از {totalCount.toLocaleString("fa-IR")} فروشگاه
            </p>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <StoreDetailModal
        store={selected}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onApprove={handleDetailApprove}
        onReject={handleDetailReject}
      />

      <ConfirmDialog
        isOpen={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={handleApprove}
        title="تایید فروشگاه"
        message={`آیا از تایید فروشگاه «${selected?.name}» اطمینان دارید؟`}
        confirmLabel="تایید کن"
        variant="warning"
        isLoading={acting}
      />

      <RejectModal
        store={selected}
        isOpen={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={handleReject}
        isLoading={acting}
      />
    </div>
  );
}

// ─── StoreRow — کاملاً مجزا ──────────────────────────────────────────────────

function StoreRow({
  store,
  onDetail,
  onApprove,
  onReject,
}: {
  store: Store;
  onDetail:  (s: Store) => void;
  onApprove: (s: Store) => void;
  onReject:  (s: Store) => void;
}) {
  const statusInfo = STATUS_CONFIG[store.status] ?? STATUS_CONFIG.pending;

  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
      {/* فروشگاه */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary-50 flex items-center
                          justify-center flex-shrink-0">
            <BuildingStorefrontIcon className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{store.name}</p>
            <p className="text-xs text-slate-400">{store.license_number}</p>
          </div>
        </div>
      </td>

      {/* اتحادیه */}
      <td className="px-5 py-4">
        <p className="text-sm text-slate-600">{store.union_name}</p>
        <p className="text-xs text-slate-400">{store.city_name}</p>
      </td>

      {/* مالک */}
      <td className="px-5 py-4">
        <p className="text-sm text-slate-700">{store.owner_name}</p>
        <p className="text-xs text-slate-400 font-mono" dir="ltr">
          {store.owner_phone}
        </p>
      </td>

      {/* وضعیت */}
      <td className="px-5 py-4">
        <Badge variant={statusInfo.variant} size="sm">
          {statusInfo.label}
        </Badge>
      </td>

      {/* تاریخ */}
      <td className="px-5 py-4 text-sm text-slate-500">
        {toJalali(store.created_at)}
      </td>

      {/* عملیات */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDetail(store)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600
                       hover:bg-primary-50 transition-colors"
            title="مشاهده"
          >
            <EyeIcon className="h-4 w-4" />
          </button>

          {store.status === "pending" && (
            <>
              <button
                type="button"
                onClick={() => onApprove(store)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-green-600
                           hover:bg-green-50 transition-colors"
                title="تایید"
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onReject(store)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600
                           hover:bg-red-50 transition-colors"
                title="رد"
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}