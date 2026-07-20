"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheckIcon, ExclamationTriangleIcon,
  CheckCircleIcon, XCircleIcon, ClockIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button }     from "@/components/ui/Button";
import { Badge }      from "@/components/ui/Badge";
import { Card }       from "@/components/ui/Card";
import { Modal }      from "@/components/ui/Modal";
import { Input }      from "@/components/ui/Input";
import { Alert }      from "@/components/ui/Alert";
import { Spinner }    from "@/components/ui/Spinner";
import apiClient      from "@/services/api.client";
import { ENDPOINTS }  from "@/services/endpoints";
import { parseApiError } from "@/utils/error.utils";
import { toJalali }   from "@/utils/date.utils";
import toast          from "react-hot-toast";
import { cn }         from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
interface StoreLicense {
  id:                number;
  license_number:    string;
  issue_date:        string;
  expire_date:       string;
  issuing_authority: string;
  business_type:     string;
  is_valid:          boolean;
  is_expired:        boolean;
  days_until_expiry: number;
  needs_renewal:     boolean;
  created_at:        string;
  updated_at:        string;
}

interface LicenseForm {
  license_number:    string;
  issue_date:        string;
  expire_date:       string;
  issuing_authority: string;
  business_type:     string;
}

const EMPTY_FORM: LicenseForm = {
  license_number: "", issue_date: "", expire_date: "",
  issuing_authority: "", business_type: "",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function StoreLicensePage() {
  const { id }      = useParams<{ id: string }>();
  const [license,   setLicense]   = useState<StoreLicense | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState<LicenseForm>(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    apiClient.get(ENDPOINTS.STORES.LICENSE(Number(id)))
      .then((r) => {
        const d = r.data?.data ?? r.data;
        if (d?.id) setLicense(d);
      })
      .catch(() => { /* no license yet */ })
      .finally(() => setLoading(false));
  }, [id]);

  // ── create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const { license_number, issue_date, expire_date, issuing_authority, business_type } = form;
    if (!license_number || !issue_date || !expire_date || !issuing_authority || !business_type) {
      toast.error("همه فیلدها الزامی هستند");
      return;
    }
    setSaving(true);
    try {
      const r = await apiClient.post(ENDPOINTS.STORES.LICENSE(Number(id)), form);
      const d = r.data?.data ?? r.data;
      setLicense(d);
      toast.success("پروانه کسب ثبت شد");
      setShowModal(false);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const f = (key: keyof LicenseForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm((p) => ({ ...p, [key]: e.target.value }));

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="پروانه کسب"
        subtitle="اطلاعات پروانه کسب فروشگاه"
        breadcrumbs={[
          { label: "فروشگاه‌های من", href: "/store/my-stores" },
          { label: "پروانه کسب" },
        ]}
        actions={
          !license && (
            <Button
              onClick={() => setShowModal(true)}
              leftIcon={<PlusCircleIcon className="h-4 w-4" />}
            >
              ثبت پروانه کسب
            </Button>
          )
        }
      />

      {!license ? (
        /* No license */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-6 bg-amber-50 rounded-3xl mb-6">
            <ShieldCheckIcon className="h-16 w-16 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">
            پروانه کسب ثبت نشده
          </h3>
          <p className="text-slate-400 mb-8 max-w-sm">
            برای فعال شدن فروشگاه و قیمت‌گذاری، پروانه کسب خود را ثبت کنید.
          </p>
          <Button
            onClick={() => setShowModal(true)}
            leftIcon={<PlusCircleIcon className="h-4 w-4" />}
          >
            ثبت پروانه کسب
          </Button>
        </div>
      ) : (
        <>
          {/* Status alerts */}
          {license.is_expired && (
            <Alert
              variant="error"
              title="پروانه کسب منقضی شده"
              message="پروانه کسب شما منقضی شده است. برای تمدید اقدام کنید."
              icon
            />
          )}
          {license.needs_renewal && !license.is_expired && (
            <Alert
              variant="warning"
              title="نزدیک به انقضا"
              message={`پروانه کسب شما ${license.days_until_expiry} روز دیگر منقضی می‌شود.`}
              icon
              dismissible
            />
          )}

          {/* Status card */}
          <div className={cn(
            "p-6 rounded-2xl border-2 flex items-center gap-5",
            license.is_expired
              ? "bg-red-50 border-red-200"
              : license.needs_renewal
              ? "bg-amber-50 border-amber-200"
              : "bg-green-50 border-green-200",
          )}>
            <div className={cn(
              "p-4 rounded-2xl flex-shrink-0",
              license.is_expired
                ? "bg-red-100"
                : license.needs_renewal
                ? "bg-amber-100"
                : "bg-green-100",
            )}>
              {license.is_expired ? (
                <XCircleIcon className="h-10 w-10 text-red-600" />
              ) : license.needs_renewal ? (
                <ExclamationTriangleIcon className="h-10 w-10 text-amber-600" />
              ) : (
                <CheckCircleIcon className="h-10 w-10 text-green-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-lg font-bold text-slate-800">
                  {license.is_expired
                    ? "پروانه منقضی"
                    : license.needs_renewal
                    ? "نیاز به تمدید"
                    : "پروانه معتبر"}
                </p>
                <Badge
                  variant={
                    license.is_expired
                      ? "danger"
                      : license.needs_renewal
                      ? "warning"
                      : "success"
                  }
                  dot
                >
                  {license.is_expired
                    ? "منقضی"
                    : license.needs_renewal
                    ? `${license.days_until_expiry} روز مانده`
                    : "فعال"}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">
                شماره پروانه:{" "}
                <span className="font-mono font-bold">{license.license_number}</span>
              </p>
            </div>
          </div>

          {/* License details */}
          <Card padding="md">
            <h3 className="font-bold text-slate-700 mb-5">اطلاعات پروانه کسب</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "شماره پروانه",     value: license.license_number, mono: true },
                { label: "نوع کسب‌وکار",    value: license.business_type },
                { label: "مرجع صادرکننده",  value: license.issuing_authority },
                { label: "تاریخ صدور",       value: toJalali(license.issue_date) },
                { label: "تاریخ انقضا",      value: toJalali(license.expire_date) },
                {
                  label: "وضعیت",
                  value: license.is_expired
                    ? "منقضی"
                    : license.needs_renewal
                    ? "نیاز به تمدید"
                    : "معتبر",
                },
              ].map(({ label, value, mono }) => (
                <div key={label} className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className={cn(
                    "font-semibold text-slate-800",
                    mono && "font-mono",
                  )}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Expiry countdown */}
            {!license.is_expired && (
              <div className={cn(
                "mt-5 p-4 rounded-xl flex items-center gap-3",
                license.days_until_expiry <= 30
                  ? "bg-amber-50 border border-amber-200"
                  : "bg-green-50 border border-green-200",
              )}>
                <ClockIcon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  license.days_until_expiry <= 30 ? "text-amber-500" : "text-green-500",
                )} />
                <p className={cn(
                  "text-sm font-medium",
                  license.days_until_expiry <= 30 ? "text-amber-800" : "text-green-800",
                )}>
                  {license.days_until_expiry} روز تا انقضای پروانه کسب
                </p>
              </div>
            )}
          </Card>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>ثبت شده در: {toJalali(license.created_at)}</span>
            <span>آخرین بروزرسانی: {toJalali(license.updated_at)}</span>
          </div>
        </>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="ثبت پروانه کسب"
        description="اطلاعات پروانه کسب خود را وارد کنید"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>انصراف</Button>
            <Button onClick={handleCreate} isLoading={saving}>
              ثبت پروانه
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="شماره پروانه کسب"
            placeholder="شماره پروانه"
            value={form.license_number}
            onChange={f("license_number")}
            dir="ltr"
            required
          />
          <Input
            label="نوع کسب‌وکار"
            placeholder="مثال: خواربارفروشی"
            value={form.business_type}
            onChange={f("business_type")}
            required
          />
          <Input
            label="مرجع صادرکننده"
            placeholder="مثال: اتاق اصناف تهران"
            value={form.issuing_authority}
            onChange={f("issuing_authority")}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="تاریخ صدور"
              type="date"
              value={form.issue_date}
              onChange={f("issue_date")}
              dir="ltr"
              required
            />
            <Input
              label="تاریخ انقضا"
              type="date"
              value={form.expire_date}
              onChange={f("expire_date")}
              dir="ltr"
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}