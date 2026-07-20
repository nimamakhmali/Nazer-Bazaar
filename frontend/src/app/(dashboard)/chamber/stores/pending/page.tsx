"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BuildingStorefrontIcon, CheckCircleIcon,
  XCircleIcon, EyeIcon, ClockIcon,
  DocumentCheckIcon, UserIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Button }        from "@/components/ui/Button";
import { Badge }         from "@/components/ui/Badge";
import { Modal }         from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Drawer }        from "@/components/ui/Drawer";
import { Spinner }       from "@/components/ui/Spinner";
import { EmptyState }    from "@/components/ui/EmptyState";
import { Alert }         from "@/components/ui/Alert";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { parseApiError, extractArray, extractCount } from "@/utils/error.utils";
import { toJalali }      from "@/utils/date.utils";
import toast             from "react-hot-toast";
import { cn }            from "@/lib/cn";
import Link              from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface PendingStore {
  id:             number;
  name:           string;
  union_name:     string;
  city_name:      string;
  owner_name:     string;
  owner_phone:    string;
  license_number: string;
  address:        string;
  phone:          string;
  mobile:         string;
  description:    string;
  created_at:     string;
}

interface Document {
  id:                   number;
  document_type_display:string;
  title:                string;
  file:                 string;
  is_verified:          boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ChamberPendingStoresPage() {
  const [stores,      setStores]      = useState<PendingStore[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [totalCount,  setTotalCount]  = useState(0);

  // drawer / modals
  const [selected,    setSelected]    = useState<PendingStore | null>(null);
  const [storeDocs,   setStoreDocs]   = useState<Document[]>([]);
  const [showDrawer,  setShowDrawer]  = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject,  setShowReject]  = useState(false);
  const [rejectReason,setRejectReason]= useState("");
  const [actionSaving,setActionSaving]= useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page_size: 50 };
      if (search) params.search = search;
      const res  = await apiClient.get(ENDPOINTS.STORES.PENDING, { params });
      const data = res.data?.data ?? res.data;
      setStores(extractArray<PendingStore>(data));
      setTotalCount(extractCount(data, 0));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  // ── open drawer: fetch docs ────────────────────────────────────────────────
  const openDrawer = async (store: PendingStore) => {
    setSelected(store);
    setStoreDocs([]);
    setShowDrawer(true);
    try {
      const r = await apiClient.get(ENDPOINTS.STORES.DOCUMENTS(store.id));
      const d = r.data?.data ?? r.data;
      setStoreDocs(extractArray<Document>(d));
    } catch { /* no docs */ }
  };

