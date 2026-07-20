"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon, MagnifyingGlassIcon,
  UserCircleIcon, ShieldCheckIcon,
  CheckCircleIcon, XCircleIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Button }        from "@/components/ui/Button";
import { Badge }         from "@/components/ui/Badge";
import { Modal }         from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input }         from "@/components/ui/Input";
import { Select }        from "@/components/ui/Select";
import { Avatar }        from "@/components/ui/Avatar";
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
import { toJalali }      from "@/utils/date.utils";
import { ROLE_LABELS, ROLE_COLORS } from "@/constants/roles";
import toast             from "react-hot-toast";
import { cn }            from "@/lib/cn";
import type { Role }     from "@/types/common.types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface User {
  id:           number;
  full_name:    string;
  first_name:   string;
  last_name:    string;
  phone_number: string;
  email:        string | null;
  national_code:string | null;
  role:         Role;
  role_display: string;
  is_active:    boolean;
  date_joined:  string;
  last_login_at:string | null;
}

interface CreateUserForm {
  phone_number:  string;
  role:          string;
  first_name:    string;
  last_name:     string;
  national_code: string;
  password:      string;
}

const DEFAULT_FORM: CreateUserForm = {
  phone_number: "", role: "", first_name: "",
  last_name: "", national_code: "", password: "",
};

const ORG_ROLE_OPTIONS = [
  { value: "province_manager", label: "ناظر استانداری"   },
  { value: "chamber_manager",  label: "مدیر اتاق اصناف"  },
  { value: "union_manager",    label: "رئیس اتحادیه"      },
  { value: "store_owner",      label: "صاحب فروشگاه"      },
  { value: "inspector",        label: "بازرس"              },
];

const ALL_ROLE_OPTIONS = [
  { value: "", label: "همه نقش‌ها" },
  ...ORG_ROLE_OPTIONS,
  { value: "admin",    label: "ادمین"    },
  { value: "customer", label: "شهروند"  },
];

