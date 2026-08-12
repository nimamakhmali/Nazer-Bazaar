"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowPathIcon,
  BuildingStorefrontIcon,
  UserCircleIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { parseApiError } from "@/utils/error.utils";
import { toJalali, toJalaliWithTime } from "@/utils/date.utils";
import { formatPrice } from "@/utils/number.utils";
import { CONFIG } from "@/constants/config";
import { cn } from "@/lib/cn";

import {
  ComplaintTimeline,
  type TimelineStep,
} from "@/features/complaints/components/ComplaintTimeline";
import type { Complaint } from "@/features/complaints/types/complaints.types";

// ─────────────────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<
  string,
  "success" | "danger" | "warning" | "info" | "default"
> = {
  submitted: "info",
  reviewing: "warning",
  referred: "warning",
  inspecting: "warning",
  confirmed: "success",
  rejected: "danger",
  closed: "default",
};

/** فایل‌های media که مسیر relative دارند را به آدرس کامل بک‌اند تبدیل می‌کند */
const getMediaUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = CONFIG.API_URL.replace(/\/api\/v\d+\/?$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  uuid: string;
}

export function AdminComplaintDetailClient({ uuid }: Props) {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplaint = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(ENDPOINTS.COMPLAINTS.DETAIL(uuid));
      const data = (res.data?.data ?? res.data) as Complaint;
      setComplaint(data);
    } catch (err) {
      setError(parseApiError(err));
      setComplaint(null);
    } finally {
      setIsLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div
          className="h-10 w-10 rounded-full border-4 border-primary-100
                     border-t-primary-600 animate-spin"
        />
        <p className="text-sm text-slate-400 mt-4">
          در حال بارگذاری جزئیات شکایت...
        </p>
      </div>
    );
  }

  // ── Error ──
  if (error || !complaint) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div
          className="h-16 w-16 rounded-full bg-red-50 flex items-center
                     justify-center mx-auto mb-4"
        >
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          شکایت یافت نشد
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {error || "شکایت مورد نظر وجود ندارد یا حذف شده است."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            onClick={fetchComplaint}
          >
            تلاش مجدد
          </Button>
          <Link href="/admin/complaints">
            <Button
              variant="primary"
              leftIcon={<ArrowRightIcon className="h-4 w-4" />}
            >
              بازگشت به لیست
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isUrgent =
    ["submitted", "reviewing", "inspecting"].includes(complaint.status) &&
    (complaint.is_overdue_48h || complaint.is_overdue_96h);

  const timelineSteps: TimelineStep[] = [
    {
      status: "submitted",
      label: "ثبت شکایت",
      date: toJalaliWithTime(complaint.created_at),
      by: complaint.customer?.full_name,
    },
  ];

  const priceProofUrl = getMediaUrl(complaint.price_proof);

  return (
    <div className="space-y-6">
      <PageHeader
        title="جزئیات شکایت"
        subtitle={complaint.title}
        breadcrumbs={[
          { label: "ادمین", href: "/dashboard" },
          { label: "شکایات", href: "/admin/complaints" },
          { label: "جزئیات" },
        ]}
        actions={
          <Link href="/admin/complaints">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowRightIcon className="h-4 w-4" />}
            >
              بازگشت به لیست
            </Button>
          </Link>
        }
      />

      {isUrgent && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-semibold">
            این شکایت بیش از حد معمول در وضعیت باز مانده و نیاز به پیگیری فوری دارد.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle subtitle={`کد رهگیری: ${complaint.tracking_code ?? "—"}`}>
                {complaint.title}
              </CardTitle>
              <Badge
                variant={STATUS_BADGE[complaint.status] ?? "default"}
                size="md"
                dot
              >
                {complaint.status_display}
              </Badge>
            </CardHeader>

            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {complaint.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-400 mb-1">قیمت گزارش‌شده</p>
                <p className="text-sm font-bold text-red-600">
                  {formatPrice(complaint.price_reported)} ریال
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">تاریخ ثبت</p>
                <p className="text-sm font-semibold text-slate-700">
                  {toJalali(complaint.created_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">آخرین بروزرسانی</p>
                <p className="text-sm font-semibold text-slate-700">
                  {toJalali(complaint.updated_at)}
                </p>
              </div>
            </div>
          </Card>

          {/* Price proof */}
          {priceProofUrl && (
            <Card>
              <CardHeader>
                <CardTitle>مدرک قیمت</CardTitle>
              </CardHeader>
              <a href={priceProofUrl} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={priceProofUrl}
                  alt="مدرک قیمت"
                  className="max-h-80 rounded-xl border border-slate-200 object-contain"
                />
              </a>
            </Card>
          )}

          {/* Attachments */}
          {complaint.attachments?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>پیوست‌ها</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {complaint.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={getMediaUrl(att.file) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    {att.description || "دانلود پیوست"}
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Responses */}
          <Card>
            <CardHeader>
              <CardTitle>پاسخ‌ها و یادداشت‌ها</CardTitle>
            </CardHeader>

            {complaint.responses?.length ? (
              <div className="space-y-4">
                {complaint.responses.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      "p-4 rounded-xl border",
                      r.is_internal_note
                        ? "bg-amber-50 border-amber-200"
                        : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <UserCircleIcon className="h-5 w-5 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">
                          {r.user?.full_name}
                        </span>
                        {r.is_internal_note && (
                          <Badge
                            variant="warning"
                            size="sm"
                            icon={<LockClosedIcon className="h-3 w-3" />}
                          >
                            یادداشت داخلی
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {toJalaliWithTime(r.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {r.response_text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChatBubbleLeftRightIcon className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">هنوز پاسخی ثبت نشده است.</p>
              </div>
            )}
          </Card>
        </div>

        {/* ── Side column ── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>روند رسیدگی</CardTitle>
            </CardHeader>
            <ComplaintTimeline
              steps={timelineSteps}
              currentStatus={complaint.status}
            />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>شاکی</CardTitle>
            </CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
                <UserCircleIcon className="h-6 w-6 text-primary-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {complaint.customer?.full_name}
                </p>
                <p className="text-xs text-slate-400">
                  {complaint.customer?.phone_number}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>مشخصات تخلف</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <BuildingStorefrontIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">فروشگاه</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {complaint.store_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CubeIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">محصول</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {complaint.product_name}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ارجاع و پیگیری</CardTitle>
            </CardHeader>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">سطح ارجاع</span>
                <span className="font-semibold text-slate-700">
                  {complaint.escalation_level ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ساعات سپری‌شده</span>
                <span className="font-semibold text-slate-700">
                  {complaint.hours_since_created ?? 0} ساعت
                </span>
              </div>
              {complaint.assigned_union_manager_name && (
                <div className="flex justify-between">
                  <span className="text-slate-400">رئیس اتحادیه</span>
                  <span className="font-semibold text-slate-700">
                    {complaint.assigned_union_manager_name}
                  </span>
                </div>
              )}
              {complaint.assigned_chamber_manager_name && (
                <div className="flex justify-between">
                  <span className="text-slate-400">مدیر اتاق اصناف</span>
                  <span className="font-semibold text-slate-700">
                    {complaint.assigned_chamber_manager_name}
                  </span>
                </div>
              )}
              {complaint.assigned_province_manager_name && (
                <div className="flex justify-between">
                  <span className="text-slate-400">ناظر استانداری</span>
                  <span className="font-semibold text-slate-700">
                    {complaint.assigned_province_manager_name}
                  </span>
                </div>
              )}
              {complaint.resolution_note && (
                <div className="pt-3 border-t border-slate-100 mt-3">
                  <p className="text-xs text-slate-400 mb-1">یادداشت نهایی</p>
                  <p className="text-sm text-slate-600">
                    {complaint.resolution_note}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}