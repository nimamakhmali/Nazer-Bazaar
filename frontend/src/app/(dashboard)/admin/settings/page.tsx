"use client";

import React, { useState, useEffect } from "react";
import {
  Cog6ToothIcon, BellIcon, ShieldCheckIcon,
  GlobeAltIcon, PaintBrushIcon, DocumentTextIcon,
  CheckCircleIcon, ExclamationTriangleIcon,
  ClockIcon, EnvelopeIcon, PhoneIcon,
} from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import apiClient from "@/services/api.client";
import { parseApiError } from "@/utils/error.utils";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Schemas
// ─────────────────────────────────────────────────────────────────────────────
const generalSettingsSchema = z.object({
  site_name:        z.string().min(3, "نام سایت باید حداقل ۳ حرف باشد"),
  site_description: z.string().min(10, "توضیحات باید حداقل ۱۰ حرف باشد"),
  support_email:    z.string().email("ایمیل معتبر وارد کنید"),
  support_phone:    z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر وارد کنید"),
  copyright_text:   z.string().min(5, "متن کپی‌رایت الزامی است"),
});

type GeneralSettingsData = z.infer<typeof generalSettingsSchema>;

interface Settings {
  // General
  site_name:        string;
  site_description: string;
  support_email:    string;
  support_phone:    string;
  copyright_text:   string;

  // Features
  enable_registration:  boolean;
  enable_complaints:    boolean;
  enable_public_prices: boolean;
  enable_store_registration: boolean;

  // Notifications
  email_notifications:  boolean;
  sms_notifications:    boolean;
  push_notifications:   boolean;

  // Security
  otp_expire_minutes:     number;
  max_login_attempts:     number;
  session_timeout_hours:  number;

  // Pricing
  min_price_ratio:  number; // 0.8 = 80%
  max_price_ratio:  number; // 1.0 = 100%
}

