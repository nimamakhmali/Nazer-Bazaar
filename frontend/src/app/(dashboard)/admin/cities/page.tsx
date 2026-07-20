"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  PlusIcon, PencilSquareIcon, MagnifyingGlassIcon, MapPinIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Button }        from "@/components/ui/Button";
import { Badge }         from "@/components/ui/Badge";
import { Modal }         from "@/components/ui/Modal";
import { Input }         from "@/components/ui/Input";
import { Select }        from "@/components/ui/Select";
import { Toggle }        from "@/components/ui/Toggle";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }    from "@/components/ui/EmptyState";
import { Pagination }    from "@/components/common/Pagination";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import {
  parseApiError, extractArray, extractCount,
}                        from "@/utils/error.utils";
import toast             from "react-hot-toast";

interface City {
  id:            number;
  name:          string;
  province:      number;
  province_name: string;
  province_code: string;
  is_active:     boolean;
}

interface Province { id: number; name: string; code: string; }

interface CityForm {
  name:      string;
  province:  string;
  is_active: boolean;
}

// ✅ is_active always true → Toggle always starts controlled
const DEFAULT_FORM: CityForm = { name: "", province: "", is_active: true };

function normalizeCity(raw: Record<string, unknown>): City {
  return {
    id:            Number(raw.id ?? 0),
    name:          String(raw.name ?? ""),
    province:      Number(raw.province ?? 0),
    province_name: String(raw.province_name ?? ""),
    province_code: String(raw.province_code ?? ""),
    is_active:     raw.is_active !== false,   // ✅ always boolean
  };
}

export default function AdminCitiesPage() {
  const [cities,          setCities]          = useState<City[]>([]);
  const [provinces,       setProvinces]       = useState<Province[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [page,            setPage]            = useState(1);
  const [totalPages,      setTotalPages]      = useState(1);
  const [totalCount,      setTotalCount]      = useState(0);
  const [search,          setSearch]          = useState("");
  const [provinceFilter,  setProvinceFilter]  = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selected,  setSelected]  = useState<City | null>(null);
  const [form,      setForm]      = useState<CityForm>(DEFAULT_FORM);
  const [saving,    setSaving]    = useState(false);

  const isEdit = !!selected && showModal;

  // ── load provinces ──────────────────────────────────────────────────────────
  useEffect(() => {
    apiClient
      .get(ENDPOINTS.GEOGRAPHY.PROVINCES, { params: { page_size: 100 } })
      .then((res) => {
        const d = res.data?.data ?? res.data;
        setProvinces(extractArray<Province>(d));
      })
      .catch(() => {});
  }, []);

  // ── fetch cities ────────────────────────────────────────────────────────────
  const fetchCities = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 15 };
      if (search)         params.search   = search;
      if (provinceFilter) params.province = provinceFilter;

      const res  = await apiClient.get(ENDPOINTS.GEOGRAPHY.CITIES, { params });
      const data = res.data?.data ?? res.data;
      // ✅ normalize
      const raw  = extractArray<Record<string, unknown>>(data);
      setCities(raw.map(normalizeCity));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 15) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, search, provinceFilter]);

  useEffect(() => { fetchCities(); },           [fetchCities]);
  useEffect(() => { setPage(1); },              [search, provinceFilter]);

  // ── save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim() || !form.province) {
      toast.error("نام شهر و استان الزامی است");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name:      form.name,
        province:  Number(form.province),
        is_active: form.is_active,
      };
      if (isEdit && selected) {
        await apiClient.patch(ENDPOINTS.GEOGRAPHY.CITY(selected.id), payload);
        toast.success("شهر ویرایش شد");
      } else {
        await apiClient.post(ENDPOINTS.GEOGRAPHY.CITIES, payload);
        toast.success("شهر جدید ایجاد شد");
      }
      setShowModal(false);
      fetchCities();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setSelected(null);
    setForm({ ...DEFAULT_FORM, province: provinceFilter });
    setShowModal(true);
  };

  const openEdit = (c: City) => {
    setSelected(c);
    setForm({
      name:      c.name,
      province:  String(c.province),
      is_active: c.is_active ?? true,   // ✅ always boolean
    });
    setShowModal(true);
  };

  const provinceFilterOptions = [
    { value: "", label: "همه استان‌ها" },
    ...provinces.map((p) => ({ value: p.id, label: p.name })),
  ];

  const provinceSelectOptions = provinces.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت شهرها"
        subtitle={`${totalCount.toLocaleString("fa-IR")} شهر در سامانه`}
        breadcrumbs={[{ label: "ادمین" }, { label: "جغرافیا" }, { label: "شهرها" }]}
        actions={
          <Button onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
            شهر جدید
          </Button>
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
              placeholder="جستجوی شهر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                         focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-primary-100
                       bg-white appearance-none min-w-[180px]"
          >
            {provinceFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={10} cols={5} />
        ) : cities.length === 0 ? (
          <EmptyState
            title="شهری یافت نشد"
            action={
              <Button onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
                شهر جدید
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    {["نام شهر", "استان", "کد استان", "وضعیت", "عملیات"].map((h) => (
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
                  {cities.map((city) => (
                    <tr
                      key={city.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-slate-100
                                          flex items-center justify-center flex-shrink-0">
                            <MapPinIcon className="h-4 w-4 text-slate-400" />
                          </div>
                          <span className="font-semibold text-slate-800">{city.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{city.province_name}</td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs bg-slate-100 text-slate-500
                                         px-2 py-0.5 rounded-lg">
                          {city.province_code}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {city.is_active ? (
                          <Badge variant="success" dot size="sm">فعال</Badge>
                        ) : (
                          <Badge variant="danger" dot size="sm">غیرفعال</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => openEdit(city)}
                          className="p-1.5 rounded-lg text-slate-400
                                     hover:text-primary-600 hover:bg-primary-50
                                     transition-colors"
                          title="ویرایش"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
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
                  نمایش {cities.length} از {totalCount.toLocaleString("fa-IR")} شهر
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
        title={isEdit ? "ویرایش شهر" : "شهر جدید"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>انصراف</Button>
            <Button onClick={handleSave} isLoading={saving}>
              {isEdit ? "ذخیره تغییرات" : "ایجاد شهر"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="نام شهر"
            placeholder="مثال: تهران"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Select
            label="استان"
            placeholder="انتخاب استان..."
            options={provinceSelectOptions}
            value={form.province}
            onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
            required
          />
          {/* ✅ checked is always boolean */}
          <Toggle
            checked={form.is_active}
            onChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
            label="شهر فعال باشد"
          />
        </div>
      </Modal>
    </div>
  );
}