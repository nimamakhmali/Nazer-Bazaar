"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon, PencilSquareIcon,
  XCircleIcon, CheckCircleIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Button }        from "@/components/ui/Button";
import { Badge }         from "@/components/ui/Badge";
import { Modal }         from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input }         from "@/components/ui/Input";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }    from "@/components/ui/EmptyState";
import { Pagination }    from "@/components/common/Pagination";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { parseApiError, extractArray, extractCount } from "@/utils/error.utils";
import { formatPrice }   from "@/utils/number.utils";
import { toJalali }      from "@/utils/date.utils";
import toast             from "react-hot-toast";
import { cn }            from "@/lib/cn";
import Link              from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface OfficialPrice {
  id:                  number;
  product:             number;
  product_name:        string;
  product_unit_symbol: string;
  union:               number;
  union_name:          string;
  price:               number;
  min_allowed_price:   number;
  effective_date:      string;
  expire_date:         string | null;
  description:         string;
  is_today:            boolean;
  is_expired:          boolean;
  is_active:           boolean;
  created_by_name:     string;
  created_at:          string;
}

interface EditForm {
  price:       string;
  expire_date: string;
  description: string;
}

const FILTER_OPTIONS = [
  { value: "",        label: "همه" },
  { value: "today",   label: "امروز" },
  { value: "active",  label: "فعال" },
  { value: "expired", label: "منقضی" },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function UnionPricingPage() {
  const [prices,     setPrices]     = useState<OfficialPrice[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("");

  const [showEdit,       setShowEdit]       = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [selected,       setSelected]       = useState<OfficialPrice | null>(null);
  const [editForm,       setEditForm]       = useState<EditForm>({
    price: "", expire_date: "", description: "",
  });
  const [saving, setSaving] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchPrices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 15 };
      if (search) params.search = search;
      if (filter === "today")   params.is_today   = true;
      if (filter === "active")  params.is_active  = true;
      if (filter === "expired") params.is_expired = true;

      const endpoint = filter === "today"
        ? ENDPOINTS.PRICING.OFFICIAL_PRICES_TODAY
        : ENDPOINTS.PRICING.OFFICIAL_PRICES;

      const res  = await apiClient.get(endpoint, { params });
      const data = res.data?.data ?? res.data;
      setPrices(extractArray<OfficialPrice>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 15) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => { fetchPrices(); },              [fetchPrices]);
  useEffect(() => { setPage(1); }, [search, filter]);

  // ── edit ───────────────────────────────────────────────────────────────────
  const openEdit = (p: OfficialPrice) => {
    setSelected(p);
    setEditForm({
      price:       String(p.price),
      expire_date: p.expire_date ?? "",
      description: p.description ?? "",
    });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!selected || !editForm.price) {
      toast.error("قیمت الزامی است");
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch(ENDPOINTS.PRICING.OFFICIAL_PRICE(selected.id), {
        price:       Number(editForm.price),
        expire_date: editForm.expire_date || undefined,
        description: editForm.description || undefined,
      });
      toast.success("قیمت مصوب ویرایش شد");
      setShowEdit(false);
      fetchPrices();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // ── deactivate ─────────────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!selected) return;
    try {
      await apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICE_DEACTIVATE(selected.id));
      toast.success("قیمت مصوب غیرفعال شد");
      setShowDeactivate(false);
      fetchPrices();
    } catch (err) {
      toast.error(parseApiError(err));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="قیمت‌های مصوب"
        subtitle={`${totalCount.toLocaleString("fa-IR")} قیمت مصوب`}
        breadcrumbs={[{ label: "اتحادیه" }, { label: "قیمت‌گذاری" }, { label: "قیمت‌های مصوب" }]}
        actions={
          <Link href="/union/pricing/official">
            <Button leftIcon={<CurrencyDollarIcon className="h-4 w-4" />}>
              ثبت قیمت امروز
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                             h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="جستجوی محصول..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                         focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  filter === opt.value
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
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
        {isLoading ? (
          <SkeletonTable rows={10} cols={7} />
        ) : prices.length === 0 ? (
          <EmptyState
            title="قیمت مصوبی یافت نشد"
            description="قیمت‌های امروز را ثبت کنید"
            action={
              <Link href="/union/pricing/official">
                <Button leftIcon={<CurrencyDollarIcon className="h-4 w-4" />}>
                  ثبت قیمت امروز
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    {[
                      "محصول", "قیمت مصوب", "حداقل مجاز",
                      "تاریخ اعتبار", "انقضا", "وضعیت", "عملیات",
                    ].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-right text-xs font-bold
                                             uppercase tracking-wider text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prices.map((price) => (
                    <tr
                      key={price.id}
                      className={cn(
                        "border-b border-slate-50 transition-colors",
                        price.is_expired
                          ? "opacity-60 hover:bg-slate-50/40"
                          : price.is_today
                          ? "bg-green-50/30 hover:bg-green-50/50"
                          : "hover:bg-slate-50/60",
                      )}
                    >
                      {/* Product */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            price.is_today ? "bg-green-100" : "bg-primary-50",
                          )}>
                            <CurrencyDollarIcon className={cn(
                              "h-4 w-4",
                              price.is_today ? "text-green-600" : "text-primary-600",
                            )} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {price.product_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {price.product_unit_symbol}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Official price */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-primary-700">
                          {formatPrice(price.price)} ریال
                        </span>
                      </td>

                      {/* Min allowed */}
                      <td className="px-5 py-4 text-slate-500 text-sm">
                        {formatPrice(price.min_allowed_price)} ریال
                      </td>

                      {/* Effective date */}
                      <td className="px-5 py-4 text-slate-600 text-sm">
                        {toJalali(price.effective_date)}
                      </td>

                      {/* Expire */}
                      <td className="px-5 py-4 text-sm">
                        {price.expire_date ? (
                          <span className={price.is_expired ? "text-red-500" : "text-slate-600"}>
                            {toJalali(price.expire_date)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {price.is_today ? (
                          <Badge variant="success" dot size="sm">امروز</Badge>
                        ) : price.is_expired ? (
                          <Badge variant="danger" dot size="sm">منقضی</Badge>
                        ) : price.is_active ? (
                          <Badge variant="info" dot size="sm">فعال</Badge>
                        ) : (
                          <Badge variant="default" dot size="sm">غیرفعال</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          {price.is_active && !price.is_expired && (
                            <>
                              <button
                                onClick={() => openEdit(price)}
                                className="p-1.5 rounded-lg text-slate-400
                                           hover:text-primary-600 hover:bg-primary-50
                                           transition-colors"
                                title="ویرایش"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { setSelected(price); setShowDeactivate(true); }}
                                className="p-1.5 rounded-lg text-slate-400
                                           hover:text-red-600 hover:bg-red-50
                                           transition-colors"
                                title="غیرفعال کردن"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50
                              flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  نمایش {prices.length} از {totalCount.toLocaleString("fa-IR")} قیمت
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title="ویرایش قیمت مصوب"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEdit(false)}>انصراف</Button>
            <Button onClick={handleEdit} isLoading={saving}>ذخیره تغییرات</Button>
          </>
        }
      >
        <div className="space-y-4">
          {selected && (
            <div className="p-3 bg-primary-50 rounded-xl">
              <p className="text-sm font-bold text-primary-700">{selected.product_name}</p>
              <p className="text-xs text-primary-500 mt-0.5">
                قیمت فعلی: {formatPrice(selected.price)} ریال
              </p>
            </div>
          )}
          <Input
            label="قیمت جدید (ریال)"
            type="number"
            placeholder="قیمت به ریال"
            value={editForm.price}
            onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
            dir="ltr"
            required
          />
          <Input
            label="تاریخ انقضا (اختیاری)"
            type="date"
            value={editForm.expire_date}
            onChange={(e) => setEditForm((p) => ({ ...p, expire_date: e.target.value }))}
            dir="ltr"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">توضیحات</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="توضیحات اختیاری..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-100
                         focus:border-primary-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        isOpen={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        onConfirm={handleDeactivate}
        title="غیرفعال کردن قیمت مصوب"
        message={`آیا از غیرفعال کردن قیمت «${selected?.product_name}» اطمینان دارید؟`}
        confirmLabel="غیرفعال کن"
        variant="danger"
      />
    </div>
  );
}