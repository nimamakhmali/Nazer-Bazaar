"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }  from "@/components/layout/PageHeader";
import { Badge }       from "@/components/ui/Badge";
import { Button }      from "@/components/ui/Button";
import { Spinner }     from "@/components/ui/Spinner";
import { EmptyState }  from "@/components/ui/EmptyState";
import { Pagination }  from "@/components/common/Pagination";
import { useAuthStore } from "@/store";
import apiClient       from "@/services/api.client";
import { ENDPOINTS }   from "@/services/endpoints";
import { extractArray, extractCount } from "@/utils/error.utils";
import { toJalali, timeAgo } from "@/utils/date.utils";
import { cn }          from "@/lib/cn";
import Link            from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Complaint {
  uuid:           string;
  title:          string;
  store_name:     string;
  status:         string;
  status_display: string;
  created_at:     string;
  updated_at:     string;
}

const BADGE_MAP: Record<
  string,
  "success" | "danger" | "warning" | "info" | "default"
> = {
  submitted:  "info",
  reviewing:  "warning",
  referred:   "warning",
  inspecting: "warning",
  confirmed:  "success",
  rejected:   "danger",
  closed:     "default",
};

const STATUS_ICONS: Record<
  string,
  { emoji: string; bg: string; text: string }
> = {
  submitted:  { emoji: "📋", bg: "bg-blue-50",   text: "text-blue-600" },
  reviewing:  { emoji: "🔍", bg: "bg-amber-50",  text: "text-amber-600" },
  referred:   { emoji: "📨", bg: "bg-purple-50", text: "text-purple-600" },
  inspecting: { emoji: "🔎", bg: "bg-orange-50", text: "text-orange-600" },
  confirmed:  { emoji: "✅", bg: "bg-green-50",  text: "text-green-600" },
  rejected:   { emoji: "❌", bg: "bg-red-50",    text: "text-red-600" },
  closed:     { emoji: "🔒", bg: "bg-slate-50",  text: "text-slate-500" },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerComplaintsPage() {
  const { user }                        = useAuthStore();
  const [items,      setItems]          = useState<Complaint[]>([]);
  const [isLoading,  setIsLoading]      = useState(true);
  const [search,     setSearch]         = useState("");
  const [page,       setPage]           = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalCount, setTotalCount]     = useState(0);

  // بررسی کد ملی از store
  const hasNationalCode = !!user?.national_code?.trim();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 10 };
      if (search) params.search = search;
      const r = await apiClient.get(ENDPOINTS.COMPLAINTS.MY, { params });
      const d = r.data?.data ?? r.data;
      setItems(extractArray<Complaint>(d));
      const cnt = extractCount(d, 0);
      setTotalCount(cnt);
      setTotalPages(Math.ceil(cnt / 10) || 1);
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="شکایات من"
        subtitle={`${totalCount.toLocaleString("fa-IR")} شکایت ثبت شده`}
        breadcrumbs={[
          { label: "داشبورد", href: "/customer/overview" },
          { label: "شکایات من" },
        ]}
        actions={
          hasNationalCode ? (
            <Link href="/complaints/new">
              <Button
                size="sm"
                leftIcon={<PlusCircleIcon className="h-4 w-4" />}
              >
                ثبت شکایت جدید
              </Button>
            </Link>
          ) : (
            // دکمه غیرفعال با tooltip
            <div className="relative group">
              <Button
                size="sm"
                disabled
                leftIcon={<PlusCircleIcon className="h-4 w-4" />}
                className="opacity-50 cursor-not-allowed"
              >
                ثبت شکایت جدید
              </Button>
              <div className="absolute left-0 top-full mt-2 w-56 bg-slate-800
                               text-white text-xs rounded-xl p-3 z-50
                               opacity-0 group-hover:opacity-100 transition-opacity
                               pointer-events-none shadow-lg">
                برای ثبت شکایت ابتدا کد ملی خود را در پروفایل وارد کنید
              </div>
            </div>
          )
        }
      />

      {/* ── هشدار کد ملی ────────────────────────────────────────────────── */}
      {!hasNationalCode && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50
                         p-5 flex items-start gap-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-amber-100
                           flex items-center justify-center">
            <IdentificationIcon className="h-6 w-6 text-amber-600" />
          </div>

          <div className="flex-1">
            <p className="font-bold text-amber-900 mb-1">
              برای ثبت شکایت، کد ملی الزامی است
            </p>
            <p className="text-sm text-amber-800 leading-relaxed mb-3">
              جهت حفظ امنیت و اعتبار شکایات در سامانه، ثبت کد ملی
              الزامی است. لطفاً ابتدا اطلاعات پروفایل خود را تکمیل کنید.
            </p>
            <Link href="/profile">
              <Button
                size="sm"
                leftIcon={<IdentificationIcon className="h-4 w-4" />}
                className="bg-amber-600 hover:bg-amber-700 text-white border-0"
              >
                تکمیل پروفایل و ورود کد ملی
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                           h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="جستجوی عنوان شکایت..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                       rounded-xl focus:outline-none focus:ring-2
                       focus:ring-primary-100 focus:border-primary-500
                       bg-slate-50 transition-all"
          />
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="xl" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ClipboardDocumentListIcon className="h-20 w-20" />}
          title={
            search
              ? "شکایتی با این مشخصات یافت نشد"
              : "هنوز شکایتی ثبت نکرده‌اید"
          }
          description={
            search
              ? "عبارت جستجو را تغییر دهید"
              : hasNationalCode
              ? "اگر فروشنده‌ای قیمت بالاتر از مصوب دریافت کرد، شکایت ثبت کنید"
              : "ابتدا کد ملی خود را در پروفایل وارد کنید، سپس می‌توانید شکایت ثبت کنید"
          }
          action={
            !search ? (
              hasNationalCode ? (
                <Link href="/complaints/new">
                  <Button leftIcon={<PlusCircleIcon className="h-4 w-4" />}>
                    ثبت اولین شکایت
                  </Button>
                </Link>
              ) : (
                <Link href="/profile">
                  <Button
                    variant="outline"
                    leftIcon={<IdentificationIcon className="h-4 w-4" />}
                    className="border-amber-400 text-amber-700 hover:bg-amber-50"
                  >
                    تکمیل پروفایل
                  </Button>
                </Link>
              )
            ) : undefined
          }
          size="lg"
        />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((c) => {
              const statusInfo = STATUS_ICONS[c.status] ?? STATUS_ICONS.submitted;
              const daysSince  = Math.floor(
                (Date.now() - new Date(c.updated_at).getTime()) /
                  (1000 * 60 * 60 * 24),
              );

              return (
                <Link
                  key={c.uuid}
                  href={`/customer/complaints/${c.uuid}`}
                >
                  <div
                    className="bg-white rounded-2xl border border-slate-100
                                 shadow-card hover:shadow-card-hover
                                 hover:border-primary-100 transition-all
                                 duration-200 p-5 group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Status icon */}
                      <div
                        className={cn(
                          "flex-shrink-0 h-12 w-12 rounded-2xl flex items-center",
                          "justify-center text-2xl",
                          statusInfo.bg,
                        )}
                      >
                        {statusInfo.emoji}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <p
                            className="font-bold text-slate-800 truncate text-sm
                                         group-hover:text-primary-700 transition-colors"
                          >
                            {c.title}
                          </p>
                          <Badge
                            variant={BADGE_MAP[c.status] ?? "default"}
                            size="sm"
                            dot
                            className="flex-shrink-0"
                          >
                            {c.status_display}
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-500 truncate">
                          فروشگاه: {c.store_name}
                        </p>

                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-slate-400">
                            ثبت شده: {toJalali(c.created_at)}
                          </span>
                          <span className="text-slate-200">·</span>
                          <span
                            className={cn(
                              "text-xs font-medium",
                              daysSince > 7 &&
                                ["submitted", "reviewing", "inspecting"].includes(
                                  c.status,
                                )
                                ? "text-amber-600"
                                : "text-slate-400",
                            )}
                          >
                            آخرین بروزرسانی: {timeAgo(c.updated_at)}
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronLeftIcon
                        className="h-4 w-4 text-slate-300
                                     group-hover:text-primary-400
                                     flex-shrink-0 transition-colors"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* ── Floating CTA (mobile) ─────────────────────────────────────── */}
      <div className="fixed bottom-6 left-6 md:hidden z-40">
        {hasNationalCode ? (
          <Link href="/complaints/new">
            <button
              className="flex items-center gap-2 px-4 py-3 bg-primary-700
                          text-white rounded-2xl shadow-lg text-sm font-bold
                          hover:bg-primary-800 transition-colors"
            >
              <PlusCircleIcon className="h-5 w-5" />
              شکایت جدید
            </button>
          </Link>
        ) : (
          <Link href="/profile">
            <button
              className="flex items-center gap-2 px-4 py-3 bg-amber-600
                          text-white rounded-2xl shadow-lg text-sm font-bold
                          hover:bg-amber-700 transition-colors"
            >
              <IdentificationIcon className="h-5 w-5" />
              تکمیل پروفایل
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}