"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BuildingStorefrontIcon, DocumentCheckIcon,
  ShieldExclamationIcon,  CheckCircleIcon,
  ClockIcon,              XCircleIcon,
  PencilSquareIcon,       MapPinIcon,
  PhoneIcon,              UserIcon,
  DocumentTextIcon,       ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Button }        from "@/components/ui/Button";
import { Badge }         from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert }         from "@/components/ui/Alert";
import { Modal }         from "@/components/ui/Modal";
import { Input }         from "@/components/ui/Input";
import { Spinner, PageLoader } from "@/components/ui/Spinner";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { parseApiError } from "@/utils/error.utils";
import { toJalali }      from "@/utils/date.utils";
import toast             from "react-hot-toast";
import { cn }            from "@/lib/cn";
import Link              from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface StoreDetail {
  id:                       number;
  name:                     string;
  union:                    number;
  union_name:               string;
  city_name:                string;
  province_name:            string;
  owner:                    number;
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
  is_active:                boolean;
  complaints_count:         number;
  pending_complaints_count: number;
  rejection_reason:         string | null;
  status_changed_at:        string | null;
  created_at:               string;
  updated_at:               string;
}

interface EditForm {
  name:        string;
  address:     string;
  phone:       string;
  mobile:      string;
  postal_code: string;
  description: string;
}