const STATUS_OPTIONS = [
  { value: "",     label: "همه وضعیت‌ها" },
  { value: "true", label: "فعال"          },
  { value: "false",label: "غیرفعال"      },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users,        setUsers]        = useState<User[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [totalCount,   setTotalCount]   = useState(0);
  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showCreate,    setShowCreate]    = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeactivate,setShowDeactivate]= useState(false);
  const [selected,      setSelected]      = useState<User | null>(null);
  const [form,          setForm]          = useState<CreateUserForm>(DEFAULT_FORM);
  const [newRole,       setNewRole]       = useState("");
  const [saving,        setSaving]        = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 10 };
      if (search)       params.search    = search;
      if (roleFilter)   params.role      = roleFilter;
      if (statusFilter) params.is_active = statusFilter;

      const res  = await apiClient.get(ENDPOINTS.AUTH.USERS, { params });
      const data = res.data?.data ?? res.data;
      setUsers(extractArray<User>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 10) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); },              [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  // ── create user ────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.phone_number || !form.role) {
      toast.error("شماره موبایل و نقش الزامی است");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(ENDPOINTS.AUTH.USERS, form);
      toast.success("کاربر سازمانی ایجاد شد");
      setShowCreate(false);
      setForm(DEFAULT_FORM);
      fetchUsers();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // ── change role ────────────────────────────────────────────────────────────
  const handleRoleChange = async () => {
    if (!selected || !newRole) {
      toast.error("نقش جدید را انتخاب کنید");
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch(ENDPOINTS.AUTH.USER_ROLE(selected.id), { role: newRole });
      toast.success("نقش کاربر تغییر کرد");
      setShowRoleModal(false);
      fetchUsers();
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
      await apiClient.delete(ENDPOINTS.AUTH.USER(selected.id));
      toast.success("کاربر غیرفعال شد");
      setShowDeactivate(false);
      fetchUsers();
    } catch (err) {
      toast.error(parseApiError(err));
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <PageHeader
        title="مدیریت کاربران"
        subtitle={`${totalCount.toLocaleString("fa-IR")} کاربر در سامانه`}
        breadcrumbs={[{ label: "ادمین" }, { label: "کاربران" }]}
        actions={
          <Button
            onClick={() => { setForm(DEFAULT_FORM); setShowCreate(true); }}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            کاربر سازمانی جدید
          </Button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">

          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                             h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="جستجو بر اساس نام، موبایل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                         focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-primary-100
                       bg-white appearance-none min-w-[170px]"
          >
            {ALL_ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-primary-100
                       bg-white appearance-none min-w-[140px]"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : users.length === 0 ? (
          <EmptyState
            title="کاربری یافت نشد"
            description="کاربر سازمانی جدید ایجاد کنید"
            action={
              <Button
                onClick={() => setShowCreate(true)}
                leftIcon={<PlusIcon className="h-4 w-4" />}
              >
                کاربر جدید
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #f1f5f9",
                  }}>
                    {["کاربر","نقش","وضعیت","تاریخ عضویت","آخرین ورود","عملیات"].map((h) => (
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
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60
                                 transition-colors"
                    >
                      {/* User */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={user.full_name}
                            size="sm"
                          />
                          <div>
                            <p className="font-semibold text-slate-800">
                              {user.full_name || "—"}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              {user.phone_number}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full",
                          "text-xs font-semibold border",
                          ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-700 border-gray-200"
                        )}>
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {user.is_active ? (
                          <Badge variant="success" dot size="sm">فعال</Badge>
                        ) : (
                          <Badge variant="danger" dot size="sm">غیرفعال</Badge>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {toJalali(user.date_joined)}
                      </td>

                      {/* Last login */}
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {user.last_login_at
                          ? toJalali(user.last_login_at)
                          : <span className="text-slate-300">—</span>
                        }
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">

                          {/* Change role */}
                          <button
                            onClick={() => {
                              setSelected(user);
                              setNewRole(user.role);
                              setShowRoleModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400
                                       hover:text-primary-600 hover:bg-primary-50
                                       transition-colors"
                            title="تغییر نقش"
                          >
                            <ShieldCheckIcon className="h-4 w-4" />
                          </button>

                          {/* Deactivate */}
                          {user.is_active && (
                            <button
                              onClick={() => {
                                setSelected(user);
                                setShowDeactivate(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400
                                         hover:text-red-600 hover:bg-red-50
                                         transition-colors"
                              title="غیرفعال کردن"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50
                              flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  نمایش {users.length} از {totalCount.toLocaleString("fa-IR")} کاربر
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

      {/* ── Modal: Create User ── */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="ایجاد کاربر سازمانی"
        description="کاربران سازمانی با رمز عبور وارد سیستم می‌شوند"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              انصراف
            </Button>
            <Button onClick={handleCreate} isLoading={saving}>
              ایجاد کاربر
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="شماره موبایل"
            placeholder="09XXXXXXXXX"
            value={form.phone_number}
            onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))}
            type="tel"
            dir="ltr"
            required
          />

          <Select
            label="نقش سازمانی"
            placeholder="انتخاب نقش..."
            options={ORG_ROLE_OPTIONS}
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="نام"
              placeholder="نام"
              value={form.first_name}
              onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
            />
            <Input
              label="نام خانوادگی"
              placeholder="نام خانوادگی"
              value={form.last_name}
              onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
            />
          </div>

          <Input
            label="کد ملی"
            placeholder="XXXXXXXXXX"
            value={form.national_code}
            onChange={(e) => setForm((p) => ({ ...p, national_code: e.target.value }))}
            dir="ltr"
            maxLength={10}
          />

          <Input
            label="رمز عبور اولیه"
            type="password"
            placeholder="حداقل ۶ کاراکتر"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            hint="کاربر می‌تواند بعداً رمز خود را تغییر دهد"
          />
        </div>
      </Modal>

      {/* ── Modal: Change Role ── */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="تغییر نقش کاربر"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRoleModal(false)}>
              انصراف
            </Button>
            <Button onClick={handleRoleChange} isLoading={saving}>
              ذخیره تغییرات
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {selected && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Avatar name={selected.full_name} size="sm" />
              <div>
                <p className="font-semibold text-sm text-slate-800">
                  {selected.full_name}
                </p>
                <p className="text-xs text-slate-400">{selected.phone_number}</p>
              </div>
            </div>
          )}

          <Select
            label="نقش جدید"
            options={[...ORG_ROLE_OPTIONS, { value: "customer", label: "شهروند" }]}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            required
          />
        </div>
      </Modal>

      {/* ── Confirm: Deactivate ── */}
      <ConfirmDialog
        isOpen={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        onConfirm={handleDeactivate}
        title="غیرفعال کردن کاربر"
        message={`آیا از غیرفعال کردن «${selected?.full_name}» اطمینان دارید؟ کاربر دیگر نمی‌تواند وارد شود.`}
        confirmLabel="غیرفعال کن"
        variant="danger"
      />
    </div>
  );
}