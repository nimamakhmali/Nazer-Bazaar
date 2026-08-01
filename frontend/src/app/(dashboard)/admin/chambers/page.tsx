"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon, PencilSquareIcon, MagnifyingGlassIcon,
  BuildingOfficeIcon, UserIcon, ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }          from "@/components/layout/PageHeader";
import { Button }              from "@/components/ui/Button";
import { Badge }               from "@/components/ui/Badge";
import { Modal }               from "@/components/ui/Modal";
import { Input }               from "@/components/ui/Input";
import { Select }              from "@/components/ui/Select";
import { EmptyState }          from "@/components/ui/EmptyState";
import { Pagination }          from "@/components/common/Pagination";
import { AssignManagerModal }  from "@/features/organizations/components/AssignManagerModal";
import apiClient               from "@/services/api.client";
import { ENDPOINTS }           from "@/services/endpoints";
import { parseApiError, extractArray, extractCount } from "@/utils/error.utils";
import toast                   from "react-hot-toast";

interface Chamber {
  id:               number;
  name:             string;
  city:             number;
  city_name:        string;
  province_name:    string;
  manager_name:     string;
  manager_phone:    string;
  address:          string;
  phone:            string;
  email:            string;
  established_year: number | null;
  unions_count:     number;
  is_active:        boolean;
}

interface City { id: number; name: string; province_name: string; }

interface ChamberForm {
  city_id:          string;
  name:             string;
  address:          string;
  phone:            string;
  email:            string;
  established_year: string;
}

const DEFAULT_FORM: ChamberForm = {
  city_id: "", name: "", address: "", phone: "", email: "", established_year: "",
};