const STATUS_CFG: Record<string, {
  variant: "success" | "warning" | "danger" | "default";
  bg:      string;
  icon:    React.ComponentType<{ className?: string }>;
}> = {
  active:    { variant: "success", bg: "bg-green-50",  icon: CheckCircleIcon },
  pending:   { variant: "warning", bg: "bg-amber-50",  icon: ClockIcon       },
  suspended: { variant: "danger",  bg: "bg-red-50",    icon: XCircleIcon     },
  rejected:  { variant: "danger",  bg: "bg-red-50",    icon: XCircleIcon     },
  closed:    { variant: "default", bg: "bg-slate-50",  icon: XCircleIcon     },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function StoreDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const [store, setStore]     = useState<StoreDetail | null>(null);
  const [loading,setLoading]  = useState(true);
  const [showEdit,setShowEdit]= useState(false);
  const [form,  setForm]      = useState<EditForm>({
    name: "", address: "", phone: "", mobile: "", postal_code: "", description: "",
  });
  const [saving,setSaving]    = useState(false);

  // ── fetch store ────────────────────────────────────────────────────────────
  useEffect(() => {
    apiClient.get(ENDPOINTS.STORES.DETAIL(Number(id)))
      .then((r) => {
        const d = r.data?.data ?? r.data;
        setStore(d);
        setForm({
          name:        d.name        ?? "",
          address:     d.address     ?? "",
          phone:       d.phone       ?? "",
          mobile:      d.mobile      ?? "",
          postal_code: d.postal_code ?? "",
          description: d.description ?? "",
        });
      })
      .catch(() => { toast.error("خطا در بارگذاری فروشگاه"); router.push("/store/my-stores"); })
      .finally(() => setLoading(false));
  }, [id, router]);

  // ── edit ───────────────────────────────────────────────────────────────────
  const handleEdit = async () => {
    if (!form.name.trim()) { toast.error("نام فروشگاه الزامی است"); return; }
    setSaving(true);
    try {
      await apiClient.patch(ENDPOINTS.STORES.DETAIL(Number(id)), form);
      toast.success("اطلاعات فروشگاه بروز شد");
      setShowEdit(false);
      // re-fetch
      const r = await apiClient.get(ENDPOINTS.STORES.DETAIL(Number(id)));
      setStore(r.data?.data ?? r.data);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!store)  return null;

  const cfg  = STATUS_CFG[store.status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={store.name}
        subtitle={`${store.union_name} · ${store.city_name}`}
        breadcrumbs={[
          { label: "فروشگاه",       href: "/store/overview"     },
          { label: "فروشگاه‌های من", href: "/store/my-stores"   },
          { label: store.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={cfg.variant} size="md" dot>
              {store.status_display}
            </Badge>
            {store.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEdit(true)}
                leftIcon={<PencilSquareIcon className="h-4 w-4" />}
              >
                ویرایش
              </Button>
            )}
          </div>
        }
      />

      {/* Status banner */}
      <div className={cn(
        "flex items-center gap-4 p-5 rounded-2xl border",
        cfg.bg,
        store.status === "active"    && "border-green-200",
        store.status === "pending"   && "border-amber-200",
        store.status === "suspended" && "border-red-200",
        store.status === "rejected"  && "border-red-200",
        store.status === "closed"    && "border-slate-200",
      )}>
        <div className={cn(
          "p-3 rounded-xl flex-shrink-0",
          store.status === "active"    && "bg-green-100",
          store.status === "pending"   && "bg-amber-100",
          (store.status === "suspended" || store.status === "rejected") && "bg-red-100",
          store.status === "closed"    && "bg-slate-100",
        )}>
          <Icon className={cn(
            "h-7 w-7",
            store.status === "active"    && "text-green-600",
            store.status === "pending"   && "text-amber-600",
            (store.status === "suspended" || store.status === "rejected") && "text-red-600",
            store.status === "closed"    && "text-slate-500",
          )} />
        </div>
        <div className="flex-1">
          <p className="font-bold text-slate-800">{store.status_display}</p>
          {store.rejection_reason ? (
            <p className="text-sm text-red-700 mt-0.5">{store.rejection_reason}</p>
          ) : store.status === "pending" ? (
            <p className="text-sm text-amber-700 mt-0.5">
              درخواست شما در صف بررسی قرار دارد. لطفاً صبر کنید.
            </p>
          ) : store.status === "active" ? (
            <p className="text-sm text-green-700 mt-0.5">
              فروشگاه فعال است و می‌توانید قیمت‌گذاری کنید.
            </p>
          ) : null}
        </div>
        {store.can_set_price && (
          <Link href="/store/pricing">
            <Button size="sm" leftIcon={<CurrencyDollarIcon className="h-4 w-4" />}>
              قیمت‌گذاری
            </Button>
          </Link>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Info */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding="md">
            <CardHeader>
              <CardTitle subtitle="اطلاعات اصلی فروشگاه">
                مشخصات فروشگاه
              </CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: BuildingStorefrontIcon, label: "نام فروشگاه",      value: store.name },
                { icon: DocumentTextIcon,       label: "شماره پروانه",    value: store.license_number },
                { icon: MapPinIcon,             label: "شهر",              value: store.city_name },
                { icon: MapPinIcon,             label: "استان",            value: store.province_name },
                { icon: UserIcon,               label: "مالک",             value: store.owner_name },
                { icon: PhoneIcon,              label: "موبایل مالک",     value: store.owner_phone },
                { icon: PhoneIcon,              label: "تلفن",             value: store.phone || "—" },
                { icon: PhoneIcon,              label: "موبایل",           value: store.mobile || "—" },
              ].map(({ icon: ItemIcon, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="h-8 w-8 rounded-lg bg-white border border-slate-200
                                   flex items-center justify-center flex-shrink-0">
                    <ItemIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {store.address && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-start gap-3">
                <MapPinIcon className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">آدرس کامل</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{store.address}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Description */}
          {store.description && (
            <Card padding="md">
              <CardTitle subtitle="توضیحات فروشگاه">
                توضیحات
              </CardTitle>
              <p className="text-sm text-slate-600 leading-relaxed mt-3">
                {store.description}
              </p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Card padding="md">
            <CardTitle subtitle="دسترسی سریع">اقدامات</CardTitle>
            <div className="space-y-2 mt-4">
              <Link href={`/store/my-stores/${store.id}/documents`}>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl
                                   hover:bg-slate-50 transition-colors text-right group">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center
                                   justify-center flex-shrink-0">
                    <DocumentCheckIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700
                                   group-hover:text-primary-700 transition-colors">
                      مدارک فروشگاه
                    </p>
                    <p className="text-xs text-slate-400">آپلود و مدیریت مدارک</p>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-slate-300
                                              group-hover:text-primary-400 transition-colors
                                              rotate-180" />
                </button>
              </Link>

              <Link href={`/store/my-stores/${store.id}/license`}>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl
                                   hover:bg-slate-50 transition-colors text-right group">
                  <div className="h-9 w-9 rounded-xl bg-green-50 flex items-center
                                   justify-center flex-shrink-0">
                    <ShieldExclamationIcon className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700
                                   group-hover:text-primary-700 transition-colors">
                      پروانه کسب
                    </p>
                    <p className="text-xs text-slate-400">مشاهده و تمدید پروانه</p>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-slate-300
                                              group-hover:text-primary-400 transition-colors
                                              rotate-180" />
                </button>
              </Link>

              {store.can_set_price && (
                <Link href="/store/pricing">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl
                                     hover:bg-primary-50 transition-colors text-right group
                                     bg-primary-50/50 border border-primary-100">
                    <div className="h-9 w-9 rounded-xl bg-primary-100 flex items-center
                                     justify-center flex-shrink-0">
                      <CurrencyDollarIcon className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-primary-700">قیمت‌گذاری امروز</p>
                      <p className="text-xs text-primary-500">ثبت قیمت محصولات</p>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 text-primary-300
                                                group-hover:text-primary-500 transition-colors
                                                rotate-180" />
                  </button>
                </Link>
              )}
            </div>
          </Card>

          {/* Complaints summary */}
          <Card padding="md">
            <CardTitle subtitle="وضعیت شکایات">شکایات</CardTitle>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-slate-800">
                  {store.complaints_count}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">کل شکایات</p>
              </div>
              <div className={cn(
                "p-3 rounded-xl text-center",
                (store.pending_complaints_count ?? 0) > 0
                  ? "bg-red-50"
                  : "bg-slate-50",
              )}>
                <p className={cn(
                  "text-2xl font-bold",
                  (store.pending_complaints_count ?? 0) > 0
                    ? "text-red-600"
                    : "text-slate-800",
                )}>
                  {store.pending_complaints_count}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">در انتظار</p>
              </div>
            </div>
          </Card>

          {/* Meta */}
          <Card padding="sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2">
                <span className="text-xs text-slate-400">تاریخ ثبت</span>
                <span className="text-xs font-medium text-slate-700">
                  {toJalali(store.created_at)}
                </span>
              </div>
              {store.status_changed_at && (
                <div className="flex items-center justify-between p-2">
                  <span className="text-xs text-slate-400">آخرین تغییر وضعیت</span>
                  <span className="text-xs font-medium text-slate-700">
                    {toJalali(store.status_changed_at)}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title="ویرایش اطلاعات فروشگاه"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEdit(false)}>انصراف</Button>
            <Button onClick={handleEdit} isLoading={saving}>ذخیره تغییرات</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="نام فروشگاه"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">آدرس</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-100 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="تلفن"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              dir="ltr"
            />
            <Input
              label="موبایل"
              value={form.mobile}
              onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
              dir="ltr"
            />
          </div>
          <Input
            label="کد پستی"
            value={form.postal_code}
            onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
            dir="ltr"
            maxLength={10}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">توضیحات</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-100 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// missing import
function CurrencyDollarIcon(props: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
         strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879
               1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725
               0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879
               4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}