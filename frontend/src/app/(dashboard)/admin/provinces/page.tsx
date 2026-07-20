"use client";


import React, { useState, useEffect, useCallback } from "react";
import {
  PlusIcon, PencilSquareIcon,
  MapPinIcon, ChevronDownIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Button }        from "@/components/ui/Button";
import { Badge }         from "@/components/ui/Badge";
import { Modal }         from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input }         from "@/components/ui/Input";
import { Toggle }        from "@/components/ui/Toggle";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }    from "@/components/ui/EmptyState";
import { Pagination }    from "@/components/common/Pagination";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import {
  parseApiError,
  extractArray,
  extractCount,
}                        from "@/utils/error.utils";
import toast             from "react-hot-toast";
import { cn }            from "@/lib/cn";



interface Province {
  id:           number;
  name:         string;
  code:         string;
  is_active:    boolean;
  cities_count: number;   // ✅ guaranteed number after normalization
  created_at:   string;
}

interface City {
  id:            number;
  name:          string;
  province_name: string;
  is_active:     boolean;
}

interface ProvinceForm {
  name:      string;
  code:      string;
  is_active: boolean;
}

// ✅ is_active always true so Toggle is never undefined
const DEFAULT_FORM: ProvinceForm = { name: "", code: "", is_active: true };

// ── normalize raw API item ──────────────────────────────────────────────────
function normalizeProvince(raw: Record<string, unknown>): Province {
  return {
    id:           Number(raw.id ?? 0),
    name:         String(raw.name ?? ""),
    code:         String(raw.code ?? ""),
    // ✅ Fix 1: coerce undefined/null cities_count → 0
    cities_count: typeof raw.cities_count === "number" ? raw.cities_count : 0,
    is_active:    raw.is_active !== false,
    created_at:   String(raw.created_at ?? ""),
  };
}

