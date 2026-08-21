"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BuildingStorefrontIcon, CubeIcon, CalendarIcon,
  PaperClipIcon, ChatBubbleLeftRightIcon, LockClosedIcon,
  CheckCircleIcon, XCircleIcon, UserCircleIcon,
  ShieldCheckIcon, ArrowPathIcon, ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Badge }         from "@/components/ui/Badge";
import { Button }        from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert }         from "@/components/ui/Alert";
import { PageLoader }    from "@/components/ui/Spinner";
import { Checkbox }      from "@/components/ui/Checkbox";
import { ComplaintTimeline, type TimelineStep } from
  "@/features/complaints/components/ComplaintTimeline";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { parseApiError } from "@/utils/error.utils";
import { toJalaliWithTime, toJalali, timeAgo } from "@/utils/date.utils";
import { formatPrice }   from "@/utils/number.utils";
import { cn }            from "@/lib/cn";
import toast             from "react-hot-toast";
import Link              from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface ComplaintDetail {
  uuid:            string;
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

const STATUS_ORDER: Record<string, number> = {
  submitted: 0, reviewing: 1, referred: 2,
  inspecting: 3, confirmed: 4, rejected: 4, closed: 5,
};

// ─────────────────────────────────────────────────────────────────────────────
export default function InspectorComplaintDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const router   = useRouter();

  const [complaint, setComplaint]  = useState<ComplaintDetail | null>(null);
  const [loading,   setLoading]    = useState(true);
  const [response,  setResponse]   = useState("");
  const [isInternal,setIsInternal] = useState(false);
  const [newStatus, setNewStatus]  = useState("");
  const [submitting,setSubmitting] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchComplaint = async () => {
    try {
      const r = await apiClient.get(ENDPOINTS.COMPLAINTS.DETAIL(uuid));
      setComplaint(r.data?.data ?? r.data);
    } catch {
      toast.error("شکایت یافت نشد");
      router.push("/inspector/complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaint(); }, [uuid]);

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!response.trim()) { toast.error("متن پاسخ را وارد کنید"); return; }
    setSubmitting(true);
    try {
      toast.success("پاسخ با موفقیت ثبت شد");
      setResponse("");
      setIsInternal(false);
      setNewStatus("");
      await fetchComplaint();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)    return <PageLoader />;
  if (!complaint) return null;

  // Build timeline steps from responses
  const timelineSteps: TimelineStep[] = [
    {
      status: "submitted",
      label:  "ثبت شکایت",
      date:   complaint.created_at,
      by:     complaint.customer.full_name,
    },
    {
      status: "reviewing",
      label:  "در حال بررسی",
      date:   complaint.status === "reviewing" ? complaint.updated_at : undefined,
    },
    {
      status: "referred",
      label:  "ارجاع به بازرس",
    },
    {
      status: "inspecting",
      label:  "در حال بازرسی",
    },
    {
      status: "confirmed",
      label:  "تایید شکایت",
      date:   complaint.status === "confirmed" ? complaint.updated_at : undefined,
      description:   complaint.resolution_note ?? undefined,
    },
    {
      status: "closed",
      label:  "مختومه",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={complaint.title}
        subtitle={`شکایت از فروشگاه: ${complaint.store_name}`}
        breadcrumbs={[
          { label: "بازرس",         href: "/inspector/overview" },
          { label: "شکایات محوله", href: "/inspector/complaints" },
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Main Content ── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Section 1 — Info */}
          <Card padding="md">
            <CardHeader>
              <CardTitle subtitle="اطلاعات ثبت شده">اطلاعات شکایت</CardTitle>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {[
                {
                  icon: BuildingStorefrontIcon,
                  label: "فروشگاه",
                  value: complaint.store_name,
                  link:  `/inspector/stores`,
                },
                {
                  icon: CubeIcon,
                  label: "محصول",
                  value: complaint.product_name,
                  link:  null,
                },
                {
                  icon: CalendarIcon,
                  label: "تاریخ ثبت",
                  value: toJalaliWithTime(complaint.created_at),
                  link:  null,
                },
                {
                  icon: CalendarIcon,
                  label: "آخرین بروزرسانی",
                  value: timeAgo(complaint.updated_at),
                  link:  null,
                },
              ].map(({ icon: Icon, label, value, link }) => (
                <div key={label}
                     className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="h-9 w-9 rounded-xl bg-white border border-slate-200
                                   flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{label}</p>
                    {link ? (
                      <Link href={link}>
                        <p className="text-sm font-semibold text-primary-600
                                       hover:underline truncate">{value}</p>
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Price boxes */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
                <p className="text-xs text-red-500 mb-1">قیمت پرداختی</p>
                <p className="text-lg font-bold text-red-700">
                  {formatPrice(complaint.price_reported)}
                </p>
                <p className="text-xs text-red-400">ریال</p>
              </div>
              <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl text-center">
                <p className="text-xs text-primary-500 mb-1">قیمت مصوب</p>
                <p className="text-lg font-bold text-primary-700">—</p>
                <p className="text-xs text-primary-400">ریال</p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                <p className="text-xs text-amber-600 mb-1">مبلغ تخلف تقریبی</p>
                <p className="text-lg font-bold text-amber-700">—</p>
                <p className="text-xs text-amber-400">ریال</p>
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

          {/* Section 2 — Attachments */}
          {(complaint.price_proof || complaint.attachments.length > 0) && (
            <Card padding="md">
              <CardHeader>
                <CardTitle subtitle="مدارک ارائه شده توسط شاکی">
                  مدارک و مستندات
                </CardTitle>
                <PaperClipIcon className="h-5 w-5 text-slate-300" />
              </CardHeader>
              <div className="space-y-2">
                {complaint.price_proof && (
                  <AttachmentRow
                    file={complaint.price_proof}
                    label="مدرک قیمت (رسید/فاکتور)"
                  />
                )}
                {complaint.attachments.map((att) => (
                  <AttachmentRow
                    key={att.id}
                    file={att.file}
                    label={att.description || "پیوست"}
                    date={att.created_at}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Section 3 — Timeline */}
          <Card padding="md">
            <CardHeader>
              <CardTitle subtitle="پیشرفت پرونده شکایت">جدول زمانی پرونده</CardTitle>
            </CardHeader>
            <ComplaintTimeline
              steps={timelineSteps}
              currentStatus={complaint.status}
            />
          </Card>

          {/* Section 4 — Responses */}
          <Card padding="md">
            <CardHeader>
              <CardTitle subtitle={`${complaint.responses.length} پاسخ ثبت شده`}>
                سابقه بررسی
              </CardTitle>
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-slate-300" />
            </CardHeader>
            {complaint.responses.length === 0 ? (
              <div className="text-center py-8">
                <ChatBubbleLeftRightIcon className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">هنوز پاسخی ثبت نشده است</p>
              </div>
            ) : (
              <div className="space-y-3">
                {complaint.responses.map((resp) => (
                  <ResponseRow key={resp.id} response={resp} />
                ))}
              </div>
            )}
          </Card>

          {/* Section 5 — Inspector Action */}
          <Card padding="md">
            <CardHeader>
              <CardTitle subtitle="ثبت نتیجه بازرسی و اقدامات">اقدام بازرس</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  متن پاسخ / نتیجه بازرسی
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="نتیجه بازرسی، اقدامات انجام شده و پیشنهادات را وارد کنید..."
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-100
                             focus:border-primary-400 resize-none transition-all
                             placeholder:text-slate-400"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <Checkbox
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  label="یادداشت داخلی"
                  description="فقط کارمندان سازمان می‌بینند"
                />
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    تغییر وضعیت
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 text-sm border
                               border-slate-200 rounded-xl bg-white focus:outline-none
                               focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="">بدون تغییر</option>
                    <option value="inspecting">در حال بازرسی</option>
                    <option value="confirmed">تایید شکایت</option>
                    <option value="rejected">رد شکایت</option>
                    <option value="closed">مختومه کردن پرونده</option>
                  </select>
                </div>
              </div>

              {isInternal && (
                <Alert
                  variant="info"
                  message="این یادداشت فقط برای کارمندان سازمان قابل مشاهده است."
                  icon
                />
              )}

              {newStatus === "confirmed" && (
                <Alert
                  variant="success"
                  message="با تایید شکایت، اطلاع‌رسانی به شاکی انجام می‌شود."
                  icon
                />
              )}

              {newStatus === "rejected" && (
                <Alert
                  variant="warning"
                  message="با رد شکایت، دلیل رد به شاکی اطلاع داده می‌شود."
                  icon
                />
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-400">
                  {response.length} کاراکتر
                </p>
                <Button
                  onClick={handleSubmit}
                  isLoading={submitting}
                  leftIcon={<ShieldCheckIcon className="h-4 w-4" />}
                >
                  ثبت نتیجه بازرسی
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">

          {/* Complainant */}
          <Card padding="md">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              اطلاعات شاکی
            </p>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center
                               justify-center flex-shrink-0">
                <UserCircleIcon className="h-7 w-7 text-primary-600" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">
                  {complaint.customer.full_name}
                </p>
                <p className="text-xs font-mono text-slate-500">
                  {complaint.customer.phone_number}
                </p>
                <Badge variant="info" size="sm" className="mt-1">شهروند</Badge>
              </div>
            </div>
          </Card>

          {/* Current status */}
          <Card padding="md">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              وضعیت فعلی پرونده
            </p>
            <div className="flex flex-col items-center gap-3">
              <div className={cn(
                "h-16 w-16 rounded-2xl flex items-center justify-center text-3xl",
                complaint.status === "confirmed"  ? "bg-green-50"
                : complaint.status === "rejected" ? "bg-red-50"
                : complaint.status === "closed"   ? "bg-slate-100"
                : "bg-amber-50"
              )}>
                {complaint.status === "confirmed" ? "✅"
                  : complaint.status === "rejected" ? "❌"
                  : complaint.status === "closed"   ? "🔒"
                  : "⏳"}
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
            <Card padding="md">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                نتیجه نهایی
              </p>
              <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                <p className="text-sm text-green-800 leading-relaxed">
                  {complaint.resolution_note}
                </p>
              </div>
            </Card>
          )}

          {/* Quick actions */}
          {!["closed","confirmed","rejected"].includes(complaint.status) && (
            <Card padding="md">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                اقدام سریع
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setNewStatus("confirmed");
                    setResponse("پس از بازرسی میدانی، وقوع تخلف گران‌فروشی تایید می‌شود.");
                  }}
                  className="w-full flex items-center gap-2 p-3 bg-green-50
                             hover:bg-green-100 text-green-700 rounded-xl text-sm
                             font-semibold transition-colors"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  تایید تخلف
                </button>
                <button
                  onClick={() => {
                    setNewStatus("rejected");
                    setResponse("پس از بازرسی، هیچ تخلفی مشاهده نشد.");
                  }}
                  className="w-full flex items-center gap-2 p-3 bg-red-50
                             hover:bg-red-100 text-red-700 rounded-xl text-sm
                             font-semibold transition-colors"
                >
                  <XCircleIcon className="h-4 w-4" />
                  رد شکایت
                </button>
                <button
                  onClick={() => {
                    setNewStatus("inspecting");
                    setResponse("پرونده در دست بررسی و بازرسی می‌باشد.");
                  }}
                  className="w-full flex items-center gap-2 p-3 bg-blue-50
                             hover:bg-blue-100 text-blue-700 rounded-xl text-sm
                             font-semibold transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  شروع بازرسی
                </button>
                <button
                  onClick={() => {
                    setNewStatus("closed");
                    setResponse("پرونده مختومه شد.");
                  }}
                  className="w-full flex items-center gap-2 p-3 bg-slate-50
                             hover:bg-slate-100 text-slate-600 rounded-xl text-sm
                             font-semibold transition-colors"
                >
                  <LockClosedIcon className="h-4 w-4" />
                  مختومه کردن
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function AttachmentRow({
  file, label, date
}: { file: string; label: string; date?: string }) {
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(file);
  return (
    <a
      href={file}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-primary-50
                 rounded-xl transition-colors group"
    >
      <div className="h-10 w-10 rounded-xl bg-white border border-slate-200
                       flex items-center justify-center flex-shrink-0 text-xl">
        {isImage ? "🖼️" : "📄"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 group-hover:text-primary-700 truncate">
          {label}
        </p>
        {date && <p className="text-xs text-slate-400">{toJalali(date)}</p>}
      </div>
      <span className="text-xs text-primary-600 font-bold flex-shrink-0
                        group-hover:underline">
        دانلود ↓
      </span>
    </a>
  );
}

function ResponseRow({ response }: {
  response: {
    id: number;
    user: { id: number; full_name: string; phone_number: string; role: string };
    response_text: string; is_internal_note: boolean; created_at: string;
  }
}) {
  return (
    <div className={cn(
      "p-4 rounded-2xl border transition-all",
      response.is_internal_note
        ? "bg-amber-50 border-amber-200"
        : "bg-slate-50 border-slate-100",
    )}>
      <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold",
            response.is_internal_note
              ? "bg-amber-200 text-amber-800"
              : "bg-primary-100 text-primary-700",
          )}>
            {response.user.full_name[0]}
          </div>
          <p className="text-sm font-bold text-slate-800">
            {response.user.full_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {response.is_internal_note && (
            <Badge
              variant="warning"
              size="sm"
              icon={<LockClosedIcon className="h-3 w-3" />}
            >
              داخلی
            </Badge>
          )}
          <span className="text-xs text-slate-400">
            {timeAgo(response.created_at)}
          </span>
        </div>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
        {response.response_text}
      </p>
    </div>
  );
}