type TabId = "general" | "features" | "notifications" | "security" | "pricing";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{className?:string}> }[] = [
  { id: "general",       label: "عمومی",           icon: Cog6ToothIcon },
  { id: "features",      label: "امکانات",         icon: GlobeAltIcon },
  { id: "notifications", label: "اعلان‌ها",        icon: BellIcon },
  { id: "security",      label: "امنیت",           icon: ShieldCheckIcon },
  { id: "pricing",       label: "قیمت‌گذاری",      icon: DocumentTextIcon },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GeneralSettingsData>({
    resolver: zodResolver(generalSettingsSchema),
  });

  // ── fetch settings ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        // این endpoint فرضی است - در backend باید پیاده‌سازی شود
        const res = await apiClient.get("/api/v1/settings/");
        const data = res.data?.data ?? res.data;
        setSettings(data);
        reset({
          site_name:        data.site_name,
          site_description: data.site_description,
          support_email:    data.support_email,
          support_phone:    data.support_phone,
          copyright_text:   data.copyright_text,
        });
      } catch {
        // fallback to default
        const defaultSettings: Settings = {
          site_name:        "سامانه پایش قیمت کالا",
          site_description: "سامانه نظارت بر قیمت‌گذاری کالاهای اتحادیه‌های صنفی",
          support_email:    "support@example.com",
          support_phone:    "09123456789",
          copyright_text:   "© ۱۴۰۳ — کلیه حقوق محفوظ است",
          enable_registration: true,
          enable_complaints: true,
          enable_public_prices: true,
          enable_store_registration: true,
          email_notifications: true,
          sms_notifications: true,
          push_notifications: false,
          otp_expire_minutes: 2,
          max_login_attempts: 5,
          session_timeout_hours: 24,
          min_price_ratio: 0.8,
          max_price_ratio: 1.0,
        };
        setSettings(defaultSettings);
        reset({
          site_name:        defaultSettings.site_name,
          site_description: defaultSettings.site_description,
          support_email:    defaultSettings.support_email,
          support_phone:    defaultSettings.support_phone,
          copyright_text:   defaultSettings.copyright_text,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [reset]);

  // ── save general ───────────────────────────────────────────────────────────
  const onSubmitGeneral = async (data: GeneralSettingsData) => {
    setIsSaving(true);
    try {
      await apiClient.patch("/api/v1/settings/", data);
      toast.success("تنظیمات عمومی با موفقیت ذخیره شد");
      setSettings((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  // ── toggle feature ─────────────────────────────────────────────────────────
  const toggleFeature = async (key: keyof Settings, value: boolean) => {
    if (!settings) return;
    try {
      await apiClient.patch("/api/v1/settings/", { [key]: value });
      setSettings({ ...settings, [key]: value });
      toast.success("تنظیمات بروزرسانی شد");
    } catch (err) {
      toast.error(parseApiError(err));
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-block h-12 w-12 rounded-full border-4 border-slate-200
                         border-t-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="تنظیمات سیستم"
        subtitle="پیکربندی عمومی و مدیریت تنظیمات سامانه"
        breadcrumbs={[{ label: "تنظیمات" }]}
      />

      {/* Warning */}
      <Alert
        variant="warning"
        icon
        message="تغییر تنظیمات سیستم می‌تواند بر عملکرد کلی سامانه تأثیر بگذارد. با دقت اقدام کنید."
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* ── Sidebar Tabs ── */}
        <div className="xl:col-span-1">
          <Card padding="sm">
            <div className="space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold",
                    "transition-all duration-200 text-right",
                    activeTab === tab.id
                      ? "bg-primary-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  )}
                >
                  <tab.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Main Content ── */}
        <div className="xl:col-span-3 space-y-5">
          {/* Tab: General */}
          {activeTab === "general" && (
            <Card padding="md">
              <CardHeader>
                <CardTitle subtitle="اطلاعات اصلی سامانه">
                  تنظیمات عمومی
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleSubmit(onSubmitGeneral)}
                  isLoading={isSaving}
                  leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                >
                  ذخیره تغییرات
                </Button>
              </CardHeader>

              <form onSubmit={handleSubmit(onSubmitGeneral)} className="space-y-5">
                <Input
                  label="نام سامانه"
                  {...register("site_name")}
                  error={errors.site_name?.message}
                  leftIcon={<GlobeAltIcon className="h-4 w-4" />}
                  required
                />

                <Textarea
                  label="توضیحات سامانه"
                  {...register("site_description")}
                  error={errors.site_description?.message}
                  rows={3}
                  required
                  showCharCount
                  maxLength={200}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="ایمیل پشتیبانی"
                    type="email"
                    {...register("support_email")}
                    error={errors.support_email?.message}
                    leftIcon={<EnvelopeIcon className="h-4 w-4" />}
                    required
                  />

                  <Input
                    label="موبایل پشتیبانی"
                    {...register("support_phone")}
                    error={errors.support_phone?.message}
                    leftIcon={<PhoneIcon className="h-4 w-4" />}
                    placeholder="09123456789"
                    required
                  />
                </div>

                <Input
                  label="متن کپی‌رایت (فوتر)"
                  {...register("copyright_text")}
                  error={errors.copyright_text?.message}
                  required
                />
              </form>
            </Card>
          )}

          {/* Tab: Features */}
          {activeTab === "features" && (
            <Card padding="md">
              <CardHeader>
                <CardTitle subtitle="فعال/غیرفعال کردن امکانات سامانه">
                  امکانات سیستم
                </CardTitle>
                <Badge variant="info" size="sm">
                  {[
                    settings.enable_registration,
                    settings.enable_complaints,
                    settings.enable_public_prices,
                    settings.enable_store_registration,
                  ].filter(Boolean).length}{" "}
                  / 4 فعال
                </Badge>
              </CardHeader>

              <div className="space-y-4">
                <FeatureToggle
                  label="ثبت‌نام کاربران جدید"
                  description="امکان ثبت‌نام شهروندان در سامانه"
                  checked={settings.enable_registration}
                  onChange={(v) => toggleFeature("enable_registration", v)}
                />
                <FeatureToggle
                  label="ثبت شکایت"
                  description="امکان ثبت شکایت توسط مردم"
                  checked={settings.enable_complaints}
                  onChange={(v) => toggleFeature("enable_complaints", v)}
                />
                <FeatureToggle
                  label="نمایش قیمت‌های عمومی"
                  description="نمایش قیمت‌ها برای کاربران مهمان"
                  checked={settings.enable_public_prices}
                  onChange={(v) => toggleFeature("enable_public_prices", v)}
                />
                <FeatureToggle
                  label="ثبت فروشگاه جدید"
                  description="امکان ثبت فروشگاه توسط صاحبان کسب"
                  checked={settings.enable_store_registration}
                  onChange={(v) => toggleFeature("enable_store_registration", v)}
                />
              </div>
            </Card>
          )}

          {/* Tab: Notifications */}
          {activeTab === "notifications" && (
            <Card padding="md">
              <CardHeader>
                <CardTitle subtitle="تنظیم کانال‌های ارسال اعلان">
                  اعلان‌ها
                </CardTitle>
              </CardHeader>

              <div className="space-y-4">
                <FeatureToggle
                  label="اعلان‌های ایمیلی"
                  description="ارسال اعلان‌ها از طریق ایمیل"
                  checked={settings.email_notifications}
                  onChange={(v) => toggleFeature("email_notifications", v)}
                  icon={<EnvelopeIcon className="h-5 w-5" />}
                />
                <FeatureToggle
                  label="اعلان‌های پیامکی (SMS)"
                  description="ارسال اعلان‌ها از طریق پیامک"
                  checked={settings.sms_notifications}
                  onChange={(v) => toggleFeature("sms_notifications", v)}
                  icon={<PhoneIcon className="h-5 w-5" />}
                />
                <FeatureToggle
                  label="اعلان‌های Push"
                  description="نوتیفیکیشن در مرورگر (در آینده)"
                  checked={settings.push_notifications}
                  onChange={(v) => toggleFeature("push_notifications", v)}
                  icon={<BellIcon className="h-5 w-5" />}
                />
              </div>
            </Card>
          )}

          {/* Tab: Security */}
          {activeTab === "security" && (
            <Card padding="md">
              <CardHeader>
                <CardTitle subtitle="پیکربندی امنیتی سیستم">
                  امنیت
                </CardTitle>
              </CardHeader>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <ClockIcon className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-bold text-slate-500">انقضای OTP</p>
                    </div>
                    <p className="text-2xl font-bold text-primary-700">
                      {settings.otp_expire_minutes}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">دقیقه</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheckIcon className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-bold text-slate-500">حداکثر تلاش ورود</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-700">
                      {settings.max_login_attempts}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">بار</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <ClockIcon className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-bold text-slate-500">Timeout نشست</p>
                    </div>
                    <p className="text-2xl font-bold text-secondary-700">
                      {settings.session_timeout_hours}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">ساعت</p>
                  </div>
                </div>

                <Alert
                  variant="info"
                  icon
                  message="تغییر این تنظیمات نیاز به دسترسی Developer دارد و از طریق فایل پیکربندی انجام می‌شود."
                />
              </div>
            </Card>
          )}

          {/* Tab: Pricing */}
          {activeTab === "pricing" && (
            <Card padding="md">
              <CardHeader>
                <CardTitle subtitle="محدوده مجاز قیمت‌گذاری فروشگاه‌ها">
                  تنظیمات قیمت‌گذاری
                </CardTitle>
              </CardHeader>

              <div className="space-y-5">
                <div className="p-5 bg-primary-50 border-2 border-primary-200 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center
                                     justify-center flex-shrink-0">
                      <DocumentTextIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary-900">
                        محدوده قیمت مجاز فروشگاه‌ها
                      </p>
                      <p className="text-xs text-primary-700 mt-0.5">
                        نسبت به قیمت مصوب اتحادیه
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-primary-200">
                      <p className="text-xs text-primary-600 mb-2">حداقل قیمت مجاز</p>
                      <p className="text-3xl font-bold text-primary-700">
                        {(settings.min_price_ratio * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1">از قیمت مصوب</p>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-primary-200">
                      <p className="text-xs text-primary-600 mb-2">حداکثر قیمت مجاز</p>
                      <p className="text-3xl font-bold text-primary-700">
                        {(settings.max_price_ratio * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1">از قیمت مصوب</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900 mb-1">
                        مثال محاسبه
                      </p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        اگر قیمت مصوب <strong>۱۰۰,۰۰۰ ریال</strong> باشد:
                        <br />
                        • حداقل مجاز: <strong>۸۰,۰۰۰ ریال</strong> (۸۰٪)
                        <br />
                        • حداکثر مجاز: <strong>۱۰۰,۰۰۰ ریال</strong> (۱۰۰٪)
                        <br />
                        • قیمت بیشتر از ۱۰۰,۰۰۰ ریال = گران‌فروشی
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Toggle Component
// ─────────────────────────────────────────────────────────────────────────────
function FeatureToggle({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label:       string;
  description: string;
  checked:     boolean;
  onChange:    (value: boolean) => void;
  icon?:       React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl
                     border border-slate-100 hover:border-slate-200 transition-colors">
      <div className="flex items-start gap-3 flex-1">
        {icon && (
          <div className="h-10 w-10 rounded-lg bg-white border border-slate-200
                           flex items-center justify-center flex-shrink-0 text-slate-500">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0 mr-4">
        <Toggle checked={checked} onChange={onChange} />
      </div>
    </div>
  );
}