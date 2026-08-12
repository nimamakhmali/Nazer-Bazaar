"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  BuildingOffice2Icon,
  UserIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }   from "@/components/layout/PageHeader";
import { Button }       from "@/components/ui/Button";
import { Badge }        from "@/components/ui/Badge";
import { Modal }        from "@/components/ui/Modal";
import { Input }        from "@/components/ui/Input";
import { Select }       from "@/components/ui/Select";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }   from "@/components/ui/EmptyState";
import { Pagination }   from "@/components/common/Pagination";
import { AssignManagerModal } from "@/features/organizations/components/AssignManagerModal";
import apiClient        from "@/services/api.client";
import { ENDPOINTS }    from "@/services/endpoints";
import { parseApiError, extractArray, extractCount } from "@/utils/error.utils";
import toast            from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProvinceOffice {
  id:             number;
  name:           string;
  province:       number;
  province_name:  string;
  manager:        number | null;
  manager_name:   string;
  manager_phone:  string;
  address:        string;
  phone:          string;
  email:          string;
  chambers_count: number;
  is_active:      boolean;
}

interface Province {
  id:   number;
  name: string;
}

interface OfficeForm {
  province_id: string;
  name:        string;
  address:     string;
  phone:       string;
  email:       string;
}

const DEFAULT_FORM: OfficeForm = {
  province_id: "",
  name:        "",
  address:     "",
  phone:       "",
  email:       "",
};

// ─── Create/Edit Modal — بدون footer prop ────────────────────────────────────