export default function AdminProvincesPage() {
  const [provinces,  setProvinces]  = useState<Province[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [showModal,  setShowModal]  = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected,   setSelected]   = useState<Province | null>(null);
  // ✅ Fix 2: form always has is_active:true so Toggle starts controlled
  const [form,       setForm]       = useState<ProvinceForm>(DEFAULT_FORM);
  const [saving,     setSaving]     = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const isEdit = !!selected && showModal;

  const fetchProvinces = useCallback(async () => {
    setIsLoading(true);
    try {
      const res  = await apiClient.get(
        ENDPOINTS.GEOGRAPHY.PROVINCES,
        { params: { page, page_size: 15 } },
      );
      const data = res.data?.data ?? res.data;
      // ✅ normalize every item
      const raw  = extractArray<Record<string, unknown>>(data);
      setProvinces(raw.map(normalizeProvince));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 15) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchProvinces(); }, [fetchProvinces]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("نام و کد استان الزامی است");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && selected) {
        await apiClient.patch(ENDPOINTS.GEOGRAPHY.PROVINCE(selected.id), form);
        toast.success("استان ویرایش شد");
      } else {
        await apiClient.post(ENDPOINTS.GEOGRAPHY.PROVINCES, form);
        toast.success("استان جدید ایجاد شد");
      }
      setShowModal(false);
      fetchProvinces();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await apiClient.delete(ENDPOINTS.GEOGRAPHY.PROVINCE(selected.id));
      toast.success("استان غیرفعال شد");
      setShowDelete(false);
      fetchProvinces();
    } catch (err) {
      toast.error(parseApiError(err));
    }
  };

  const openCreate = () => {
    setSelected(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (p: Province) => {
    setSelected(p);
    // ✅ is_active always boolean
    setForm({ name: p.name, code: p.code, is_active: p.is_active ?? true });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت استان‌ها"
        subtitle={`${totalCount.toLocaleString("fa-IR")} استان در سامانه`}
        breadcrumbs={[{ label: "ادمین" }, { label: "جغرافیا" }, { label: "استان‌ها" }]}
        actions={
          <Button onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
            استان جدید
          </Button>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={10} cols={5} />
        ) : provinces.length === 0 ? (
          <EmptyState
            title="استانی یافت نشد"
            action={
              <Button onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
                استان جدید
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    {["نام استان", "کد استان", "تعداد شهر", "وضعیت", "عملیات"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-right text-xs font-bold
                                   uppercase tracking-wider text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {provinces.map((province) => (
                    // ✅ Fix 3: use React.Fragment with key instead of two sibling <tr>
                    <React.Fragment key={province.id}>
                      <tr className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">

                        {/* Name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary-50
                                            flex items-center justify-center flex-shrink-0">
                              <MapPinIcon className="h-4 w-4 text-primary-600" />
                            </div>
                            <span className="font-semibold text-slate-800">{province.name}</span>
                          </div>
                        </td>

                        {/* Code */}
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs bg-slate-100 text-slate-600
                                           px-2 py-0.5 rounded-lg">
                            {province.code}
                          </span>
                        </td>

                        {/* Cities count */}
                        <td className="px-5 py-4">
                          <button
                            onClick={() =>
                              setExpandedId(
                                expandedId === province.id ? null : province.id,
                              )
                            }
                            className="flex items-center gap-1.5 text-primary-600
                                       hover:text-primary-800 font-medium text-sm
                                       transition-colors"
                          >
                            <BuildingOffice2Icon className="h-4 w-4" />
                            {/* ✅ cities_count is now always a number */}
                            {province.cities_count.toLocaleString("fa-IR")} شهر
                            <ChevronDownIcon
                              className={cn(
                                "h-3 w-3 transition-transform",
                                expandedId === province.id && "rotate-180",
                              )}
                            />
                          </button>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          {province.is_active ? (
                            <Badge variant="success" dot size="sm">فعال</Badge>
                          ) : (
                            <Badge variant="danger" dot size="sm">غیرفعال</Badge>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(province)}
                              className="p-1.5 rounded-lg text-slate-400
                                         hover:text-primary-600 hover:bg-primary-50
                                         transition-colors"
                              title="ویرایش"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            {province.is_active && (
                              <button
                                onClick={() => { setSelected(province); setShowDelete(true); }}
                                className="px-2 py-1 rounded-lg text-xs font-medium
                                           text-slate-400 hover:text-red-600
                                           hover:bg-red-50 transition-colors"
                              >
                                غیرفعال
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ✅ Fix 3: expand row inside same Fragment — key already on Fragment */}
                      {expandedId === province.id && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-5 pb-4 pt-0 bg-slate-50/50"
                          >
                            <ProvinceCities provinceId={province.id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50
                              flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {totalCount.toLocaleString("fa-IR")} استان
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEdit ? "ویرایش استان" : "استان جدید"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>انصراف</Button>
            <Button onClick={handleSave} isLoading={saving}>
              {isEdit ? "ذخیره تغییرات" : "ایجاد استان"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="نام استان"
            placeholder="مثال: تهران"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Input
            label="کد استان"
            placeholder="مثال: 01"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            dir="ltr"
            required
            maxLength={5}
          />
          {/* ✅ checked is always boolean */}
          <Toggle
            checked={form.is_active}
            onChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
            label="استان فعال باشد"
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="غیرفعال کردن استان"
        message={`آیا از غیرفعال کردن استان «${selected?.name}» اطمینان دارید؟`}
        confirmLabel="غیرفعال کن"
        variant="warning"
      />
    </div>
  );
}

// ── sub-component ────────────────────────────────────────────────────────────
function ProvinceCities({ provinceId }: { provinceId: number }) {
  const [cities,  setCities]  = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get(ENDPOINTS.GEOGRAPHY.PROVINCE_CITIES(provinceId))
      .then((res) => {
        const d = res.data?.data ?? res.data;
        setCities(extractArray<City>(d));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [provinceId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
        <div className="h-3 w-3 rounded-full border-2 border-slate-300
                        border-t-primary-500 animate-spin" />
        در حال بارگذاری شهرها...
      </div>
    );
  }

  if (cities.length === 0) {
    return (
      <p className="py-2 text-xs text-slate-400">
        شهری برای این استان ثبت نشده است
      </p>
    );
  }

  return (
    <div className="pt-2">
      <p className="text-xs font-bold text-slate-500 mb-2">
        شهرهای استان ({cities.length.toLocaleString("fa-IR")} شهر):
      </p>
      <div className="flex flex-wrap gap-1.5">
        {cities.map((city) => (
          <span
            key={city.id}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-medium border",
              city.is_active
                ? "bg-primary-50 text-primary-700 border-primary-200"
                : "bg-slate-100 text-slate-400 border-slate-200 line-through",
            )}
          >
            {city.name}
          </span>
        ))}
      </div>
    </div>
  );
}