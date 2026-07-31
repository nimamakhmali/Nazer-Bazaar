"use client";

import React, { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { parseApiError } from "@/utils/error.utils";
import { toJalaliWithTime } from "@/utils/date.utils";
import { cn } from "@/lib/cn";
import toast from "react-hot-toast";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface Complaint {
  uuid: string;
  tracking_code: string;
  title: string;
  description: string;
  store_name: string;
  product_name: string;
  price_reported: number;
  price_reported_formatted: string;
  status: string;
  status_display: string;
  created_at: string;
  updated_at: string;
  escalation_level?: number;
  hours_since_created?: number;
}

const STATUS_CONFIG: Record<
  string,
  { icon: any; color: string; bg: string; label: string; emoji: string }
> = {
  submitted: {
    icon: ClockIcon,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    label: "ثبت شده",
    emoji: "📋",
  },
  reviewing: {
    icon: ArrowPathIcon,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    label: "در حال بررسی",
    emoji: "🔍",
  },
  referred: {
    icon: ArrowPathIcon,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    label: "ارجاع داده شده",
    emoji: "📨",
  },
  inspecting: {
    icon: MagnifyingGlassIcon,
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200",
    label: "در حال بازرسی",
    emoji: "🔎",
  },
  confirmed: {
    icon: CheckCircleSolid,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    label: "تایید شده",
    emoji: "✅",
  },
  rejected: {
    icon: ExclamationCircleIcon,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    label: "رد شده",
    emoji: "❌",
  },
  closed: {
    icon: CheckCircleIcon,
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200",
    label: "مختومه",
    emoji: "🔒",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ComplaintTrackPage({
  params,
}: {
  params: Promise<{ identifier: string }>;  // ✅ تغییر از uuid به identifier
}) {
  const resolvedParams = use(params);
  const identifier = resolvedParams.identifier;
  const router = useRouter();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchCode, setSearchCode] = useState("");

  // ✅ Fetch initial complaint از URL
  useEffect(() => {
    if (identifier) {
      setSearchCode(identifier);
      fetchComplaint(identifier);
    }
  }, [identifier]);

  const fetchComplaint = async (code: string) => {
    if (!code.trim()) {
      toast.error("لطفاً کد رهگیری را وارد کنید");
      return;
    }

    setLoading(true);
    setError("");
    setComplaint(null);

    try {
      const r = await apiClient.get(ENDPOINTS.COMPLAINTS.TRACK(code.trim()));
      const data = r.data?.data ?? r.data;
      console.log("✅ Complaint fetched:", data);
      setComplaint(data);
      
      // ✅ Update URL بدون reload
      if (code !== identifier) {
        router.replace(`/complaints/track/${code}`, { scroll: false });
      }
    } catch (err: any) {
      console.error("❌ Fetch error:", err);
      const msg = parseApiError(err);
      setError(msg || "شکایتی با این کد پیدا نشد");
      toast.error(msg || "شکایتی با این کد پیدا نشد");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchCode.trim()) {
      toast.error("لطفاً کد رهگیری را وارد کنید");
      return;
    }
    fetchComplaint(searchCode.trim());
  };

  const getStatusConfig = (status: string) => {
    return (
      STATUS_CONFIG[status] || {
        icon: ClockIcon,
        color: "text-slate-600",
        bg: "bg-slate-50 border-slate-200",
        label: complaint?.status_display || "نامشخص",
        emoji: "📋",
      }
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-primary-700 rounded-2xl mb-4 shadow-lg">
            <MagnifyingGlassIcon className="h-8 w-8 text-secondary-400" />
          </div>
          <h1 className="text-2xl font-bold text-primary-800">
            رهگیری وضعیت شکایت
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            مشاهده آخرین وضعیت رسیدگی بازرسان به پرونده گران‌فروشی
          </p>
        </div>

        {/* ── Search Box ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            کد رهگیری شکایت
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleSearch()}
              placeholder="مثال: 12345678 یا UUID"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-100
                         focus:border-primary-400 font-mono"
              disabled={loading}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-primary-700 text-white rounded-xl font-bold
                         text-sm hover:bg-primary-800 transition-colors flex items-center 
                         gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm
                         hover:shadow"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 
                                   border-t-white animate-spin" />
                  در حال جستجو...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  استعلام
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            کد رهگیری ۸ رقمی خود را وارد کنید
          </p>
        </div>

        {/* ── Error State ── */}
        {error && !complaint && !loading && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center 
                           animate-fade-in">
            <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-800 mb-2">
              شکایتی یافت نشد
            </h3>
            <p className="text-sm text-red-700 mb-4">
              {error}
            </p>
            <button
              onClick={() => {
                setError("");
                setSearchCode("");
              }}
              className="px-4 py-2 bg-white border-2 border-red-200 text-red-700 
                         rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
            >
              جستجوی مجدد
            </button>
          </div>
        )}

        {/* ── Loading State ── */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 
                           text-center">
            <div className="h-12 w-12 mx-auto rounded-full border-4 border-primary-200 
                             border-t-primary-600 animate-spin mb-4" />
            <p className="text-slate-600 font-medium">در حال جستجو...</p>
          </div>
        )}

        {/* ── Complaint Detail ── */}
        {complaint && !loading && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden 
                           animate-fade-in">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-700 to-primary-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-100 text-xs mb-1">کد پیگیری شکایت:</p>
                  <p className="text-white font-bold font-mono text-2xl tracking-wider">
                    {complaint.tracking_code}
                  </p>
                </div>
                <div className="text-5xl">
                  {getStatusConfig(complaint.status).emoji}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              
              {/* Title & Status */}
              <div>
                <h2 className="text-xl font-bold text-primary-800 mb-2">
                  {complaint.title}
                </h2>
                <div
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border-2",
                    getStatusConfig(complaint.status).bg,
                    getStatusConfig(complaint.status).color
                  )}
                >
                  {React.createElement(getStatusConfig(complaint.status).icon, {
                    className: "h-4 w-4",
                  })}
                  {getStatusConfig(complaint.status).label}
                </div>
              </div>

              {/* Escalation Level */}
              {complaint.escalation_level && complaint.escalation_level > 1 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 
                                 rounded-xl">
                  <ExclamationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800 font-semibold">
                    {complaint.escalation_level === 2
                      ? "⚠️ این شکایت به مدیر اتاق اصناف ارجاع شده است"
                      : "🚨 این شکایت به ناظر استانداری ارجاع شده است"}
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 gap-3">
                <DetailRow
                  icon={<BuildingStorefrontIcon className="h-4 w-4 text-primary-600" />}
                  label="فروشگاه متخلف:"
                  value={complaint.store_name}
                />

                <DetailRow
                  icon={<CubeIcon className="h-4 w-4 text-secondary-600" />}
                  label="محصول:"
                  value={complaint.product_name}
                />

                <DetailRow
                  icon={<CurrencyDollarIcon className="h-4 w-4 text-red-600" />}
                  label="قیمت پرداختی شما:"
                  value={`${complaint.price_reported_formatted} ریال`}
                  valueClass="text-red-700 font-bold"
                />

                <DetailRow
                  icon={<CalendarIcon className="h-4 w-4 text-slate-500" />}
                  label="تاریخ ثبت:"
                  value={toJalaliWithTime(complaint.created_at)}
                />

                {complaint.hours_since_created !== undefined && (
                  <DetailRow
                    icon={<ClockIcon className="h-4 w-4 text-slate-500" />}
                    label="زمان سپری شده:"
                    value={`${complaint.hours_since_created} ساعت`}
                  />
                )}
              </div>

              {/* Description */}
              {complaint.description && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <DocumentTextIcon className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-bold text-slate-600">شرح شکایت:</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 
                                 rounded-xl whitespace-pre-line">
                    {complaint.description}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(complaint.tracking_code);
                    toast.success("کد پیگیری کپی شد");
                  }}
                  className="flex-1 py-3 bg-primary-700 text-white rounded-xl font-bold 
                             text-sm hover:bg-primary-800 transition-colors shadow-sm 
                             hover:shadow"
                >
                  📋 کپی کد پیگیری
                </button>
                
                <Link href="/" className="flex-1">
                  <button className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl 
                                     font-bold text-sm hover:bg-slate-200 transition-colors 
                                     flex items-center justify-center gap-2">
                    <HomeIcon className="h-4 w-4" />
                    بازگشت به صفحه اصلی
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function DetailRow({
  icon,
  label,
  value,
  valueClass = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center 
                       justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className={cn("text-sm font-semibold text-slate-800", valueClass)}>
          {value}
        </p>
      </div>
    </div>
  );
}