  // ── approve ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selected) return;
    setActionSaving(true);
    try {
      await apiClient.post(ENDPOINTS.STORES.APPROVE(selected.id));
      toast.success(`فروشگاه «${selected.name}» تایید شد`);
      setShowApprove(false);
      setShowDrawer(false);
      fetchPending();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setActionSaving(false);
    }
  };

  // ── reject ─────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) { toast.error("دلیل رد را وارد کنید"); return; }
    setActionSaving(true);
    try {
      await apiClient.post(ENDPOINTS.STORES.REJECT(selected.id), {
        reason: rejectReason,
      });
      toast.success(`فروشگاه «${selected.name}» رد شد`);
      setShowReject(false);
      setShowDrawer(false);
      setRejectReason("");
      fetchPending();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setActionSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="فروشگاه‌های در انتظار تایید"
        subtitle={`${totalCount.toLocaleString("fa-IR")} فروشگاه منتظر بررسی`}
        breadcrumbs={[
          { label: "اتاق اصناف", href: "/chamber/overview" },
          { label: "فروشگاه‌ها",  href: "/chamber/stores"   },
          { label: "در انتظار تایید" },
        ]}
      />

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                           h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="جستجوی نام فروشگاه، صاحب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                       rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                       focus:border-primary-500 bg-slate-50 transition-all"
          />
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="xl" />
        </div>
      ) : stores.length === 0 ? (
        <EmptyState
          icon={<CheckCircleIcon className="h-20 w-20" />}
          title="هیچ فروشگاهی در انتظار تایید نیست"
          description="همه درخواست‌های ثبت فروشگاه بررسی شده‌اند."
          size="lg"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stores.map((store) => (
            <PendingStoreCard
              key={store.id}
              store={store}
              onView={() => openDrawer(store)}
              onApprove={() => { setSelected(store); setShowApprove(true); }}
              onReject={() => { setSelected(store); setShowReject(true); }}
            />
          ))}
        </div>
      )}

      {/* ── Drawer: store detail ── */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={selected?.name ?? "جزئیات فروشگاه"}
        size="lg"
        footer={
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowReject(true)}
              leftIcon={<XCircleIcon className="h-4 w-4" />}
            >
              رد کردن
            </Button>
            <Button
              size="sm"
              onClick={() => setShowApprove(true)}
              leftIcon={<CheckCircleIcon className="h-4 w-4" />}
              className="flex-1"
            >
              تایید فروشگاه
            </Button>
            <Link href={`/chamber/stores/${selected?.id}`}>
              <Button variant="outline" size="sm">
                صفحه کامل
              </Button>
            </Link>
          </div>
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* Status */}
            <div className="flex items-center gap-3 p-4 bg-amber-50
                             border border-amber-200 rounded-2xl">
              <ClockIcon className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-900 text-sm">در انتظار بررسی</p>
                <p className="text-xs text-amber-700">
                  ثبت شده: {toJalali(selected.created_at)}
                </p>
              </div>
            </div>

            {/* Info grid */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                اطلاعات فروشگاه
              </p>
              {[
                { label: "نام فروشگاه",   value: selected.name },
                { label: "اتحادیه",       value: selected.union_name },
                { label: "شهر",           value: selected.city_name },
                { label: "شماره پروانه", value: selected.license_number },
                { label: "آدرس",          value: selected.address },
                { label: "تلفن",          value: selected.phone || "—" },
                { label: "موبایل",        value: selected.mobile || "—" },
              ].map(({ label, value }) => (
                <div key={label}
                     className="flex items-start justify-between gap-3 py-2
                                border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-400 flex-shrink-0 w-24">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-slate-700 text-left flex-1">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Owner */}
            <div className="p-4 bg-primary-50 border border-primary-100 rounded-2xl">
              <p className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-3">
                اطلاعات مالک
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary-100
                                 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{selected.owner_name}</p>
                  <p className="text-xs text-slate-500 font-mono">
                    {selected.owner_phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                مدارک ({storeDocs.length} مدرک)
              </p>
              {storeDocs.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl">
                  <DocumentCheckIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">مدرکی آپلود نشده</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {storeDocs.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl
                                  hover:bg-primary-50 transition-colors group"
                    >
                      <DocumentCheckIcon className="h-5 w-5 text-slate-400
                                                      group-hover:text-primary-600
                                                      flex-shrink-0 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {doc.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {doc.document_type_display}
                        </p>
                      </div>
                      {doc.is_verified ? (
                        <Badge variant="success" size="sm">تایید شده</Badge>
                      ) : (
                        <Badge variant="warning" size="sm">در انتظار</Badge>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            {selected.description && (
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-500 mb-2">توضیحات</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selected.description}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ── Confirm: Approve ── */}
      <ConfirmDialog
        isOpen={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={handleApprove}
        title="تایید فروشگاه"
        message={`آیا از تایید فروشگاه «${selected?.name}» اطمینان دارید؟ پس از تایید، فروشگاه فعال می‌شود.`}
        confirmLabel="بله، تایید کن"
        variant="info"
        isLoading={actionSaving}
      />

      {/* ── Modal: Reject ── */}
      <Modal
        isOpen={showReject}
        onClose={() => { setShowReject(false); setRejectReason(""); }}
        title="رد فروشگاه"
        description={`دلیل رد فروشگاه «${selected?.name}» را وارد کنید`}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => { setShowReject(false); setRejectReason(""); }}
            >
              انصراف
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              isLoading={actionSaving}
              leftIcon={<XCircleIcon className="h-4 w-4" />}
            >
              رد کردن
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert
            variant="warning"
            message="دلیل رد به صاحب فروشگاه نمایش داده می‌شود."
            icon
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              دلیل رد <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="دلیل رد درخواست را توضیح دهید..."
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-red-100
                         focus:border-red-400 resize-none transition-all"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending Store Card
// ─────────────────────────────────────────────────────────────────────────────
function PendingStoreCard({
  store, onView, onApprove, onReject,
}: {
  store:     PendingStore;
  onView:    () => void;
  onApprove: () => void;
  onReject:  () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-card
                     hover:shadow-card-hover transition-all duration-200 overflow-hidden">
      {/* Top bar */}
      <div className="h-1.5 bg-gradient-to-r from-amber-400 to-amber-500" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center
                           justify-center flex-shrink-0">
            <BuildingStorefrontIcon className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate">{store.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{store.union_name}</p>
            <p className="text-xs text-slate-400">{store.city_name}</p>
          </div>
          <Badge variant="warning" dot size="sm">در انتظار</Badge>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
            <UserIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-xs font-medium text-slate-700">{store.owner_name}</span>
            <span className="text-xs text-slate-400 font-mono mr-auto">
              {store.owner_phone}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
            <DocumentCheckIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500">پروانه:</span>
            <span className="text-xs font-mono font-medium text-slate-700">
              {store.license_number}
            </span>
            <span className="text-[10px] text-slate-400 mr-auto">
              {toJalali(store.created_at)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onView}
            className="flex items-center justify-center gap-1.5 py-2 px-3
                       rounded-xl bg-slate-100 hover:bg-primary-50
                       text-slate-600 hover:text-primary-700
                       text-xs font-semibold transition-colors"
          >
            <EyeIcon className="h-3.5 w-3.5" />
            جزئیات
          </button>
          <button
            onClick={onReject}
            className="flex items-center justify-center gap-1.5 py-2 px-3
                       rounded-xl bg-red-50 hover:bg-red-100
                       text-red-600 text-xs font-semibold transition-colors"
          >
            <XCircleIcon className="h-3.5 w-3.5" />
            رد
          </button>
          <button
            onClick={onApprove}
            className="flex items-center justify-center gap-1.5 py-2 px-3
                       rounded-xl bg-green-50 hover:bg-green-100
                       text-green-700 text-xs font-semibold transition-colors"
          >
            <CheckCircleIcon className="h-3.5 w-3.5" />
            تایید
          </button>
        </div>
      </div>
    </div>
  );
}