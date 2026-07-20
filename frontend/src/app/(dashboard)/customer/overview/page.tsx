"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusCircleIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }       from "@/components/layout/PageHeader";
import { StatCard }         from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }            from "@/components/ui/Badge";
import { Button }           from "@/components/ui/Button";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import { EmptyState }       from "@/components/ui/EmptyState";
import apiClient            from "@/services/api.client";
import { ENDPOINTS }        from "@/services/endpoints";
import { extractArray, extractCount } from "@/utils/error.utils";
import { timeAgo, getTodayJalali } from "@/utils/date.utils";
import { useAuthStore }     from "@/store";
import { cn }               from "@/lib/cn";
import Link                 from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface MyComplaint {
  uuid:           string;
  title:          string;
  store_name:     string;
  status:         string;
  status_display: string;
  created_at:     string;
  updated_at:     string;
}

const BADGE_MAP: Record<string,
  "success" | "danger" | "warning" | "info" | "default"
> = {
  submitted: "info", reviewing: "warning", referred: "warning",
  inspecting: "warning", confirmed: "success", rejected: "danger", closed: "default",
};

const STATUS_ICONS: Record<string, string> = {
  submitted: "📋", reviewing: "🔍", referred: "📨",
  inspecting: "🔎", confirmed: "✅", rejected: "❌", closed: "🔒",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerOverviewPage() {
  const { user }      = useAuthStore();
  const [complaints,  setComplaints]  = useState<MyComplaint[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [totalCount,  setTotalCount]  = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await apiClient.get(ENDPOINTS.COMPLAINTS.MY, { params: { page_size: 5 } });
        const d = r.data?.data ?? r.data;
        setComplaints(extractArray<MyComplaint>(d));
        setTotalCount(extractCount(d, 0));
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const pending  = complaints.filter((c) =>
    ["submitted","reviewing","referred","inspecting"].includes(c.status)
  ).length;
  const resolved = complaints.filter((c) =>
    ["confirmed","closed"].includes(c.status)
  ).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Welcome Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700
                       via-primary-600 to-accent rounded-3xl p-8 text-white">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 h-48 w-48 bg-white/5 rounded-full
                         -translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 right-0 h-32 w-32 bg-secondary-400/20
                         rounded-full translate-x-1/4 translate-y-1/4" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start
                         sm:items-center justify-between gap-6">
          <div>
            <p className="text-primary-200 text-sm mb-1">خوش آمدید</p>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {user?.full_name || "کاربر گرامی"}
            </h1>
            <p className="text-primary-200 text-sm">{getTodayJalali()}</p>
          </div>

          <Link href="/complaints/new">
            <Button
              variant="secondary"
              size="lg"
              leftIcon={<PlusCircleIcon className="h-5 w-5" />}
            >
              ثبت شکایت جدید
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard
              title="کل شکایات"
              value={totalCount.toLocaleString("fa-IR")}
              variant="primary"
              icon={<ClipboardDocumentListIcon />}
            />
            <StatCard
              title="در جریان"
              value={pending.toLocaleString("fa-IR")}
              variant="warning"
              icon={<ClockIcon />}
            />
            <StatCard
              title="حل شده"
              value={resolved.toLocaleString("fa-IR")}
              variant="success"
              icon={<CheckCircleIcon />}
            />
          </>
        )}
      </div>

      {/* ── Guide Banner ── */}
      <Card padding="md" className="border-primary-100 bg-primary-50/30">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary-100 flex items-center
                           justify-center flex-shrink-0">
            <ShieldCheckIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-primary-800 mb-1">
              چطور از حق خود دفاع کنید؟
            </p>
            <p className="text-sm text-primary-700 leading-relaxed mb-3">
              اگر فروشگاهی کالا را بالاتر از قیمت مصوب اتحادیه فروخت،
              می‌توانید در این سامانه شکایت ثبت کنید. شکایت شما بررسی
              و در صورت تایید، با فروشگاه متخلف برخورد می‌شود.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/complaints/new">
                <Button size="sm" leftIcon={<PlusCircleIcon className="h-4 w-4" />}>
                  ثبت شکایت
                </Button>
              </Link>
              <Link href="/prices">
                <Button variant="outline" size="sm">
                  مشاهده قیمت‌های مصوب
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Recent Complaints ── */}
      <Card padding="none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="font-bold text-slate-800">آخرین شکایات من</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {totalCount.toLocaleString("fa-IR")} شکایت ثبت شده
            </p>
          </div>
          <Link href="/customer/complaints">
            <button className="flex items-center gap-1.5 text-xs font-semibold
                                text-primary-600 hover:text-primary-800 transition-colors">
              مشاهده همه
              <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <EmptyState
            icon={<ClipboardDocumentListIcon className="h-12 w-12" />}
            title="هنوز شکایتی ثبت نکرده‌اید"
            description="اگر از قیمت‌گذاری فروشگاهی ناراضی هستید، شکایت ثبت کنید."
            action={
              <Link href="/complaints/new">
                <Button
                  size="sm"
                  leftIcon={<PlusCircleIcon className="h-4 w-4" />}
                >
                  اولین شکایت را ثبت کنید
                </Button>
              </Link>
            }
            size="md"
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {complaints.map((c) => (
              <Link key={c.uuid} href={`/customer/complaints/${c.uuid}`}>
                <div className="flex items-center gap-4 px-6 py-4
                                 hover:bg-slate-50/80 transition-colors group">
                  {/* Status emoji */}
                  <div className="flex-shrink-0 text-2xl">
                    {STATUS_ICONS[c.status] ?? "📋"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate text-sm
                                   group-hover:text-primary-700 transition-colors">
                      {c.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {c.store_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {timeAgo(c.updated_at)}
                    </p>
                  </div>

                  {/* Badge */}
                  <Badge
                    variant={BADGE_MAP[c.status] ?? "default"}
                    size="sm"
                    dot
                  >
                    {c.status_display}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* ── Helpful links ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/prices">
          <Card hover padding="md" className="cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary-50
                               flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800">قیمت‌های مصوب</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  مشاهده قیمت رسمی کالاها
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/complaints/track">
          <Card hover padding="md" className="cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-secondary-50
                               flex items-center justify-center flex-shrink-0">
                <ClipboardDocumentListIcon className="h-6 w-6 text-secondary-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800">رهگیری شکایت</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  با کد UUID پیگیری کنید
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}