"use client";

import React, { useState, useEffect } from "react";
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button }     from "@/components/ui/Button";
import { Input }      from "@/components/ui/Input";
import { Alert }      from "@/components/ui/Alert";
import { cn }         from "@/lib/cn";
import apiClient      from "@/services/api.client";
import { ENDPOINTS }  from "@/services/endpoints";
import { parseApiError, extractArray } from "@/utils/error.utils";
import toast          from "react-hot-toast";
import { useRouter }  from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
interface Province { id: number; name: string; }
interface City     { id: number; name: string; }
interface Union    { id: number; name: string; city_name: string; }

interface FormData {
  province_id: string;
  city_id:     string;
  union_id:    string;
  name:        string;
  license_number: string;
  address:     string;
  phone:       string;
  mobile:      string;
  postal_code: string;
  description: string;
}

const EMPTY_FORM: FormData = {
  province_id: "", city_id: "", union_id: "",
  name: "", license_number: "", address: "",
  phone: "", mobile: "", postal_code: "", description: "",
};

const STEPS = [
  { id: 1, label: "انتخاب اتحادیه", icon: BuildingStorefrontIcon },
  { id: 2, label: "اطلاعات فروشگاه", icon: DocumentTextIcon      },
  { id: 3, label: "اطلاعات تماس",   icon: PhoneIcon              },
  { id: 4, label: "تایید و ارسال",  icon: CheckCircleIcon        },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function StoreRegisterPage() {
  const router = useRouter();
  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState<FormData>(EMPTY_FORM);
  const [errors,    setErrors]    = useState<Partial<FormData>>({});
  const [saving,    setSaving]    = useState(false);
  const [done,      setDone]      = useState(false);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities,    setCities]    = useState<City[]>([]);
  const [unions,    setUnions]    = useState<Union[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // me (owner id)
  const [ownerId, setOwnerId] = useState<number | null>(null);
  useEffect(() => {
    apiClient.get(ENDPOINTS.AUTH.ME).then((r) => {
      const d = r.data?.data ?? r.data;
      setOwnerId(d?.id ?? null);
    }).catch(() => {});
    apiClient.get(ENDPOINTS.GEOGRAPHY.PROVINCES, { params: { page_size: 50 } })
      .then((r) => {
        const d = r.data?.data ?? r.data;
        setProvinces(extractArray<Province>(d));
      }).catch(() => {});
  }, []);

  // cascade: province → cities
  useEffect(() => {
    if (!form.province_id) { setCities([]); setUnions([]); return; }
    setLoadingGeo(true);
    apiClient.get(ENDPOINTS.GEOGRAPHY.PROVINCE_CITIES(Number(form.province_id)))
      .then((r) => {
        const d = r.data?.data ?? r.data;
        setCities(extractArray<City>(d));
        setForm((p) => ({ ...p, city_id: "", union_id: "" }));
        setUnions([]);
      })
      .catch(() => {})
      .finally(() => setLoadingGeo(false));
  }, [form.province_id]);

  // cascade: city → unions
  useEffect(() => {
    if (!form.city_id) { setUnions([]); return; }
    setLoadingGeo(true);
    apiClient.get(ENDPOINTS.ORGANIZATIONS.UNIONS, {
      params: { city: form.city_id, page_size: 100 },
    })
      .then((r) => {
        const d = r.data?.data ?? r.data;
        setUnions(extractArray<Union>(d));
        setForm((p) => ({ ...p, union_id: "" }));
      })
      .catch(() => {})
      .finally(() => setLoadingGeo(false));
  }, [form.city_id]);

  const f = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  // ── validation per step ────────────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const errs: Partial<FormData> = {};
    if (s === 1) {
      if (!form.province_id) errs.province_id = "استان را انتخاب کنید";
      if (!form.city_id)     errs.city_id     = "شهر را انتخاب کنید";
      if (!form.union_id)    errs.union_id    = "اتحادیه را انتخاب کنید";
    }
    if (s === 2) {
      if (!form.name.trim())           errs.name           = "نام فروشگاه الزامی است";
      if (!form.license_number.trim()) errs.license_number = "شماره پروانه الزامی است";
      if (!form.address.trim())        errs.address        = "آدرس الزامی است";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, 4)); };
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!ownerId) { toast.error("خطا در شناسایی کاربر"); return; }
    setSaving(true);
    try {
      await apiClient.post(ENDPOINTS.STORES.LIST, {
        union_id:       Number(form.union_id),
        owner_id:       ownerId,
        name:           form.name,
        license_number: form.license_number,
        address:        form.address,
        phone:          form.phone   || undefined,
        mobile:         form.mobile  || undefined,
        postal_code:    form.postal_code || undefined,
        description:    form.description || undefined,
      });
      setDone(true);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // ── selected union info ────────────────────────────────────────────────────
  const selectedUnion = unions.find((u) => String(u.id) === form.union_id);

  // ── Done screen ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-6">
        <div className="inline-flex p-6 bg-green-100 rounded-3xl">
          <CheckCircleIcon className="h-16 w-16 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            فروشگاه با موفقیت ثبت شد!
          </h2>
          <p className="text-slate-500 leading-relaxed">
            فروشگاه «{form.name}» ثبت شد و در انتظار بررسی توسط اتاق اصناف است.
            پس از تایید، می‌توانید قیمت‌گذاری را شروع کنید.
          </p>
        </div>
        <Alert
          variant="info"
          message="برای تسریع فرآیند تایید، مدارک فروشگاه را آپلود کنید."
          icon
        />
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => router.push("/store/my-stores")}>
            فروشگاه‌های من
          </Button>
          <Button onClick={() => { setForm(EMPTY_FORM); setStep(1); setDone(false); }}>
            ثبت فروشگاه دیگر
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="ثبت فروشگاه جدید"
        subtitle="اطلاعات فروشگاه خود را وارد کنید"
        breadcrumbs={[
          { label: "فروشگاه", href: "/store/overview" },
          { label: "ثبت فروشگاه جدید" },
        ]}
      />

      {/* Stepper */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
        <div className="flex items-center justify-between relative">
          {/* connector line */}
          <div className="absolute top-5 right-5 left-5 h-0.5 bg-slate-100 -z-0" />
          <div
            className="absolute top-5 right-5 h-0.5 bg-primary-500 transition-all duration-500 -z-0"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * (100 - 10)}%` }}
          />

          {STEPS.map((s) => {
            const done    = step > s.id;
            const current = step === s.id;
            const Icon    = s.icon;
            return (
              <div key={s.id} className="flex flex-col items-center gap-2 z-10">
                <div className={cn(
                  "h-10 w-10 rounded-full border-2 flex items-center justify-center",
                  "transition-all duration-300",
                  done
                    ? "bg-primary-600 border-primary-600"
                    : current
                    ? "bg-white border-primary-600 shadow-md"
                    : "bg-white border-slate-200",
                )}>
                  {done ? (
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  ) : (
                    <Icon className={cn(
                      "h-4 w-4",
                      current ? "text-primary-600" : "text-slate-300",
                    )} />
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium hidden sm:block",
                  current ? "text-primary-700" : done ? "text-primary-500" : "text-slate-400",
                )}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
        {/* ── Step 1: Union selection ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary-50 rounded-xl">
                <BuildingStorefrontIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">انتخاب اتحادیه</h3>
                <p className="text-sm text-slate-500">
                  ابتدا محل فروشگاه و اتحادیه مربوطه را انتخاب کنید
                </p>
              </div>
            </div>

            {/* Province */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                استان <span className="text-red-500">*</span>
              </label>
              <select
                value={form.province_id}
                onChange={f("province_id")}
                className={cn(
                  "w-full px-3 py-2.5 text-sm border rounded-xl appearance-none",
                  "focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500",
                  "bg-white transition-all",
                  errors.province_id ? "border-red-400" : "border-slate-300",
                )}
              >
                <option value="">انتخاب استان...</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.province_id && (
                <p className="text-xs text-red-500">{errors.province_id}</p>
              )}
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                شهر <span className="text-red-500">*</span>
              </label>
              <select
                value={form.city_id}
                onChange={f("city_id")}
                disabled={!form.province_id || loadingGeo}
                className={cn(
                  "w-full px-3 py-2.5 text-sm border rounded-xl appearance-none",
                  "focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500",
                  "bg-white transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  errors.city_id ? "border-red-400" : "border-slate-300",
                )}
              >
                <option value="">
                  {loadingGeo ? "در حال بارگذاری..." : "انتخاب شهر..."}
                </option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.city_id && (
                <p className="text-xs text-red-500">{errors.city_id}</p>
              )}
            </div>

            {/* Union */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                اتحادیه <span className="text-red-500">*</span>
              </label>
              <select
                value={form.union_id}
                onChange={f("union_id")}
                disabled={!form.city_id || loadingGeo}
                className={cn(
                  "w-full px-3 py-2.5 text-sm border rounded-xl appearance-none",
                  "focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500",
                  "bg-white transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  errors.union_id ? "border-red-400" : "border-slate-300",
                )}
              >
                <option value="">
                  {loadingGeo ? "در حال بارگذاری..." : "انتخاب اتحادیه..."}
                </option>
                {unions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {errors.union_id && (
                <p className="text-xs text-red-500">{errors.union_id}</p>
              )}
            </div>

            {/* Selected union info */}
            {selectedUnion && (
              <div className="flex items-center gap-3 p-4 bg-primary-50
                               border border-primary-200 rounded-xl">
                <CheckCircleIcon className="h-5 w-5 text-primary-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-primary-800">
                    {selectedUnion.name}
                  </p>
                  <p className="text-xs text-primary-600">{selectedUnion.city_name}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Store info ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-secondary-50 rounded-xl">
                <DocumentTextIcon className="h-6 w-6 text-secondary-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">اطلاعات فروشگاه</h3>
                <p className="text-sm text-slate-500">
                  مشخصات اصلی فروشگاه خود را وارد کنید
                </p>
              </div>
            </div>

            <Input
              label="نام فروشگاه"
              placeholder="مثال: فروشگاه احمدی"
              value={form.name}
              onChange={f("name")}
              error={errors.name}
              required
            />
            <Input
              label="شماره پروانه کسب"
              placeholder="شماره پروانه کسب"
              value={form.license_number}
              onChange={f("license_number")}
              error={errors.license_number}
              dir="ltr"
              required
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                آدرس کامل <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.address}
                onChange={f("address")}
                placeholder="آدرس کامل فروشگاه..."
                rows={3}
                className={cn(
                  "w-full rounded-xl border px-3 py-2.5 text-sm resize-none",
                  "focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all",
                  errors.address
                    ? "border-red-400 focus:border-red-400"
                    : "border-slate-300 focus:border-primary-500",
                )}
              />
              {errors.address && (
                <p className="text-xs text-red-500">{errors.address}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                توضیحات (اختیاری)
              </label>
              <textarea
                value={form.description}
                onChange={f("description")}
                placeholder="توضیحات اضافی..."
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm
                           resize-none focus:outline-none focus:ring-2 focus:ring-primary-100
                           focus:border-primary-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* ── Step 3: Contact ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-50 rounded-xl">
                <PhoneIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">اطلاعات تماس</h3>
                <p className="text-sm text-slate-500">
                  راه‌های ارتباطی فروشگاه (اختیاری)
                </p>
              </div>
            </div>

            <Input
              label="تلفن ثابت"
              placeholder="021XXXXXXXX"
              value={form.phone}
              onChange={f("phone")}
              type="tel"
              dir="ltr"
            />
            <Input
              label="موبایل"
              placeholder="09XXXXXXXXX"
              value={form.mobile}
              onChange={f("mobile")}
              type="tel"
              dir="ltr"
            />
            <Input
              label="کد پستی"
              placeholder="XXXXXXXXXX"
              value={form.postal_code}
              onChange={f("postal_code")}
              type="tel"
              dir="ltr"
              maxLength={10}
            />

            <Alert
              variant="info"
              message="اطلاعات تماس به مشتریان نمایش داده می‌شود و کمک می‌کند تا فروشگاه شما را راحت‌تر پیدا کنند."
              icon
            />
          </div>
        )}

        {/* ── Step 4: Confirm ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-50 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">تایید اطلاعات</h3>
                <p className="text-sm text-slate-500">
                  اطلاعات وارد شده را بررسی و تایید کنید
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Union info */}
              <SummarySection title="اطلاعات اتحادیه" color="primary">
                {selectedUnion && (
                  <>
                    <SummaryRow label="اتحادیه" value={selectedUnion.name} />
                    <SummaryRow label="شهر"     value={selectedUnion.city_name} />
                  </>
                )}
              </SummarySection>

              {/* Store info */}
              <SummarySection title="اطلاعات فروشگاه" color="secondary">
                <SummaryRow label="نام فروشگاه"   value={form.name} />
                <SummaryRow label="شماره پروانه" value={form.license_number} />
                <SummaryRow label="آدرس"          value={form.address} />
                {form.description && (
                  <SummaryRow label="توضیحات" value={form.description} />
                )}
              </SummarySection>

              {/* Contact info */}
              {(form.phone || form.mobile || form.postal_code) && (
                <SummarySection title="اطلاعات تماس" color="green">
                  {form.phone    && <SummaryRow label="تلفن"    value={form.phone} />}
                  {form.mobile   && <SummaryRow label="موبایل"  value={form.mobile} />}
                  {form.postal_code && <SummaryRow label="کد پستی" value={form.postal_code} />}
                </SummarySection>
              )}
            </div>

            <Alert
              variant="warning"
              message="پس از ارسال، فروشگاه در وضعیت «در انتظار تایید» قرار می‌گیرد. اتاق اصناف درخواست شما را بررسی خواهد کرد."
              icon
            />
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <Button
            variant="ghost"
            onClick={prev}
            disabled={step === 1}
            leftIcon={<ChevronRightIcon className="h-4 w-4" />}
          >
            مرحله قبل
          </Button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "rounded-full transition-all duration-300",
                  s.id === step
                    ? "w-6 h-2 bg-primary-600"
                    : s.id < step
                    ? "w-2 h-2 bg-primary-400"
                    : "w-2 h-2 bg-slate-200",
                )}
              />
            ))}
          </div>

          {step < 4 ? (
            <Button
              onClick={next}
              rightIcon={<ChevronLeftIcon className="h-4 w-4" />}
            >
              مرحله بعد
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              isLoading={saving}
              leftIcon={<CheckCircleIcon className="h-4 w-4" />}
            >
              ثبت فروشگاه
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────────────────────
function SummarySection({
  title, color, children,
}: {
  title: string;
  color: "primary" | "secondary" | "green";
  children: React.ReactNode;
}) {
  const colors = {
    primary:   "bg-primary-50 border-primary-200",
    secondary: "bg-secondary-50 border-secondary-200",
    green:     "bg-green-50 border-green-200",
  };
  const titleColors = {
    primary:   "text-primary-700",
    secondary: "text-secondary-700",
    green:     "text-green-700",
  };

  return (
    <div className={cn("rounded-xl border p-4", colors[color])}>
      <p className={cn("text-xs font-bold uppercase tracking-wider mb-3", titleColors[color])}>
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-left">{value}</span>
    </div>
  );
}