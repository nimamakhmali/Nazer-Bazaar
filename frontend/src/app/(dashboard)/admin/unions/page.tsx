"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon, PencilSquareIcon, MagnifyingGlassIcon,
  ShieldCheckIcon, UserIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }         from "@/components/layout/PageHeader";
import { Button }             from "@/components/ui/Button";
import { Badge }              from "@/components/ui/Badge";
import { Modal }              from "@/components/ui/Modal";
import { ConfirmDialog }      from "@/components/ui/ConfirmDialog";
import { Input }              from "@/components/ui/Input";
import { Select }             from "@/components/ui/Select";
import { EmptyState }         from "@/components/ui/EmptyState";
import { Pagination }         from "@/components/common/Pagination";
import { AssignManagerModal } from "@/features/organizations/components/AssignManagerModal";
import apiClient              from "@/services/api.client";
import { ENDPOINTS }          from "@/services/endpoints";
import { parseApiError, extractArray, extractCount } from "@/utils/error.utils";
import toast                  from "react-hot-toast";

interface Union {
  id:               number;
  name:             string;
  chamber:          number;
  chamber_name:     string;
  city_name:        string;
  province_name:    string;
  manager:          number | null;
  manager_name:     string;
  manager_phone:    string;
  description:      string;
  license_number:   string;
  established_year: number | null;
  phone:            string;
  address:          string;
  stores_count:     number;
  full_path:        string;
  is_active:        boolean;
}

interface Chamber { id: number; name: string; city_name: string; }

interface UnionForm {
  chamber_id:       string;
  name:             string;
  description:      string;
  license_number:   string;
  phone:            string;
  address:          string;
  established_year: string;
}

const DEFAULT_FORM: UnionForm = {
  chamber_id: "", name: "", description: "",
  license_number: "", phone: "", address: "", established_year: "",
};