function OfficeFormModal({
  isOpen,
  onClose,
  onSave,
  isEdit,
  form,
  onChange,
  provinceOptions,
  saving,
}: {
  isOpen:          boolean;
  onClose:         () => void;
  onSave:          () => void;
  isEdit:          boolean;
  form:            OfficeForm;
  onChange:        (f: OfficeForm) => void;
  provinceOptions: { value: number; label: string }[];
  saving:          boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "ویرایش دفتر استانداری" : "دفتر استانداری جدید"}
      size="md"
    >
      <div className="space-y-4">
        <Select
          label="استان"
          placeholder="انتخاب استان..."
          options={provinceOptions}
          value={form.province_id}
          onChange={(e) => onChange({ ...form, province_id: e.target.value })}
          required
        />
        <Input
          label="نام دفتر"
          placeholder="مثال: استانداری همدان"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          required
        />
        <Input
          label="آدرس"
          placeholder="آدرس کامل"
          value={form.address}
          onChange={(e) => onChange({ ...form, address: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="تلفن"
            placeholder="021-XXXXXXXX"
            value={form.phone}
            onChange={(e) => onChange({ ...form, phone: e.target.value })}
            dir="ltr"
          />
          <Input
            label="ایمیل"
            type="email"
            placeholder="example@gov.ir"
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
            dir="ltr"
          />
        </div>

        {/* Footer داخل مودال */}
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving} fullWidth>
            انصراف
          </Button>
          <Button onClick={onSave} isLoading={saving} fullWidth>
            {isEdit ? "ذخیره تغییرات" : "ایجاد دفتر"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminProvinceOfficesPage() {
  const [offices,    setOffices]    = useState<ProvinceOffice[]>([]);
  const [provinces,  setProvinces]  = useState<Province[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search,     setSearch]     = useState("");

  // modal states
  const [showModal,  setShowModal]  = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selected,   setSelected]   = useState<ProvinceOffice | null>(null);
  const [form,       setForm]       = useState<OfficeForm>(DEFAULT_FORM);
  const [saving,     setSaving]     = useState(false);

  const isEdit = !!selected && showModal;

  // ── Fetch provinces ────────────────────────────────────────────────────────
  useEffect(() => {
    apiClient
      .get(ENDPOINTS.GEOGRAPHY.PROVINCES, { params: { page_size: 100 } })
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setProvinces(extractArray<Province>(data));
      })
      .catch(() => {});
  }, []);

  // ── Fetch offices ──────────────────────────────────────────────────────────
  const fetchOffices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 10 };
      if (search) params.search = search;

      const res  = await apiClient.get(
        ENDPOINTS.ORGANIZATIONS.PROVINCE_OFFICES,
        { params }
      );
      const data = res.data?.data ?? res.data;

      setOffices(extractArray<ProvinceOffice>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 10) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchOffices(); }, [fetchOffices]);
  useEffect(() => { setPage(1); }, [search]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openCreate = () => {
    setSelected(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (o: ProvinceOffice) => {
    setSelected(o);
    setForm({
      province_id: String(o.province),
      name:        o.name,
      address:     o.address,
      phone:       o.phone,
      email:       o.email,
    });
    setShowModal(true);
  };

  const openAssign = (o: ProvinceOffice) => {
    setSelected(o);
    setShowAssign(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.province_id) {
      toast.error("نام و استان الزامی است");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, province_id: Number(form.province_id) };
      if (isEdit && selected) {
        await apiClient.patch(
          ENDPOINTS.ORGANIZATIONS.PROVINCE_OFFICE(selected.id),
          payload
        );
        toast.success("دفتر استانداری ویرایش شد");
      } else {
        await apiClient.post(ENDPOINTS.ORGANIZATIONS.PROVINCE_OFFICES, payload);
        toast.success("دفتر استانداری جدید ایجاد شد");
      }
      setShowModal(false);
      void fetchOffices();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // تخصیص مدیر — از AssignManagerModal دریافت می‌شود
  const handleAssign = async (managerId: number) => {
    if (!selected) return;
    await apiClient.post(
      ENDPOINTS.ORGANIZATIONS.PROVINCE_OFFICE_ASSIGN(selected.id),
      { manager_id: managerId }
    );
    toast.success("ناظر استانداری با موفقیت تخصیص یافت");
    setShowAssign(false);
    void fetchOffices();
  };

  const provinceOptions = provinces.map((p) => ({ value: p.id, label: p.name }));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="دفاتر استانداری"
        subtitle={`${totalCount.toLocaleString("fa-IR")} دفتر استانداری`}
        breadcrumbs={[
          { label: "ادمین" },
          { label: "سازمان‌ها" },
          { label: "استانداری‌ها" },
        ]}
        actions={
          <Button
            onClick={openCreate}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            دفتر جدید
          </Button>
        }
      />

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                          h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="جستجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-primary-100
                       focus:border-primary-500 bg-slate-50 transition-all"
          />
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 p-5
                         animate-pulse space-y-4"
            >
              <div className="flex gap-3">
                <div className="h-12 w-12 bg-slate-200 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-slate-200 rounded" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : offices.length === 0 ? (
        <EmptyState
          title="دفتری یافت نشد"
          description="دفتر استانداری جدید اضافه کنید"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {offices.map((office) => (
              <OfficeCard
                key={office.id}
                office={office}
                onEdit={openEdit}
                onAssign={openAssign}
              />
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

      {/* Modal: Create / Edit */}
      <OfficeFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        isEdit={isEdit}
        form={form}
        onChange={setForm}
        provinceOptions={provinceOptions}
        saving={saving}
      />

      {/* Modal: Assign Manager — استفاده از AssignManagerModal مشترک */}
      <AssignManagerModal
        isOpen={showAssign}
        onClose={() => setShowAssign(false)}
        onConfirm={handleAssign}
        title="تخصیص ناظر استانداری"
        entityName={selected?.name ?? ""}
        entityMeta={selected?.province_name}
        roleFilter="province_manager"
      />
    </div>
  );
}

// ─── OfficeCard ───────────────────────────────────────────────────────────────

function OfficeCard({
  office,
  onEdit,
  onAssign,
}: {
  office:   ProvinceOffice;
  onEdit:   (o: ProvinceOffice) => void;
  onAssign: (o: ProvinceOffice) => void;
}) {
  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-card p-5
                 hover:shadow-card-hover transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#1B3A6B,#2E6DB4)" }}
          >
            <BuildingOffice2Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{office.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{office.province_name}</p>
          </div>
        </div>
        <Badge variant={office.is_active ? "success" : "danger"} dot size="sm">
          {office.is_active ? "فعال" : "غیرفعال"}
        </Badge>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        {office.manager_name ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <UserIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span>
              ناظر:{" "}
              <span className="font-medium">{office.manager_name}</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <UserIcon className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs">ناظر تخصیص داده نشده</span>
          </div>
        )}

        {office.phone && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <PhoneIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span dir="ltr">{office.phone}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary-50 text-primary-700
                           px-2 py-0.5 rounded-lg font-medium">
            {(office.chambers_count ?? 0).toLocaleString("fa-IR")} اتاق اصناف
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-slate-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(office)}
          leftIcon={<PencilSquareIcon className="h-3.5 w-3.5" />}
        >
          ویرایش
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAssign(office)}
          leftIcon={<UserIcon className="h-3.5 w-3.5" />}
        >
          تخصیص ناظر
        </Button>
      </div>
    </div>
  );
}