export default function AdminChambersPage() {
  const [chambers,   setChambers]   = useState<Chamber[]>([]);
  const [cities,     setCities]     = useState<City[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search,     setSearch]     = useState("");

  const [showModal,  setShowModal]  = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selected,   setSelected]   = useState<Chamber | null>(null);
  const [form,       setForm]       = useState<ChamberForm>(DEFAULT_FORM);
  const [saving,     setSaving]     = useState(false);
  const [viewUnions, setViewUnions] = useState<number | null>(null);

  const isEdit = !!selected && showModal;

  useEffect(() => {
    apiClient
      .get(ENDPOINTS.GEOGRAPHY.CITIES, { params: { page_size: 500 } })
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setCities(extractArray<City>(data));
      })
      .catch(() => {});
  }, []);

  const fetchChambers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 9 };
      if (search) params.search = search;
      const res   = await apiClient.get(ENDPOINTS.ORGANIZATIONS.CHAMBERS, { params });
      const data  = res.data?.data ?? res.data;
      setChambers(extractArray<Chamber>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 9) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchChambers(); }, [fetchChambers]);
  useEffect(() => { setPage(1); },     [search]);

  const openCreate = () => {
    setSelected(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (c: Chamber) => {
    setSelected(c);
    setForm({
      city_id:          String(c.city),
      name:             c.name,
      address:          c.address,
      phone:            c.phone,
      email:            c.email,
      established_year: c.established_year ? String(c.established_year) : "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.city_id) {
      toast.error("نام و شهر الزامی است");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        city_id: Number(form.city_id),
        name:    form.name,
        address: form.address,
        phone:   form.phone,
        email:   form.email,
      };
      if (form.established_year)
        payload.established_year = Number(form.established_year);

      if (isEdit && selected) {
        await apiClient.patch(
          ENDPOINTS.ORGANIZATIONS.CHAMBER(selected.id),
          payload
        );
        toast.success("اتاق اصناف ویرایش شد");
      } else {
        await apiClient.post(ENDPOINTS.ORGANIZATIONS.CHAMBERS, payload);
        toast.success("اتاق اصناف جدید ایجاد شد");
      }
      setShowModal(false);
      fetchChambers();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // ─── تخصیص مدیر — از AssignManagerModal ─────────────────────────────────
  const handleAssign = async (managerId: number) => {
    if (!selected) return;
    try {
      await apiClient.post(
        ENDPOINTS.ORGANIZATIONS.CHAMBER_ASSIGN(selected.id),
        { manager_id: managerId }
      );
      toast.success("مدیر اتاق اصناف با موفقیت تخصیص یافت");
      setShowAssign(false);
      fetchChambers();
    } catch (err) {
      toast.error(parseApiError(err));
      throw err; // برای اینکه modal بداند خطا رخ داده
    }
  };

  const cityOptions = cities.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.province_name})`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="اتاق‌های اصناف"
        subtitle={`${totalCount.toLocaleString("fa-IR")} اتاق اصناف`}
        breadcrumbs={[
          { label: "ادمین" },
          { label: "سازمان‌ها" },
          { label: "اتاق‌های اصناف" },
        ]}
        actions={
          <Button
            onClick={openCreate}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            اتاق جدید
          </Button>
        }
      />

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="جستجو بر اساس نام..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 bg-slate-50 transition-all"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse space-y-3"
            >
              <div className="flex gap-3">
                <div className="h-12 w-12 bg-slate-200 rounded-xl flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-slate-200 rounded" />
              <div className="h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : chambers.length === 0 ? (
        <EmptyState title="اتاق اصنافی یافت نشد" />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {chambers.map((chamber) => (
              <div
                key={chamber.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 hover:shadow-card-hover transition-all flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg,#2E6DB4,#1B3A6B)",
                    }}
                  >
                    <BuildingOfficeIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">
                      {chamber.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {chamber.city_name} — {chamber.province_name}
                    </p>
                  </div>
                  {chamber.is_active ? (
                    <Badge variant="success" dot size="sm">فعال</Badge>
                  ) : (
                    <Badge variant="danger" dot size="sm">غیرفعال</Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 p-2.5 bg-slate-50 rounded-xl text-center">
                    <p className="text-lg font-bold text-primary-700">
                      {(chamber.unions_count ?? 0).toLocaleString("fa-IR")}
                    </p>
                    <p className="text-xs text-slate-400">اتحادیه</p>
                  </div>
                  {chamber.manager_name && (
                    <div className="flex-1 p-2.5 bg-slate-50 rounded-xl flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {chamber.manager_name}
                        </p>
                        <p className="text-[10px] text-slate-400">مدیر</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-3 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(chamber)}
                    leftIcon={<PencilSquareIcon className="h-3.5 w-3.5" />}
                  >
                    ویرایش
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelected(chamber);
                      setShowAssign(true);
                    }}
                    leftIcon={<UserIcon className="h-3.5 w-3.5" />}
                  >
                    تخصیص مدیر
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setViewUnions(
                        viewUnions === chamber.id ? null : chamber.id
                      )
                    }
                    leftIcon={<ShieldCheckIcon className="h-3.5 w-3.5" />}
                  >
                    اتحادیه‌ها
                  </Button>
                </div>

                {viewUnions === chamber.id && (
                  <ChambersUnions chamberId={chamber.id} />
                )}
              </div>
            ))}
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

      {/* Modal ایجاد/ویرایش */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEdit ? "ویرایش اتاق اصناف" : "اتاق اصناف جدید"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              انصراف
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              {isEdit ? "ذخیره تغییرات" : "ایجاد اتاق"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="شهر"
            placeholder="انتخاب شهر..."
            options={cityOptions}
            value={form.city_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, city_id: e.target.value }))
            }
            required
          />
          <Input
            label="نام اتاق اصناف"
            placeholder="مثال: اتاق اصناف تهران"
            value={form.name}
            onChange={(e) =>
              setForm((p) => ({ ...p, name: e.target.value }))
            }
            required
          />
          <Input
            label="آدرس"
            placeholder="آدرس کامل"
            value={form.address}
            onChange={(e) =>
              setForm((p) => ({ ...p, address: e.target.value }))
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="تلفن"
              placeholder="021-XXXXXXXX"
              value={form.phone}
              onChange={(e) =>
                setForm((p) => ({ ...p, phone: e.target.value }))
              }
              dir="ltr"
            />
            <Input
              label="ایمیل"
              type="email"
              placeholder="chamber@example.ir"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              dir="ltr"
            />
          </div>
          <Input
            label="سال تأسیس"
            placeholder="مثال: 1380"
            value={form.established_year}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                established_year: e.target.value,
              }))
            }
            type="number"
            dir="ltr"
          />
        </div>
      </Modal>

      {/* Modal تخصیص مدیر — با کامپوننت جدید */}
      <AssignManagerModal
        isOpen={showAssign}
        onClose={() => setShowAssign(false)}
        onConfirm={handleAssign}
        title="تخصیص مدیر اتاق اصناف"
        entityName={selected?.name ?? ""}
        entityMeta={selected ? `${selected.city_name} — ${selected.province_name}` : ""}
        roleFilter="chamber_manager"
      />
    </div>
  );
}

// ─── sub component ────────────────────────────────────────────────────────────

function ChambersUnions({ chamberId }: { chamberId: number }) {
  const [unions,  setUnions]  = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get(ENDPOINTS.ORGANIZATIONS.CHAMBER_UNIONS(chamberId))
      .then((res) => {
        const d = res.data?.data ?? res.data;
        setUnions(extractArray(d));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chamberId]);

  if (loading)
    return <p className="text-xs text-slate-400 pt-3">در حال بارگذاری...</p>;
  if (unions.length === 0)
    return (
      <p className="text-xs text-slate-400 pt-3">اتحادیه‌ای ثبت نشده</p>
    );

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-xs font-bold text-slate-500 mb-2">اتحادیه‌های عضو:</p>
      <div className="flex flex-wrap gap-1.5">
        {unions.map((u) => (
          <span
            key={u.id}
            className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium border border-primary-100"
          >
            {u.name}
          </span>
        ))}
      </div>
    </div>
  );
}