export default function AdminUnionsPage() {
  const [unions,     setUnions]     = useState<Union[]>([]);
  const [chambers,   setChambers]   = useState<Chamber[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search,     setSearch]     = useState("");

  const [showModal,  setShowModal]  = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const [selected,   setSelected]   = useState<Union | null>(null);
  const [form,       setForm]       = useState<UnionForm>(DEFAULT_FORM);
  const [saving,     setSaving]     = useState(false);

  const isEdit = !!selected && showModal;

  useEffect(() => {
    apiClient
      .get(ENDPOINTS.ORGANIZATIONS.CHAMBERS, { params: { page_size: 500 } })
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setChambers(extractArray<Chamber>(data));
      })
      .catch(() => {});
  }, []);

  const fetchUnions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 9 };
      if (search) params.search = search;
      const res   = await apiClient.get(ENDPOINTS.ORGANIZATIONS.UNIONS, { params });
      const data  = res.data?.data ?? res.data;
      setUnions(extractArray<Union>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 9) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchUnions(); }, [fetchUnions]);
  useEffect(() => { setPage(1); },    [search]);

  const openCreate = () => {
    setSelected(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (u: Union) => {
    setSelected(u);
    setForm({
      chamber_id:       String(u.chamber),
      name:             u.name,
      description:      u.description,
      license_number:   u.license_number,
      phone:            u.phone,
      address:          u.address,
      established_year: u.established_year ? String(u.established_year) : "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.chamber_id) {
      toast.error("نام اتحادیه و اتاق اصناف الزامی است");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        chamber_id:     Number(form.chamber_id),
        name:           form.name,
        description:    form.description,
        license_number: form.license_number,
        phone:          form.phone,
        address:        form.address,
      };
      if (form.established_year)
        payload.established_year = Number(form.established_year);

      if (isEdit && selected) {
        await apiClient.patch(
          ENDPOINTS.ORGANIZATIONS.UNION(selected.id),
          payload
        );
        toast.success("اتحادیه ویرایش شد");
      } else {
        await apiClient.post(ENDPOINTS.ORGANIZATIONS.UNIONS, payload);
        toast.success("اتحادیه جدید ایجاد شد");
      }
      setShowModal(false);
      fetchUnions();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // ─── تخصیص رئیس — از AssignManagerModal ──────────────────────────────────
  const handleAssign = async (managerId: number) => {
    if (!selected) return;
    try {
      await apiClient.post(
        ENDPOINTS.ORGANIZATIONS.UNION_ASSIGN(selected.id),
        { manager_id: managerId }
      );
      toast.success("رئیس اتحادیه با موفقیت تخصیص یافت");
      setShowAssign(false);
      fetchUnions();
    } catch (err) {
      toast.error(parseApiError(err));
      throw err;
    }
  };

  const handleToggle = async () => {
    if (!selected) return;
    try {
      await apiClient.post(
        ENDPOINTS.ORGANIZATIONS.UNION_TOGGLE(selected.id)
      );
      toast.success(
        selected.is_active ? "اتحادیه غیرفعال شد" : "اتحادیه فعال شد"
      );
      setShowToggle(false);
      fetchUnions();
    } catch (err) {
      toast.error(parseApiError(err));
    }
  };

  const chamberOptions = chambers.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.city_name})`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="اتحادیه‌ها"
        subtitle={`${totalCount.toLocaleString("fa-IR")} اتحادیه صنفی`}
        breadcrumbs={[
          { label: "ادمین" },
          { label: "سازمان‌ها" },
          { label: "اتحادیه‌ها" },
        ]}
        actions={
          <Button
            onClick={openCreate}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            اتحادیه جدید
          </Button>
        }
      />

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="جستجوی اتحادیه..."
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
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : unions.length === 0 ? (
        <EmptyState title="اتحادیه‌ای یافت نشد" />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {unions.map((union) => (
              <div
                key={union.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 hover:shadow-card-hover transition-all flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg,#C49A2E,#DEB94A)",
                    }}
                  >
                    <ShieldCheckIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">
                      {union.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {union.chamber_name} — {union.city_name}
                    </p>
                  </div>
                  {union.is_active ? (
                    <Badge variant="success" dot size="sm">فعال</Badge>
                  ) : (
                    <Badge variant="danger" dot size="sm">غیرفعال</Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-center">
                    <p className="text-xl font-bold text-primary-700">
                      {(union.stores_count ?? 0).toLocaleString("fa-IR")}
                    </p>
                    <p className="text-xs text-slate-400">فروشگاه</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    {union.manager_name ? (
                      <>
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {union.manager_name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          رئیس اتحادیه
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 flex items-center gap-1 h-full">
                        <UserIcon className="h-3.5 w-3.5" />
                        رئیس تخصیص نشده
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(union)}
                    leftIcon={<PencilSquareIcon className="h-3.5 w-3.5" />}
                  >
                    ویرایش
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelected(union);
                      setShowAssign(true);
                    }}
                    leftIcon={<UserIcon className="h-3.5 w-3.5" />}
                  >
                    تخصیص رئیس
                  </Button>
                  <Button
                    variant={union.is_active ? "danger" : "success"}
                    size="sm"
                    onClick={() => {
                      setSelected(union);
                      setShowToggle(true);
                    }}
                  >
                    {union.is_active ? "غیرفعال" : "فعال"}
                  </Button>
                </div>
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
        title={isEdit ? "ویرایش اتحادیه" : "اتحادیه جدید"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              انصراف
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              {isEdit ? "ذخیره تغییرات" : "ایجاد اتحادیه"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="اتاق اصناف"
            placeholder="انتخاب اتاق اصناف..."
            options={chamberOptions}
            value={form.chamber_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, chamber_id: e.target.value }))
            }
            required
          />
          <Input
            label="نام اتحادیه"
            placeholder="مثال: اتحادیه مرغ و ماهی"
            value={form.name}
            onChange={(e) =>
              setForm((p) => ({ ...p, name: e.target.value }))
            }
            required
          />
          <Input
            label="شماره پروانه"
            placeholder="شماره پروانه فعالیت"
            value={form.license_number}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                license_number: e.target.value,
              }))
            }
            dir="ltr"
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
              label="سال تأسیس"
              placeholder="مثال: 1370"
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
          <Input
            label="آدرس"
            placeholder="آدرس دفتر اتحادیه"
            value={form.address}
            onChange={(e) =>
              setForm((p) => ({ ...p, address: e.target.value }))
            }
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              توضیحات
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="توضیحات اتحادیه..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Modal تخصیص رئیس — با کامپوننت جدید */}
      <AssignManagerModal
        isOpen={showAssign}
        onClose={() => setShowAssign(false)}
        onConfirm={handleAssign}
        title="تخصیص رئیس اتحادیه"
        entityName={selected?.name ?? ""}
        entityMeta={
          selected
            ? `${selected.chamber_name} — ${selected.city_name}`
            : ""
        }
        roleFilter="union_manager"
      />

      <ConfirmDialog
        isOpen={showToggle}
        onClose={() => setShowToggle(false)}
        onConfirm={handleToggle}
        title={
          selected?.is_active
            ? "غیرفعال کردن اتحادیه"
            : "فعال کردن اتحادیه"
        }
        message={`آیا از ${selected?.is_active ? "غیرفعال" : "فعال"} کردن «${selected?.name}» اطمینان دارید؟`}
        confirmLabel={selected?.is_active ? "غیرفعال کن" : "فعال کن"}
        variant={selected?.is_active ? "danger" : "warning"}
      />
    </div>
  );
}