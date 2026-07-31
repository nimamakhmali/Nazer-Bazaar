"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BuildingStorefrontIcon, CubeIcon, CalendarIcon,
  PaperClipIcon, ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon, CloudArrowUpIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Badge }         from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert }         from "@/components/ui/Alert";
import { Button }        from "@/components/ui/Button";
import { PageLoader }    from "@/components/ui/Spinner";
import { ComplaintTimeline, type TimelineStep } from
  "@/features/complaints/components/ComplaintTimeline";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { toJalaliWithTime, toJalali, timeAgo } from "@/utils/date.utils";
import { formatPrice }   from "@/utils/number.utils";
import { cn }            from "@/lib/cn";
import toast             from "react-hot-toast";
import Link              from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface ComplaintDetail {
  uuid:            string;
  tracking_code:   string;  // ✅ اضافه شد
  customer: {
    id: number; full_name: string;
    phone_number: string; role: string;
  };
  store:           number;
  store_name:      string;
  product:         number;
  product_name:    string;
  title:           string;
  description:     string;
  price_reported:  number;
  price_reported_formatted: string;  // ✅ اضافه شد
  price_proof:     string | null;
  status:          string;
  status_display:  string;
  assigned_to:     number | null;
  resolution_note: string | null;
  created_at:      string;
  updated_at:      string;
  attachments: {
    id: number; file: string;
    description: string; uploaded_by: number; created_at: string;
  }[];
  responses: {
    id: number;
    user: { id: number; full_name: string; phone_number: string; role: string };
    response_text: string; is_internal_note: boolean; created_at: string;
  }[];
}

const BADGE_MAP: Record<string,
  "success" | "danger" | "warning" | "info" | "default"
> = {
  submitted: "info", reviewing: "warning", referred: "warning",
  inspecting: "warning", confirmed: "success", rejected: "danger", closed: "default",
};

