"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import {
  parseApiError,
  extractArray,
  extractCount,
} from "@/utils/error.utils";
import { toJalali, toJalaliWithTime } from "@/utils/date.utils";
import { formatPrice } from "@/utils/number.utils";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Complaint {
  uuid: string;
  tracking_code?: string;
  title: string;
  description: string;
  store: number;
  store_name: string;
  product: number;
  product_name: string;
  status: string;
  status_display: string;
  price_reported: number;
  created_at: string;
  customer?: {
    id: number;
    full_name: string;
    phone_number: string;
  };
  resolution_note?: string;
}

interface ComplaintDetail extends Complaint {
  responses: Array<{
    id: number;
    response_text: string;
    is_internal_note: boolean;
    created_at: string;
    user: { full_name: string; role: string };
  }>;
  attachments: Array<{
    id: number;
    file: string;
    description: string;
  }>;
}

interface ComplaintStats {
  total: number;
  pending: number; // submitted + reviewing + referred + inspecting
  confirmed: number;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const suspendFromComplaintSchema = z.object({
  store_id: z.number(),
  store_name: z.string(),
  reason: z.string().min(5, "دلیل تعلیق الزامی است"),
});
type SuspendFromComplaintData = z.infer<typeof suspendFromComplaintSchema>;

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  {
    variant: "success" | "danger" | "warning" | "info" | "default";
    label: string;
  }
> = {
  submitted: { variant: "info", label: "ثبت شده" },
  reviewing: { variant: "warning", label: "در حال بررسی" },
  referred: { variant: "warning", label: "ارجاع داده شده" },
  inspecting: { variant: "warning", label: "در حال بازرسی" },
  confirmed: { variant: "success", label: "تایید شده" },
  rejected: { variant: "danger", label: "رد شده" },
  closed: { variant: "default", label: "مختومه" },
};

const STATUS_FILTERS = [
  { value: "", label: "همه" },
  { value: "submitted", label: "ثبت شده" },
  { value: "reviewing", label: "در بررسی" },
  { value: "confirmed", label: "تایید شده" },
  { value: "rejected", label: "رد شده" },
  { value: "closed", label: "مختومه" },
];

// ✅ NEW: اقدامات قابل انجام روی وضعیت شکایت
const STATUS_ACTIONS: Array<{
  value: "reviewing" | "confirmed" | "rejected" | "closed";
  label: string;
  icon: React.ReactNode;
  variant: "outline" | "success" | "danger" | "ghost";
}> = [
  {
    value: "reviewing",
    label: "در حال بررسی",
    icon: <ClockIcon className="h-4 w-4" />,
    variant: "outline",
  },
  {
    value: "confirmed",
    label: "تایید شکایت",
    icon: <CheckCircleIcon className="h-4 w-4" />,
    variant: "success",
  },
  {
    value: "rejected",
    label: "رد شکایت",
    icon: <XCircleIcon className="h-4 w-4" />,
    variant: "danger",
  },
  {
    value: "closed",
    label: "مختومه کردن",
    icon: <LockClosedIcon className="h-4 w-4" />,
    variant: "ghost",
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UnionComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  // ✅ NEW: آمار از API جداگانه — نه از آرایه صفحه فعلی
  const [stats, setStats] = useState<ComplaintStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] =
    useState<ComplaintDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ✅ NEW: تغییر وضعیت
  const [statusNote, setStatusNote] = useState("");
  const [statusChanging, setStatusChanging] = useState(false);

  // Suspend from complaint modal
  const [suspendModal, setSuspendModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const suspendForm = useForm<SuspendFromComplaintData>({
    resolver: zodResolver(suspendFromComplaintSchema),
  });

  // ── ✅ بارگذاری آمار از API جداگانه ────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [totalRes, submittedRes, reviewingRes, referredRes, inspectingRes, confirmedRes] =
        await Promise.allSettled([
          apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { page_size: 1 } }),
          apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { status: "submitted", page_size: 1 } }),
          apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { status: "reviewing", page_size: 1 } }),
          apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { status: "referred", page_size: 1 } }),
          apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { status: "inspecting", page_size: 1 } }),
          apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params: { status: "confirmed", page_size: 1 } }),
        ]);

      const getCount = (
        r: PromiseSettledResult<{ data?: unknown }>
      ): number => {
        if (r.status !== "fulfilled") return 0;
        return extractCount(r.value.data, 0);
      };

      const total = getCount(totalRes);
      const pending =
        getCount(submittedRes) +
        getCount(reviewingRes) +
        getCount(referredRes) +
        getCount(inspectingRes);
      const confirmed = getCount(confirmedRes);

      setStats({ total, pending, confirmed });
    } catch {
      /* silent */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── بارگذاری شکایات ─────────────────────────────────────────────────────────
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 15 };
      if (search) params.search = search;
      if (filter) params.status = filter;

      const res = await apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params });
      const data = res.data?.data ?? res.data;
      setComplaints(extractArray<Complaint>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 15) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  // ── ✅ refetch مشترک بعد از هر mutation ─────────────────────────────────────
  const refetchAfterMutation = useCallback(() => {
    fetchComplaints();
    fetchStats();
  }, [fetchComplaints, fetchStats]);

  // ── باز کردن جزئیات شکایت ────────────────────────────────────────────────────
  const openDetail = async (complaint: Complaint) => {
    setDetailLoading(true);
    setDetailModal(true);
    setSelectedComplaint(null);
    setStatusNote("");
    try {
      const res = await apiClient.get(
        ENDPOINTS.COMPLAINTS.DETAIL(complaint.uuid)
      );
      const data = res.data?.data ?? res.data;
      setSelectedComplaint(data as ComplaintDetail);
    } catch {
      setSelectedComplaint(complaint as ComplaintDetail);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── ✅ تغییر وضعیت شکایت ─────────────────────────────────────────────────────
  const handleChangeStatus = async (
    newStatus: "reviewing" | "confirmed" | "rejected" | "closed"
  ) => {
    if (!selectedComplaint) return;
    setStatusChanging(true);
    try {
      const res = await apiClient.post(
        ENDPOINTS.COMPLAINTS.CHANGE_STATUS(selectedComplaint.uuid),
        { status: newStatus, note: statusNote || undefined }
      );
      const updated = (res.data?.data ?? res.data) as ComplaintDetail;
      setSelectedComplaint(updated);
      setStatusNote("");
      toast.success("وضعیت شکایت با موفقیت به‌روزرسانی شد");
      refetchAfterMutation();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setStatusChanging(false);
    }
  };

  // ── تعلیق فروشگاه از روی شکایت تایید شده ─────────────────────────────────────
  const openSuspendFromComplaint = (complaint: Complaint) => {
    suspendForm.reset({
      store_id: complaint.store,
      store_name: complaint.store_name,
      reason: `تعلیق به دلیل تایید شکایت مشتری — ${complaint.title}`,
    });
    setSuspendModal(true);
  };

  const onSuspendFromComplaint = async (data: SuspendFromComplaintData) => {
    setSubmitting(true);
    try {
      await apiClient.post(ENDPOINTS.STORES.SUSPEND(data.store_id), {
        reason: data.reason,
      });
      toast.success(`فروشگاه "${data.store_name}" تعلیق شد`);
      setSuspendModal(false);
      suspendForm.reset();
      setDetailModal(false);
      refetchAfterMutation();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="شکایات اتحادیه"
        subtitle={`${totalCount.toLocaleString("fa-IR")} شکایت ثبت‌شده`}
        breadcrumbs={[{ label: "اتحادیه" }, { label: "شکایات" }]}
      />

      {/* ✅ Summary — از API جداگانه */}
      <div className="grid grid-cols-3 gap-4">
        {statsLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl border border-slate-100 bg-slate-50 animate-pulse"
              />
            ))
          : [
              {
                label: "در انتظار بررسی",
                count: stats.pending,
                color: "bg-amber-50 border-amber-100 text-amber-700",
                dot: "bg-amber-500",
              },
              {
                label: "تایید شده",
                count: stats.confirmed,
                color: "bg-green-50 border-green-100 text-green-700",
                dot: "bg-green-500",
              },
              {
                label: "کل شکایات",
                count: stats.total,
                color: "bg-slate-50 border-slate-100 text-slate-700",
                dot: "bg-slate-400",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border",
                  item.color
                )}
              >
                <span
                  className={cn(
                    "h-3 w-3 rounded-full flex-shrink-0",
                    item.dot
                  )}
                />
                <div>
                  <p className="text-2xl font-bold">
                    {item.count.toLocaleString("fa-IR")}
                  </p>
                  <p className="text-xs opacity-70">{item.label}</p>
                </div>
              </div>
            ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="جستجوی شکایت، فروشگاه یا کد رهگیری..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  filter === opt.value
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : complaints.length === 0 ? (
          <EmptyState
            title="شکایتی یافت نشد"
            description="هنوز شکایتی در اتحادیه ثبت نشده یا فیلتر نتیجه‌ای ندارد"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-100">
                    {[
                      "عنوان شکایت",
                      "فروشگاه",
                      "محصول",
                      "قیمت گزارشی",
                      "وضعیت",
                      "تاریخ ثبت",
                      "عملیات",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => {
                    const cfg =
                      STATUS_CONFIG[c.status] ?? STATUS_CONFIG.submitted;
                    const isConfirmed = c.status === "confirmed";

                    return (
                      <tr
                        key={c.uuid}
                        className={cn(
                          "border-b border-slate-50 hover:bg-slate-50/60 transition-colors",
                          isConfirmed && "bg-green-50/20"
                        )}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                isConfirmed ? "bg-green-100" : "bg-orange-50"
                              )}
                            >
                              <ClipboardDocumentListIcon
                                className={cn(
                                  "h-4 w-4",
                                  isConfirmed
                                    ? "text-green-600"
                                    : "text-orange-500"
                                )}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate max-w-[180px]">
                                {c.title}
                              </p>
                              {c.tracking_code && (
                                <p className="text-[10px] font-mono text-slate-400">
                                  {c.tracking_code}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-600 text-sm">
                          {c.store_name}
                        </td>
                        <td className="px-5 py-4 text-slate-600 text-sm">
                          {c.product_name}
                        </td>
                        <td className="px-5 py-4 font-semibold text-red-600 text-sm">
                          {formatPrice(c.price_reported)} ریال
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={cfg.variant} size="sm">
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">
                          {toJalali(c.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openDetail(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title="مشاهده جزئیات"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            {isConfirmed && (
                              <button
                                onClick={() => openSuspendFromComplaint(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="تعلیق فروشگاه"
                              >
                                <NoSymbolIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {totalCount.toLocaleString("fa-IR")} شکایت
                </p>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModal}
        onClose={() => {
          setDetailModal(false);
          setSelectedComplaint(null);
          setStatusNote("");
        }}
        title="جزئیات شکایت"
        size="xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : selectedComplaint ? (
          <div className="space-y-4">
            {/* Header info */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-bold text-slate-800">
                  {selectedComplaint.title}
                </p>
                <Badge
                  variant={
                    STATUS_CONFIG[selectedComplaint.status]?.variant ??
                    "default"
                  }
                  size="sm"
                >
                  {STATUS_CONFIG[selectedComplaint.status]?.label ??
                    selectedComplaint.status_display}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {toJalaliWithTime(selectedComplaint.created_at)}
                {selectedComplaint.tracking_code && (
                  <span className="mr-3 font-mono">
                    کد: {selectedComplaint.tracking_code}
                  </span>
                )}
              </p>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "فروشگاه", value: selectedComplaint.store_name },
                { label: "محصول", value: selectedComplaint.product_name },
                {
                  label: "قیمت گزارشی",
                  value: `${formatPrice(
                    selectedComplaint.price_reported
                  )} ریال`,
                },
                {
                  label: "شاکی",
                  value: selectedComplaint.customer?.full_name ?? "—",
                },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="font-semibold text-slate-800 text-sm">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">شرح شکایت</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {selectedComplaint.description}
              </p>
            </div>

            {/* Responses */}
            {selectedComplaint.responses &&
              selectedComplaint.responses.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-2">
                    پاسخ‌ها
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedComplaint.responses
                      .filter((r) => !r.is_internal_note)
                      .map((resp) => (
                        <div
                          key={resp.id}
                          className="p-3 bg-blue-50 border border-blue-100 rounded-xl"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-blue-700">
                              {resp.user.full_name}
                            </p>
                            <p className="text-[10px] text-blue-400">
                              {toJalali(resp.created_at)}
                            </p>
                          </div>
                          <p className="text-sm text-blue-800">
                            {resp.response_text}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Resolution note */}
            {selectedComplaint.resolution_note && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-xs text-green-600 font-medium mb-1">
                  یادداشت / نتیجه بررسی
                </p>
                <p className="text-sm text-green-800">
                  {selectedComplaint.resolution_note}
                </p>
              </div>
            )}

            {/* ✅ NEW: بخش تعیین وضعیت شکایت */}
            {selectedComplaint.status !== "closed" ? (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-sm font-bold text-slate-700">
                  تعیین وضعیت شکایت
                </p>

                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={2}
                  placeholder="یادداشت یا نتیجه بررسی (اختیاری)"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
                />

                <div className="flex flex-wrap gap-2">
                  {STATUS_ACTIONS.filter(
                    (a) => a.value !== selectedComplaint.status
                  ).map((action) => (
                    <Button
                      key={action.value}
                      size="sm"
                      variant={action.variant}
                      isLoading={statusChanging}
                      leftIcon={action.icon}
                      onClick={() => handleChangeStatus(action.value)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                  <LockClosedIcon className="h-4 w-4 text-slate-400" />
                  <p className="text-sm text-slate-500">
                    این شکایت مختومه شده و قابل تغییر وضعیت نیست.
                  </p>
                </div>
              </div>
            )}

            {/* Action: suspend store from confirmed complaint */}
            {selectedComplaint.status === "confirmed" && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500 mb-2">
                  این شکایت تایید شده است. می‌توانید فروشگاه را تعلیق کنید:
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<NoSymbolIcon className="h-4 w-4" />}
                  onClick={() => {
                    setDetailModal(false);
                    openSuspendFromComplaint(selectedComplaint);
                  }}
                >
                  تعلیق فروشگاه {selectedComplaint.store_name}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Suspend from Complaint Modal */}
      <Modal
        isOpen={suspendModal}
        onClose={() => {
          setSuspendModal(false);
          suspendForm.reset();
        }}
        title="تعلیق فروشگاه بر اساس شکایت"
        size="md"
      >
        <form
          onSubmit={suspendForm.handleSubmit(onSuspendFromComplaint)}
          className="space-y-4"
        >
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700 font-medium">
              فروشگاه: <strong>{suspendForm.watch("store_name")}</strong>
            </p>
            <p className="text-xs text-red-500 mt-1">
              ⚠️ با تعلیق، فروشگاه قادر به ثبت قیمت نخواهد بود.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              دلیل تعلیق <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 mb-2"
              onChange={(e) => {
                if (e.target.value) {
                  suspendForm.setValue("reason", e.target.value);
                }
              }}
            >
              <option value="">انتخاب دلیل...</option>
              <option value="گران‌فروشی — تایید شکایت مشتری">
                گران‌فروشی (تایید شکایت)
              </option>
              <option value="کم‌فروشی — تایید شکایت مشتری">
                کم‌فروشی
              </option>
              <option value="تقلب در قیمت‌گذاری">تقلب در قیمت‌گذاری</option>
              <option value="تخلف مکرر از قوانین اتحادیه">تخلف مکرر</option>
            </select>
            <textarea
              {...suspendForm.register("reason")}
              rows={3}
              placeholder="توضیح دقیق..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 resize-none"
            />
            {suspendForm.formState.errors.reason && (
              <p className="mt-1 text-xs text-red-500">
                {suspendForm.formState.errors.reason.message}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="danger"
              isLoading={submitting}
              className="flex-1"
              leftIcon={<NoSymbolIcon className="h-4 w-4" />}
            >
              تعلیق فروشگاه
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSuspendModal(false);
                suspendForm.reset();
              }}
              className="flex-1"
            >
              انصراف
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}