"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BuildingStorefrontIcon, CheckCircleIcon, XCircleIcon,
  ShieldExclamationIcon,  ArrowPathIcon,   UserIcon,
  MapPinIcon,             PhoneIcon,       DocumentCheckIcon,
  ClipboardDocumentListIcon, ClockIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Button }        from "@/components/ui/Button";
import { Badge }         from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal }         from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert }         from "@/components/ui/Alert";
import { PageLoader }    from "@/components/ui/Spinner";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { parseApiError, extractArray } from "@/utils/error.utils";
import { toJalali }      from "@/utils/date.utils";
import { cn }            from "@/lib/cn";
import toast             from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
interface StoreDetail {
  id:                       number;
  name:                     string;
  union_name:               string;
  city_name:                string;
  province_name:            string;
  owner_name:               string;
  owner_phone:              string;
  license_number:           string;
  phone:                    string;
  mobile:                   string;
  address:                  string;
  postal_code:              string;
  description:              string;
  status:                   string;
  status_display:           string;
  can_set_price:            boolean;
  complaints_count:         number;
  pending_complaints_count: number;
  rejection_reason:         string | null;
  status_changed_at:        string | null;
  created_at:               string;
}

interface StoreDocument {
  id:                   number;
  document_type_display:string;
  title:                string;
  file:                 string;
  is_verified:          boolean;
  expire_date:          string | null;
  is_expired:           boolean;
  created_at:           string;
}

interface Complaint {
  uuid:           string;
  title:          string;
  status:         string;
  status_display: string;
  created_at:     string;
}

type TabId = "info" | "docs" | "complaints" | "history";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{className?:string}> }[] = [
  { id: "info",       label: "اطلاعات",       icon: BuildingStorefrontIcon },
  { id: "docs",       label: "مدارک",         icon: DocumentCheckIcon },
  { id: "complaints", label: "شکایات",        icon: ClipboardDocumentListIcon },
  { id: "history",    label: "تاریخچه",       icon: ClockIcon },
];

