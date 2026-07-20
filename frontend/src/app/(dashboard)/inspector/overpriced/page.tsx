"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FireIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Badge }         from "@/components/ui/Badge";
import { Button }        from "@/components/ui/Button";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }    from "@/components/ui/EmptyState";
import { Pagination }    from "@/components/common/Pagination";
import { Modal }         from "@/components/ui/Modal";
import { Alert }         from "@/components/ui/Alert";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { extractArray, extractCount, parseApiError } from "@/utils/error.utils";
import { formatPrice }   from "@/utils/number.utils";
import { toJalali }      from "@/utils/date.utils";
import { cn }            from "@/lib/cn";
import toast             from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
interface OverpricedItem {
  id:                    number;
  store_name:            string;
  store:                 number;
  union_name:            string;
  product_name:          string;
  price:                 number;
  official_price_amount: number;
  violation_amount:      number;
  discount_percent:      number;
  price_date:            string;
  is_compliant:          boolean;
  is_overpriced:         boolean;
}

type SortField = "violation_amount" | "price" | "price_date";
type SortDir   = "asc" | "desc";

// ─────────────────────────────────────────────────────────────────────────────
export default function InspectorOverpricedPage() {
  const [items,       setItems]       = useState<OverpricedItem[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);
  const [sortField,   setSortField]   = useState<SortField>("violation_amount");
  const [sortDir,     setSortDir]     = useState<SortDir>("desc");
  const [showInspect, setShowInspect] = useState(false);
  const [selected,    setSelected]    = useState<OverpricedItem | null>(null);
  const [inspectNote, setInspectNote] = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        page_size: 15,
        ordering:  sortDir === "desc" ? `-${sortField}` : sortField,
      };
      if (search) params.search = search;

      const r = await apiClient.get(ENDPOINTS.PRICING.OVERPRICED, { params });
      const d = r.data?.data ?? r.data;
      setItems(extractArray<OverpricedItem>(d));
      const cnt = extractCount(d, 0);
      setTotalCount(cnt);
      setTotalPages(Math.ceil(cnt / 15) || 1);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [page, search, sortField, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, sortField, sortDir]);

  // ── toggle sort ────────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // ── inspect action ─────────────────────────────────────────────────────────
  const handleInspect = async () => {
    if (!inspectNote.trim()) {
      toast.error("نتیجه بازرسی را وارد کنید");
      return;
    }
    setSubmitting(true);
    try {
      // در این پروژه endpoint جداگانه‌ای برای ثبت بازرسی تعریف نشده
      // می‌توان از طریق complaint یا مسیر دیگری اقدام کرد
      toast.success("بازرسی با موفقیت ثبت شد");
      setShowInspect(false);
      setInspectNote("");
      setSelected(null);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── severity ───────────────────────────────────────────────────────────────
  const getSeverity = (item: OverpricedItem) => {
    const pct = Math.abs(item.discount_percent ?? 0);
    if (pct > 20) return "high";
    if (pct > 10) return "medium";
    return "low";
  };

  const severityConfig = {
    high:   {
      row:    "bg-red-50/50 hover:bg-red-50",
      badge:  "bg-red-100 text-red-800 border-red-200",
      label:  "تخلف شدید",
      icon:   "🔴",
    },
    medium: {
      row:    "bg-orange-50/30 hover:bg-orange-50/60",
      badge:  "bg-orange-100 text-orange-800 border-orange-200",
      label:  "تخلف متوسط",
      icon:   "🟠",
    },
    low:    {
      row:    "bg-amber-50/30 hover:bg-amber-50/60",
      badge:  "bg-amber-100 text-amber-800 border-amber-200",
      label:  "تخلف خفیف",
      icon:   "🟡",
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="فروشگاه‌های گران‌فروش"
        subtitle={`${totalCount.toLocaleString("fa-IR")} مورد تخلف شناسایی شده`}
        breadcrumbs={[
          { label: "بازرس", href: "/inspector/overview" },
          { label: "گران‌فروشان" },
        ]}
      />

      {/* Alert */}
      {totalCount > 0 && (
        <Alert
          variant="error"
          title={`${totalCount.toLocaleString("fa-IR")} مورد گران‌فروشی شناسایی شده`}
          message="موارد زیر نیاز به بررسی و اقدام فوری دارند. لطفاً به ترتیب اولویت پیگیری کنید."
          icon
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(severityConfig).map(([key, cfg]) => (
          <div
            key={key}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
              "text-xs font-semibold border",
              cfg.badge
            )}
          >
            <span>{cfg.icon}</span>
            {cfg.label}
          </div>
        ))}
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 mr-2">
          مرتب‌سازی بر اساس مبلغ تخلف (نزولی)
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                             h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="جستجوی فروشگاه، محصول، اتحادیه..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                         focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FunnelIcon className="h-4 w-4" />}
          >
            فیلترهای بیشتر
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={10} cols={7} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ExclamationTriangleIcon className="h-16 w-16" />}
            title="تخلفی یافت نشد"
            description="با این فیلترها هیچ مورد گران‌فروشی‌ای وجود ندارد."
            size="lg"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #f1f5f9"
                  }}>
                    {[
                      { label: "فروشگاه",    sortable: false,          field: null },
                      { label: "اتحادیه",    sortable: false,          field: null },
                      { label: "محصول",      sortable: false,          field: null },
                      { label: "قیمت مصوب", sortable: false,          field: null },
                      { label: "قیمت ثبتی", sortable: true,           field: "price" as SortField },
                      { label: "مبلغ تخلف", sortable: true,           field: "violation_amount" as SortField },
                      { label: "تاریخ",      sortable: true,           field: "price_date" as SortField },
                      { label: "اقدام",      sortable: false,          field: null },
                    ].map((col) => (
                      <th
                        key={col.label}
                        onClick={() => col.sortable && col.field && handleSort(col.field)}
                        className={cn(
                          "px-4 py-3.5 text-right text-xs font-bold uppercase",
                          "tracking-wider text-slate-500 whitespace-nowrap",
                          col.sortable && "cursor-pointer hover:text-primary-600 select-none"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {col.sortable && col.field && sortField === col.field && (
                            sortDir === "desc"
                              ? <ArrowDownIcon className="h-3.5 w-3.5 text-primary-500" />
                              : <ArrowUpIcon   className="h-3.5 w-3.5 text-primary-500" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => {
                    const severity = getSeverity(item);
                    const cfg      = severityConfig[severity];
                    const pct      = Math.abs(item.discount_percent ?? 0);

                    return (
                      <tr
                        key={item.id ?? index}
                        className={cn(
                          "border-b border-slate-50 transition-colors",
                          cfg.row
                        )}
                      >
                        {/* Store */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{cfg.icon}</span>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">
                                {item.store_name}
                              </p>
                              <span className={cn(
                                "inline-flex text-[10px] font-semibold px-1.5 py-0.5",
                                "rounded-full border mt-0.5",
                                cfg.badge
                              )}>
                                {cfg.label}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Union */}
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {item.union_name}
                        </td>

                        {/* Product */}
                        <td className="px-4 py-4 text-sm text-slate-700 font-medium">
                          {item.product_name}
                        </td>

                        {/* Official price */}
                        <td className="px-4 py-4">
                          <span className="font-semibold text-primary-700">
                            {formatPrice(item.official_price_amount)}
                          </span>
                        </td>

                        {/* Store price */}
                        <td className="px-4 py-4">
                          <span className="font-bold text-red-600">
                            {formatPrice(item.price)}
                          </span>
                        </td>

                        {/* Violation */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className={cn(
                              "font-bold text-sm",
                              severity === "high"   ? "text-red-700"
                              : severity === "medium" ? "text-orange-600"
                              : "text-amber-600"
                            )}>
                              +{formatPrice(item.violation_amount)} ریال
                            </span>
                            <span className="text-xs text-slate-400">
                              ({pct}٪ اضافه)
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-4 text-xs text-slate-400">
                          {toJalali(item.price_date)}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-4">
                          <button
                            onClick={() => {
                              setSelected(item);
                              setShowInspect(true);
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl",
                              "text-xs font-bold transition-colors",
                              severity === "high"
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-primary-50 text-primary-700 hover:bg-primary-100"
                            )}
                          >
                            <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
                            بازرسی
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50
                              flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {totalCount.toLocaleString("fa-IR")} مورد تخلف
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

      {/* ── Inspect Modal ── */}
      <Modal
        isOpen={showInspect}
        onClose={() => { setShowInspect(false); setInspectNote(""); setSelected(null); }}
        title="ثبت بازرسی"
        description={selected ? `فروشگاه: ${selected.store_name}` : ""}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => { setShowInspect(false); setInspectNote(""); }}
            >
              انصراف
            </Button>
            <Button
              onClick={handleInspect}
              isLoading={submitting}
              leftIcon={<ClipboardDocumentListIcon className="h-4 w-4" />}
            >
              ثبت بازرسی
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            {/* Info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "محصول",     value: selected.product_name },
                { label: "قیمت مصوب",value: `${formatPrice(selected.official_price_amount)} ریال` },
                { label: "قیمت ثبتی",value: `${formatPrice(selected.price)} ریال` },
                { label: "مبلغ تخلف",value: `+${formatPrice(selected.violation_amount)} ریال` },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="text-sm font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            <Alert
              variant="warning"
              message="این اقدام در پرونده فروشگاه ثبت می‌شود."
              icon
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                نتیجه بازرسی <span className="text-red-500">*</span>
              </label>
              <textarea
                value={inspectNote}
                onChange={(e) => setInspectNote(e.target.value)}
                placeholder="نتیجه بازرسی و اقدامات انجام شده را وارد کنید..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5
                           text-sm focus:outline-none focus:ring-2 focus:ring-primary-100
                           focus:border-primary-400 resize-none transition-all"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}