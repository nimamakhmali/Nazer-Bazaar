"use client";

import React, { useState, useEffect } from "react";
import {
  UserCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ClockIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader }            from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }                 from "@/components/ui/Badge";
import { Button }                from "@/components/ui/Button";
import { Input }                 from "@/components/ui/Input";
import { Avatar }                from "@/components/ui/Avatar";
import { Alert }                 from "@/components/ui/Alert";
import { PageLoader }            from "@/components/ui/Spinner";
import { useAuthStore }          from "@/store";
import apiClient                 from "@/services/api.client";
import { ENDPOINTS }             from "@/services/endpoints";
import { parseApiError }         from "@/utils/error.utils";
import { toJalaliWithTime }      from "@/utils/date.utils";
import { ROLE_LABELS }           from "@/constants/roles";
import type { Role }             from "@/types/common.types";
import toast                     from "react-hot-toast";
import { cn }                    from "@/lib/cn";
import Link                      from "next/link";

// ─── Validation Schema ────────────────────────────────────────────────────────
const profileSchema = z.object({
  first_name: z.string().min(2, "نام باید حداقل ۲ حرف باشد"),
  last_name:  z.string().min(2, "نام خانوادگی باید حداقل ۲ حرف باشد"),
  email: z
    .string()
    .email("ایمیل معتبر وارد کنید")
    .optional()
    .or(z.literal("")),
  national_code: z
    .string()
    .regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد")
    .optional()
    .or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserProfile {
  id:                number;
  full_name:         string;
  first_name:        string;
  last_name:         string;
  phone_number:      string;
  masked_phone:      string;
  email:             string;
  national_code:     string;
  role:              Role;
  role_display:      string;
  is_phone_verified: boolean;
  avatar:            string | null;
  date_joined:       string;
  last_login_at:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [profile,   setProfile]   = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving,  setIsSaving]  = useState(false);

  const isCustomer         = profile?.role === "customer";
  const hasNationalCode = !!user?.national_code?.trim();
  const showNationalAlert  = isCustomer && !hasNationalCode;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // ── fetch profile ──────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res  = await apiClient.get(ENDPOINTS.AUTH.PROFILE);
      const data = res.data?.data ?? res.data;
      setProfile(data);
      reset({
        first_name:    data.first_name    ?? "",
        last_name:     data.last_name     ?? "",
        email:         data.email         ?? "",
        national_code: data.national_code ?? "",
      });
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  // ── submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      const payload = {
        first_name:    data.first_name,
        last_name:     data.last_name,
        email:         data.email         || null,
        national_code: data.national_code || null,
      };
      const res     = await apiClient.patch(ENDPOINTS.AUTH.PROFILE, payload);
      const updated = res.data?.data ?? res.data;
      setProfile(updated);

      if (user) {
        setUser({
          ...user,
          first_name:    updated.first_name,
          last_name:     updated.last_name,
          full_name:     updated.full_name,
          email:         updated.email         ?? null,
          national_code: updated.national_code ?? null,
        });
      }

      toast.success("اطلاعات پروفایل با موفقیت بروزرسانی شد");
      setIsEditing(false);
    } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axiosErr = err as { response?: { data?: unknown; status?: number } };
          console.error("=== API ERROR ===");
          console.error("Status:", axiosErr.response?.status);
          console.error("Data:", JSON.stringify(axiosErr.response?.data, null, 2));
      }
      toast.error(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  // ── cancel ─────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    setIsEditing(false);
    reset({
      first_name:    profile?.first_name    ?? "",
      last_name:     profile?.last_name     ?? "",
      email:         profile?.email         ?? "",
      national_code: profile?.national_code ?? "",
    });
  };

  if (isLoading) return <PageLoader />;
  if (!profile)  return null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="پروفایل کاربری"
        subtitle="مشاهده و ویرایش اطلاعات شخصی"
        breadcrumbs={[{ label: "پروفایل" }]}
      />

      {/* ── هشدار کد ملی برای شهروندان ─────────────────────────────────── */}
      {showNationalAlert && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4
                         flex items-start gap-4 shadow-sm">
          <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-amber-100
                           flex items-center justify-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-sm mb-1">
              کد ملی شما تکمیل نشده است
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">
              برای ثبت شکایت از فروشگاه‌ها، ابتدا باید کد ملی خود را در
              پروفایل وارد کنید. لطفاً اطلاعات خود را تکمیل نمایید.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="flex-shrink-0 border-amber-400 text-amber-700
                       hover:bg-amber-100"
          >
            تکمیل اطلاعات
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Avatar Card */}
          <Card padding="md">
            <div className="text-center">
              <div className="inline-block relative mb-4">
                <Avatar
                  name={profile.full_name}
                  src={profile.avatar}
                  size="xl"
                  status={profile.is_phone_verified ? "online" : "offline"}
                />
                <button
                  className={cn(
                    "absolute bottom-0 left-0 h-9 w-9 rounded-full",
                    "bg-primary-600 hover:bg-primary-700",
                    "text-white shadow-lg transition-colors",
                    "flex items-center justify-center"
                  )}
                  aria-label="تغییر تصویر پروفایل"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-slate-800">
                {profile.full_name}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {profile.masked_phone}
              </p>

              <div className="mt-4">
                <Badge
                  variant="primary"
                  size="md"
                  icon={<ShieldCheckIcon className="h-3.5 w-3.5" />}
                >
                  {profile.role_display}
                </Badge>
              </div>

              {/* وضعیت تکمیل پروفایل برای شهروند */}
              {isCustomer && (
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    تکمیل پروفایل
                  </p>
                  <div className="space-y-1.5">
                    <ProfileCompletionRow
                      label="کد ملی"
                      isDone={hasNationalCode}
                      required
                    />
                    <ProfileCompletionRow
                      label="نام و نام خانوادگی"
                      isDone={
                        !!profile.first_name?.trim() &&
                        !!profile.last_name?.trim()
                      }
                    />
                    <ProfileCompletionRow
                      label="ایمیل"
                      isDone={!!profile.email?.trim()}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Account Stats */}
          <Card padding="sm">
            <div className="divide-y divide-slate-100">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-500">تاریخ عضویت</span>
                </div>
                <span className="text-xs font-medium text-slate-700">
                  {toJalaliWithTime(profile.date_joined)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-500">آخرین ورود</span>
                </div>
                <span className="text-xs font-medium text-slate-700">
                  {profile.last_login_at
                    ? toJalaliWithTime(profile.last_login_at)
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <PhoneIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-500">وضعیت موبایل</span>
                </div>
                {profile.is_phone_verified ? (
                  <Badge variant="success" size="sm" dot>تایید شده</Badge>
                ) : (
                  <Badge variant="warning" size="sm" dot>تایید نشده</Badge>
                )}
              </div>
            </div>
          </Card>

          <Alert
            variant="info"
            message="برای تغییر شماره موبایل یا رمز عبور، با پشتیبانی تماس بگیرید."
            icon
          />
        </div>

        {/* ── Main Form ────────────────────────────────────────────────── */}
        <Card className="lg:col-span-2" padding="md">
          <CardHeader>
            <CardTitle subtitle="ویرایش اطلاعات شخصی">
              اطلاعات کاربری
            </CardTitle>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                leftIcon={<PencilSquareIcon className="h-4 w-4" />}
              >
                ویرایش
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  leftIcon={<XMarkIcon className="h-4 w-4" />}
                >
                  انصراف
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit(onSubmit)}
                  isLoading={isSaving}
                  leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                >
                  ذخیره تغییرات
                </Button>
              </div>
            )}
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* نام و نام خانوادگی */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="نام"
                {...register("first_name")}
                error={errors.first_name?.message}
                disabled={!isEditing}
                leftIcon={<UserCircleIcon className="h-4 w-4" />}
                required
              />
              <Input
                label="نام خانوادگی"
                {...register("last_name")}
                error={errors.last_name?.message}
                disabled={!isEditing}
                leftIcon={<UserCircleIcon className="h-4 w-4" />}
                required
              />
            </div>

            {/* موبایل و ایمیل */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="شماره موبایل"
                value={profile.phone_number}
                disabled
                leftIcon={<PhoneIcon className="h-4 w-4" />}
                hint="غیرقابل تغییر"
              />
              <Input
                label="ایمیل"
                type="email"
                {...register("email")}
                error={errors.email?.message}
                disabled={!isEditing}
                leftIcon={<EnvelopeIcon className="h-4 w-4" />}
                placeholder="example@domain.com"
              />
            </div>

            {/* کد ملی و نقش */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* کد ملی - با ستاره قرمز برای شهروندان */}
              <div className="relative">
                <Input
                  label={
                    isCustomer ? (
                      <span className="flex items-center gap-1">
                        کد ملی
                        <span
                          className="text-red-500 text-base leading-none"
                          title="الزامی برای ثبت شکایت"
                        >
                          ✱
                        </span>
                        {!hasNationalCode && (
                          <span className="text-xs text-amber-600 font-normal">
                            (الزامی برای ثبت شکایت)
                          </span>
                        )}
                      </span>
                    ) : (
                      "کد ملی"
                    )
                  }
                  {...register("national_code")}
                  error={errors.national_code?.message}
                  disabled={!isEditing}
                  leftIcon={
                    <IdentificationIcon
                      className={cn(
                        "h-4 w-4",
                        showNationalAlert && !isEditing
                          ? "text-amber-500"
                          : "text-slate-400"
                      )}
                    />
                  }
                  placeholder="۱۲۳۴۵۶۷۸۹۰"
                  maxLength={10}
                  className={cn(
                    showNationalAlert &&
                      "border-amber-400 focus:ring-amber-200 focus:border-amber-500"
                  )}
                />
                {/* نوار هشدار زیر فیلد کد ملی */}
                {isCustomer && !hasNationalCode && !isEditing && (
                  <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    بدون کد ملی نمی‌توانید شکایت ثبت کنید
                  </p>
                )}
              </div>

              <Input
                label="نقش سیستمی"
                value={profile.role_display}
                disabled
                leftIcon={<ShieldCheckIcon className="h-4 w-4" />}
                hint="غیرقابل تغییر"
              />
            </div>

            {/* Info box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary-100 flex items-center
                                 justify-center flex-shrink-0">
                  <ShieldCheckIcon className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700 mb-1">
                    نقش شما: {ROLE_LABELS[profile.role as Role]}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    نقش کاربری شما توسط ادمین سیستم تعیین شده و غیرقابل تغییر
                    است. برای تغییر نقش با پشتیبانی تماس بگیرید.
                  </p>
                </div>
              </div>
            </div>

            {/* دکمه ویرایش سریع برای شهروند بدون کد ملی */}
            {showNationalAlert && !isEditing && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  leftIcon={<PencilSquareIcon className="h-4 w-4" />}
                  className="border-amber-400 text-amber-700 hover:bg-amber-50"
                >
                  ویرایش و تکمیل اطلاعات
                </Button>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-component: Profile Completion Row ────────────────────────────────────
function ProfileCompletionRow({
  label,
  isDone,
  required = false,
}: {
  label:     string;
  isDone:    boolean;
  required?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">{label}</span>
        {required && !isDone && (
          <span className="text-red-500 text-xs leading-none">✱</span>
        )}
      </div>
      {isDone ? (
        <CheckCircleIcon className="h-4 w-4 text-green-500" />
      ) : (
        <div className={cn(
          "h-4 w-4 rounded-full border-2",
          required ? "border-amber-400" : "border-slate-300"
        )} />
      )}
    </div>
  );
}