const STATUS_CFG: Record<string, {
  variant: "success"|"warning"|"danger"|"default";
  gradient: string;
  bg: string;
}> = {
  active:    { variant: "success", gradient: "from-green-400 to-green-600",   bg: "bg-green-50" },
  pending:   { variant: "warning", gradient: "from-amber-400 to-amber-600",   bg: "bg-amber-50" },
  suspended: { variant: "danger",  gradient: "from-red-400 to-red-600",       bg: "bg-red-50"   },
  rejected:  { variant: "danger",  gradient: "from-red-400 to-red-600",       bg: "bg-red-50"   },
  closed:    { variant: "default", gradient: "from-slate-300 to-slate-400",   bg: "bg-slate-50" },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ChamberStoreDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [store,  setStore]   = useState<StoreDetail | null>(null);
  const [docs,   setDocs]    = useState<StoreDocument[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<TabId>("info");

  // modals
  const [showApprove,  setShowApprove]  = useState(false);
  const [showSuspend,  setShowSuspend]  = useState(false);
  const [showReactivate,setShowReactivate]=useState(false);
  const [showReject,   setShowReject]   = useState(false);
  const [reason,       setReason]       = useState("");
  const [saving,       setSaving]       = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchStore = async () => {
    try {
      const r = await apiClient.get(ENDPOINTS.STORES.DETAIL(Number(id)));
      setStore(r.data?.data ?? r.data);
    } catch {
      toast.error("خطا در بارگذاری فروشگاه");
      router.push("/chamber/stores");
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await fetchStore();
      // docs
      try {
        const r = await apiClient.get(ENDPOINTS.STORES.DOCUMENTS(Number(id)));
        const d = r.data?.data ?? r.data;
        setDocs(extractArray<StoreDocument>(d));
      } catch { /* silent */ }
      // complaints
      try {
        const r = await apiClient.get(ENDPOINTS.COMPLAINTS.LIST, {
          params: { store: id, page_size: 20 },
        });
        const d = r.data?.data ?? r.data;
        setComplaints(extractArray<Complaint>(d));
      } catch { /* silent */ }
      setLoading(false);
    };
    loadAll();
  }, [id]);

  // ── actions ────────────────────────────────────────────────────────────────
  const doAction = async (
    endpoint: () => Promise<void>,
    successMsg: string,
    closeModal: () => void,
  ) => {
    setSaving(true);
    try {
      await endpoint();
      toast.success(successMsg);
      closeModal();
      setReason("");
      await fetchStore();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const verifyDoc = async (docId: number) => {
    try {
      await apiClient.post(ENDPOINTS.STORES.DOCUMENT_VERIFY(docId));
      toast.success("مدرک تایید شد");
      const r = await apiClient.get(ENDPOINTS.STORES.DOCUMENTS(Number(id)));
      setDocs(extractArray<StoreDocument>(r.data?.data ?? r.data));
    } catch (err) {
      toast.error(parseApiError(err));
    }
  };

  if (loading) return <PageLoader />;
  if (!store)  return null;

  const cfg = STATUS_CFG[store.status] ?? STATUS_CFG.pending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={store.name}
        subtitle={`${store.union_name} · ${store.city_name}`}
        breadcrumbs={[
          { label: "اتاق اصناف",  href: "/chamber/overview" },
          { label: "فروشگاه‌ها",  href: "/chamber/stores"   },
          { label: store.name },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={cfg.variant} dot size="md">
              {store.status_display}
            </Badge>
            {store.status === "pending" && (
              <>
                <Button
                  size="sm"
                  onClick={() => setShowApprove(true)}
                  leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                >
                  تایید
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setShowReject(true)}
                  leftIcon={<XCircleIcon className="h-4 w-4" />}
                >
                  رد
                </Button>
              </>
            )}
            {store.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSuspend(true)}
                leftIcon={<ShieldExclamationIcon className="h-4 w-4" />}
              >
                تعلیق
              </Button>
            )}
            {(store.status === "suspended" || store.status === "rejected") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReactivate(true)}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              >
                بازگرداندن
              </Button>
            )}
          </div>
        }
      />

      {/* Rejection reason */}
      {store.rejection_reason && (
        <Alert
          variant="error"
          title="دلیل رد / تعلیق"
          message={store.rejection_reason}
          icon
        />
      )}

      {/* Top color bar */}
      <div className={cn(
        "h-2 rounded-full bg-gradient-to-r",
        cfg.gradient,
      )} />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-2xl border
                       border-slate-100 shadow-card p-1.5 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold",
              "transition-all duration-200",
              activeTab === tab.id
                ? "bg-primary-700 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Info ── */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card padding="md" className="lg:col-span-2">
            <CardHeader>
              <CardTitle>مشخصات فروشگاه</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: BuildingStorefrontIcon, label: "نام",          value: store.name },
                { icon: DocumentCheckIcon,      label: "پروانه",      value: store.license_number },
                { icon: MapPinIcon,             label: "شهر",          value: store.city_name },
                { icon: MapPinIcon,             label: "استان",        value: store.province_name },
                { icon: UserIcon,               label: "مالک",         value: store.owner_name },
                { icon: PhoneIcon,              label: "موبایل مالک", value: store.owner_phone },
                { icon: PhoneIcon,              label: "تلفن",         value: store.phone || "—" },
                { icon: PhoneIcon,              label: "موبایل",       value: store.mobile || "—" },
              ].map(({ icon: I, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-3
                                             bg-slate-50 rounded-xl">
                  <div className="h-8 w-8 rounded-lg bg-white border border-slate-200
                                   flex items-center justify-center flex-shrink-0">
                    <I className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            {store.address && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl flex gap-3">
                <MapPinIcon className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">آدرس کامل</p>
                  <p className="text-sm text-slate-700">{store.address}</p>
                </div>
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card padding="md">
              <CardTitle subtitle="وضعیت فعلی">آمار فروشگاه</CardTitle>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-slate-800">
                    {store.complaints_count}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">کل شکایات</p>
                </div>
                <div className={cn(
                  "p-3 rounded-xl text-center",
                  store.pending_complaints_count > 0 ? "bg-red-50" : "bg-slate-50",
                )}>
                  <p className={cn(
                    "text-2xl font-bold",
                    store.pending_complaints_count > 0 ? "text-red-600" : "text-slate-800",
                  )}>
                    {store.pending_complaints_count}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">در انتظار</p>
                </div>
              </div>
            </Card>

            <Card padding="sm">
              <div className="space-y-1.5">
                {[
                  { label: "تاریخ ثبت",          value: toJalali(store.created_at) },
                  { label: "آخرین تغییر وضعیت",  value: store.status_changed_at ? toJalali(store.status_changed_at) : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between p-2">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="text-xs font-medium text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab: Docs ── */}
      {activeTab === "docs" && (
        <div>
          {docs.length === 0 ? (
            <EmptyDocsState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {docs.map((doc) => (
                <DocCard key={doc.id} doc={doc} onVerify={() => verifyDoc(doc.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Complaints ── */}
      {activeTab === "complaints" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          {complaints.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardDocumentListIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">شکایتی ثبت نشده است</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  {["عنوان شکایت", "وضعیت", "تاریخ ثبت"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-right text-xs font-bold
                                           uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.uuid}
                      className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{c.title}</td>
                    <td className="px-5 py-3.5">
                      <ComplaintBadge status={c.status} label={c.status_display} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {toJalali(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab: History ── */}
      {activeTab === "history" && (
        <Card padding="md">
          <CardTitle subtitle="تغییرات وضعیت فروشگاه">تاریخچه وضعیت</CardTitle>
          <div className="mt-4 space-y-0">
            {[
              {
                status:  store.status_display,
                date:    store.status_changed_at ?? store.created_at,
                desc:    store.rejection_reason ?? "وضعیت جاری",
                current: true,
              },
              {
                status:  "ثبت اولیه",
                date:    store.created_at,
                desc:    "فروشگاه در سیستم ثبت شد",
                current: false,
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "h-8 w-8 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    item.current
                      ? "border-primary-600 bg-primary-600"
                      : "border-slate-300 bg-white",
                  )}>
                    {item.current ? (
                      <CheckCircleIcon className="h-4 w-4 text-white" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                  {i < 1 && <div className="w-0.5 h-12 bg-slate-200 mt-1" />}
                </div>
                <div className="pb-8">
                  <p className={cn(
                    "font-bold text-sm",
                    item.current ? "text-primary-700" : "text-slate-600",
                  )}>
                    {item.status}
                  </p>
                  <p className="text-xs text-slate-400 mb-1">{toJalali(item.date)}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Confirm: Approve ── */}
      <ConfirmDialog
        isOpen={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={() =>
          doAction(
            () => apiClient.post(ENDPOINTS.STORES.APPROVE(store.id)),
            "فروشگاه تایید شد",
            () => setShowApprove(false),
          )
        }
        title="تایید فروشگاه"
        message={`آیا از تایید «${store.name}» اطمینان دارید؟`}
        confirmLabel="بله، تایید کن"
        variant="info"
        isLoading={saving}
      />

      {/* ── Modal: Suspend ── */}
      <Modal
        isOpen={showSuspend}
        onClose={() => { setShowSuspend(false); setReason(""); }}
        title="تعلیق فروشگاه"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowSuspend(false); setReason(""); }}>
              انصراف
            </Button>
            <Button
              variant="danger"
              isLoading={saving}
              onClick={() =>
                doAction(
                  () => apiClient.post(ENDPOINTS.STORES.SUSPEND(store.id), { reason }),
                  "فروشگاه تعلیق شد",
                  () => setShowSuspend(false),
                )
              }
              leftIcon={<ShieldExclamationIcon className="h-4 w-4" />}
            >
              تعلیق کن
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert variant="warning" message="فروشگاه پس از تعلیق نمی‌تواند قیمت‌گذاری کند." icon />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">دلیل تعلیق</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="دلیل تعلیق را وارد کنید..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-red-100 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* ── Modal: Reject ── */}
      <Modal
        isOpen={showReject}
        onClose={() => { setShowReject(false); setReason(""); }}
        title="رد فروشگاه"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowReject(false); setReason(""); }}>
              انصراف
            </Button>
            <Button
              variant="danger"
              isLoading={saving}
              onClick={() =>
                doAction(
                  () => apiClient.post(ENDPOINTS.STORES.REJECT(store.id), { reason }),
                  "فروشگاه رد شد",
                  () => setShowReject(false),
                )
              }
            >
              رد کردن
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert variant="error" message="دلیل رد به صاحب فروشگاه نمایش داده می‌شود." icon />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              دلیل رد <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="دلیل رد درخواست..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-red-100 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* ── Confirm: Reactivate ── */}
      <ConfirmDialog
        isOpen={showReactivate}
        onClose={() => setShowReactivate(false)}
        onConfirm={() =>
          doAction(
            () => apiClient.post(ENDPOINTS.STORES.REACTIVATE(store.id)),
            "فروشگاه بازگردانده شد",
            () => setShowReactivate(false),
          )
        }
        title="بازگرداندن فروشگاه"
        message={`آیا از بازگرداندن «${store.name}» اطمینان دارید؟`}
        confirmLabel="بله، بازگردان"
        variant="info"
        isLoading={saving}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper sub-components
// ─────────────────────────────────────────────────────────────────────────────
function EmptyDocsState() {
  return (
    <div className="py-16 text-center bg-white rounded-2xl border border-slate-100">
      <DocumentCheckIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500">هیچ مدرکی آپلود نشده است</p>
    </div>
  );
}

function DocCard({
  doc, onVerify,
}: {
  doc:      StoreDocument;
  onVerify: () => void;
}) {
  return (
    <div className={cn(
      "bg-white rounded-2xl border shadow-card p-5",
      doc.is_expired    ? "border-red-200"
      : doc.is_verified ? "border-green-200"
      :                   "border-slate-100",
    )}>
      <div className="flex items-start gap-3 mb-4">
        <div className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl",
          doc.is_verified ? "bg-green-50" : "bg-slate-100",
        )}>
          📄
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 truncate">{doc.title}</p>
          <p className="text-xs text-slate-500">{doc.document_type_display}</p>
        </div>
        {doc.is_verified ? (
          <Badge variant="success" size="sm" dot>تایید شده</Badge>
        ) : doc.is_expired ? (
          <Badge variant="danger"  size="sm" dot>منقضی</Badge>
        ) : (
          <Badge variant="warning" size="sm" dot>در انتظار</Badge>
        )}
      </div>

      <div className="space-y-1.5 mb-4 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">آپلود:</span>
          <span className="font-medium">{toJalali(doc.created_at)}</span>
        </div>
        {doc.expire_date && (
          <div className="flex justify-between">
            <span className="text-slate-400">انقضا:</span>
            <span className={cn("font-medium", doc.is_expired && "text-red-600")}>
              {toJalali(doc.expire_date)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <a
          href={doc.file}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3
                     bg-primary-50 text-primary-700 rounded-xl text-xs font-semibold
                     hover:bg-primary-100 transition-colors"
        >
          <DocumentCheckIcon className="h-3.5 w-3.5" />
          مشاهده
        </a>
        {!doc.is_verified && (
          <button
            onClick={onVerify}
            className="flex items-center gap-1.5 py-2 px-3 bg-green-50 text-green-700
                       rounded-xl text-xs font-semibold hover:bg-green-100 transition-colors"
          >
            <CheckCircleIcon className="h-3.5 w-3.5" />
            تایید مدرک
          </button>
        )}
      </div>
    </div>
  );
}

function ComplaintBadge({ status, label }: { status: string; label: string }) {
  const variantMap: Record<string, "success"|"danger"|"warning"|"info"|"default"> = {
    submitted:  "info",
    reviewing:  "warning",
    referred:   "warning",
    inspecting: "warning",
    confirmed:  "success",
    rejected:   "danger",
    closed:     "default",
  };
  return (
    <Badge variant={variantMap[status] ?? "default"} size="sm" dot>
      {label}
    </Badge>
  );
}