// Guide messages by status
const STATUS_GUIDES: Record<string, { icon: string; message: string; type: "info"|"success"|"warning"|"error" }> = {
  submitted:  {
    icon: "📋",
    message: "شکایت شما ثبت شد. در انتظار بررسی اولیه توسط کارشناسان هستیم.",
    type: "info",
  },
  reviewing:  {
    icon: "🔍",
    message: "شکایت شما در حال بررسی است. لطفاً صبور باشید.",
    type: "info",
  },
  referred:   {
    icon: "📨",
    message: "شکایت شما به بازرس مربوطه ارجاع داده شده و در دست بررسی است.",
    type: "info",
  },
  inspecting: {
    icon: "🔎",
    message: "بازرس در حال بازرسی میدانی فروشگاه است.",
    type: "info",
  },
  confirmed:  {
    icon: "✅",
    message: "شکایت شما تایید شد! تخلف فروشگاه به اثبات رسید.",
    type: "success",
  },
  rejected:   {
    icon: "❌",
    message: "متاسفانه شکایت شما پس از بررسی رد شد. برای اطلاعات بیشتر با کارشناسان تماس بگیرید.",
    type: "error",
  },
  closed:     {
    icon: "🔒",
    message: "پرونده این شکایت مختومه شده است.",
    type: "info",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerComplaintDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const router   = useRouter();

  const [complaint,   setComplaint]   = useState<ComplaintDetail | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [uploadFile,  setUploadFile]  = useState<File | null>(null);
  const [uploading,   setUploading]   = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchComplaint = async () => {
    try {
      const r = await apiClient.get(ENDPOINTS.COMPLAINTS.DETAIL(uuid));
      const data = r.data?.data ?? r.data;
      console.log("✅ Complaint Data:", data);  // ✅ Debug
      setComplaint(data);
    } catch (err) {
      console.error("❌ Fetch Error:", err);
      toast.error("شکایت یافت نشد");
      router.push("/customer/complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaint(); }, [uuid]);

  // ── upload supplementary attachment ───────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadFile) { toast.error("فایل را انتخاب کنید"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("description", "مدرک تکمیلی ارسالی توسط شاکی");
      toast.success("مدرک با موفقیت ارسال شد");
      setUploadFile(null);
      await fetchComplaint();
    } catch {
      toast.error("خطا در ارسال مدرک");
    } finally {
      setUploading(false);
    }
  };

  if (loading)    return <PageLoader />;
  if (!complaint) return null;

  const guide = STATUS_GUIDES[complaint.status];

  // Build timeline
// ✅ Build timeline - ساده‌شده
  const timelineSteps: TimelineStep[] = [
    {
      status: "submitted",
      label: "ثبت شکایت",
      date: complaint.created_at,
      by: complaint.customer.full_name,
    },
  ];

  // Public responses only
  const publicResponses = complaint.responses.filter((r) => !r.is_internal_note);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title={complaint.title}
        subtitle={`شکایت از: ${complaint.store_name}`}
        breadcrumbs={[
          { label: "داشبورد",   href: "/customer/overview" },
          { label: "شکایات من", href: "/customer/complaints" },
          { label: "جزئیات" },
        ]}
        actions={
          <Badge
            variant={BADGE_MAP[complaint.status] ?? "default"}
            dot
            size="md"
          >
            {complaint.status_display}
          </Badge>
        }
      />

      {/* Status Guide */}
      {guide && (
        <div className={cn(
          "flex items-start gap-4 p-5 rounded-2xl border",
          guide.type === "success" ? "bg-green-50 border-green-200"
          : guide.type === "error" ? "bg-red-50 border-red-200"
          : guide.type === "warning" ? "bg-amber-50 border-amber-200"
          : "bg-blue-50 border-blue-200"
        )}>
          <span className="text-3xl flex-shrink-0">{guide.icon}</span>
          <div>
            <p className={cn(
              "font-bold mb-0.5",
              guide.type === "success" ? "text-green-800"
              : guide.type === "error" ? "text-red-800"
              : guide.type === "warning" ? "text-amber-800"
              : "text-blue-800"
            )}>
              وضعیت شکایت: {complaint.status_display}
            </p>
            <p className={cn(
              "text-sm leading-relaxed",
              guide.type === "success" ? "text-green-700"
              : guide.type === "error" ? "text-red-700"
              : guide.type === "warning" ? "text-amber-700"
              : "text-blue-700"
            )}>
              {guide.message}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Main Content ── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Info */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>جزئیات شکایت</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {[
                { icon: BuildingStorefrontIcon, label: "فروشگاه", value: complaint.store_name },
                { icon: CubeIcon,               label: "محصول",   value: complaint.product_name },
                { icon: CalendarIcon,            label: "تاریخ ثبت", value: toJalaliWithTime(complaint.created_at) },
                { icon: CalendarIcon,            label: "آخرین بروزرسانی", value: timeAgo(complaint.updated_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}
                     className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="h-9 w-9 rounded-xl bg-white border border-slate-200
                                   flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ Price - استفاده از price_reported_formatted */}
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl mb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-red-800">قیمتی که پرداختید:</p>
                <p className="text-xl font-bold text-red-700">
                  {complaint.price_reported_formatted 
                    ? `${complaint.price_reported_formatted} ریال`
                    : `${formatPrice(complaint.price_reported)} ریال`}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                شرح شکایت
              </p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {complaint.description}
              </p>
            </div>
          </Card>

          {/* Timeline */}
          <Card padding="md">
            <CardHeader>
              <CardTitle subtitle="مراحل رسیدگی به شکایت شما">
                پیشرفت پرونده
              </CardTitle>
            </CardHeader>
            <ComplaintTimeline
              steps={timelineSteps}
              currentStatus={complaint.status}
            />
          </Card>

          {/* Public responses */}
          {publicResponses.length > 0 && (
            <Card padding="md">
              <CardHeader>
                <CardTitle subtitle="پاسخ‌های رسمی سازمان">
                  پاسخ کارشناسان
                </CardTitle>
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-slate-300" />
              </CardHeader>
              <div className="space-y-3">
                {publicResponses.map((resp) => (
                  <div
                    key={resp.id}
                    className="p-4 bg-primary-50 border border-primary-100 rounded-2xl"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-7 w-7 rounded-full bg-primary-200 flex items-center
                                       justify-center text-xs font-bold text-primary-800">
                        {resp.user.full_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary-800">
                          {resp.user.full_name}
                        </p>
                        <p className="text-xs text-primary-500">
                          {timeAgo(resp.created_at)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-primary-800 leading-relaxed whitespace-pre-line">
                      {resp.response_text}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Upload supplementary attachment (only in reviewing) */}
          {complaint.status === "reviewing" && (
            <Card padding="md">
              <CardHeader>
                <CardTitle subtitle="مدرک بیشتری دارید؟">
                  ارسال مدرک تکمیلی
                </CardTitle>
                <CloudArrowUpIcon className="h-5 w-5 text-slate-300" />
              </CardHeader>
              <Alert
                variant="info"
                message="اگر مدرک اضافی دارید (فاکتور، عکس، ویدیو) می‌توانید در این مرحله ارسال کنید."
                icon
              />
              <div className="mt-4 space-y-3">
                <label className="block">
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8
                                   text-center cursor-pointer hover:border-primary-400
                                   hover:bg-primary-50/30 transition-all">
                    <CloudArrowUpIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 font-medium">
                      {uploadFile ? uploadFile.name : "انتخاب فایل"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      JPG, PNG, PDF حداکثر ۵ مگابایت
                    </p>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </label>
                <Button
                  onClick={handleUpload}
                  isLoading={uploading}
                  disabled={!uploadFile}
                  fullWidth
                  leftIcon={<CloudArrowUpIcon className="h-4 w-4" />}
                >
                  ارسال مدرک
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">

          {/* ✅ Tracking Code - نمایش کد عددی */}
          <Card padding="md">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              کد پیگیری
            </p>
            <div className="p-4 bg-primary-50 border-2 border-primary-100 rounded-xl text-center">
              <p className="font-mono text-3xl font-bold text-primary-800 tracking-wider">
                {complaint.tracking_code || complaint.uuid}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">
                این کد را یادداشت کنید
              </p>
            </div>
            <button
              onClick={() => {
                const code = complaint.tracking_code || complaint.uuid;
                navigator.clipboard.writeText(code);
                toast.success("کد کپی شد");
              }}
              className="mt-3 w-full py-2.5 bg-primary-700 text-white rounded-xl text-sm 
                         font-bold hover:bg-primary-800 transition-colors"
            >
              📋 کپی کد پیگیری
            </button>
          </Card>

          {/* Status summary */}
          <Card padding="md">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              خلاصه وضعیت
            </p>
            <div className="flex flex-col items-center gap-3">
              <div className="text-5xl">
                {STATUS_GUIDES[complaint.status]?.icon ?? "📋"}
              </div>
              <Badge
                variant={BADGE_MAP[complaint.status] ?? "default"}
                dot
                size="md"
              >
                {complaint.status_display}
              </Badge>
              <p className="text-xs text-slate-400 text-center">
                آخرین بروزرسانی: {timeAgo(complaint.updated_at)}
              </p>
            </div>
          </Card>

          {/* Resolution note */}
          {complaint.resolution_note && (
            <Card padding="md" className="border-green-100">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">
                نتیجه نهایی
              </p>
              <div className="p-3 bg-green-50 rounded-xl">
                <p className="text-sm text-green-800 leading-relaxed">
                  {complaint.resolution_note}
                </p>
              </div>
            </Card>
          )}

          {/* Attachments */}
          {(complaint.price_proof || complaint.attachments.length > 0) && (
            <Card padding="md">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                مدارک ارسالی
              </p>
              <div className="space-y-2">
                {complaint.price_proof && (
                  <a
                    href={complaint.price_proof}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-primary-50
                               rounded-xl text-xs font-medium text-slate-600
                               hover:text-primary-700 transition-colors"
                  >
                    <span>📄</span>
                    مدرک قیمت
                  </a>
                )}
                {complaint.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-primary-50
                               rounded-xl text-xs font-medium text-slate-600
                               hover:text-primary-700 transition-colors"
                  >
                    <span>📎</span>
                    {att.description || "پیوست"}
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Help */}
          <Card padding="md" className="bg-primary-50/40 border-primary-100">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-primary-800 mb-1">راهنما</p>
                <p className="text-xs text-primary-700 leading-relaxed">
                  برای پیگیری شکایت می‌توانید از کد رهگیری استفاده کنید.
                  زمان رسیدگی معمولاً ۳ تا ۷ روز کاری است.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}