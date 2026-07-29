"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  UserCircleIcon, PhoneIcon, EnvelopeIcon,
  IdentificationCardIcon, ShieldCheckIcon,
  CalendarIcon, ClockIcon, CheckCircleIcon,
  XCircleIcon, ArrowPathIcon, KeyIcon,
  BuildingStorefrontIcon, ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageLoader } from "@/components/ui/Spinner";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { parseApiError, extractArray } from "@/utils/error.utils";
import { toJalaliWithTime } from "@/utils/date.utils";
import { ROLE_LABELS } from "@/constants/roles";
import type { Role } from "@/types/common.types";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface UserDetail {
  id:                number;
  full_name:         string;
  first_name:        string;
  last_name:         string;
  phone_number:      string;
  email:             string;
  national_code:     string;
  role:              Role;
  role_display:      string;
  is_active:         boolean;
  is_phone_verified: boolean;
  avatar:            string | null;
  date_joined:       string;
  last_login_at:     string;
  created_at:        string;
  updated_at:        string;
}

interface RelatedStore {
  id:             number;
  name:           string;
  union_name:     string;
  status:         string;
  status_display: string;
}

interface RelatedComplaint {
  uuid:           string;
  title:          string;
  status:         string;
  status_display: string;
  created_at:     string;
}

const ROLE_OPTIONS = [
  { value: "admin",            label: ROLE_LABELS.admin },
  { value: "province_manager", label: ROLE_LABELS.province_manager },
  { value: "chamber_manager",  label: ROLE_LABELS.chamber_manager },
  { value: "union_manager",    label: ROLE_LABELS.union_manager },
  { value: "store_owner",      label: ROLE_LABELS.store_owner },
  { value: "inspector",        label: ROLE_LABELS.inspector },
  { value: "customer",         label: ROLE_LABELS.customer },
];

type TabId = "info" | "stores" | "complaints" | "activity";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{className?:string}> }[] = [
  { id: "info",       label: "اطلاعات",       icon: UserCircleIcon },
  { id: "stores",     label: "فروشگاه‌ها",     icon: BuildingStorefrontIcon },
  { id: "complaints", label: "شکایات",        icon: ClipboardDocumentListIcon },
  { id: "activity",   label: "فعالیت‌ها",     icon: ClockIcon },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [stores, setStores] = useState<RelatedStore[]>([]);
  const [complaints, setComplaints] = useState<RelatedComplaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("info");

  // modals
  const [showChangeRole, setShowChangeRole] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newRole, setNewRole] = useState<Role | "">("");
  const [isSaving, setIsSaving] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchUser = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.AUTH.USER(Number(id)));
      const data = res.data?.data ?? res.data;
      setUser(data);
      setNewRole(data.role);
    } catch (err) {
      toast.error(parseApiError(err));
      router.push("/admin/users");
    }
  };

  const fetchRelated = async () => {
    if (!user) return;

    // Stores (if store_owner)
    if (user.role === "store_owner") {
      try {
        const r = await apiClient.get(ENDPOINTS.STORES.LIST, {
          params: { owner: id, page_size: 10 },
        });
        const d = r.data?.data ?? r.data;
        setStores(extractArray<RelatedStore>(d));
      } catch { /* silent */ }
    }

    // Complaints (if customer or inspector)
    if (user.role === "customer" || user.role === "inspector") {
      try {
        const r = await apiClient.get(ENDPOINTS.COMPLAINTS.MY, {
          params: { page_size: 10 },
        });
        const d = r.data?.data ?? r.data;
        setComplaints(extractArray<RelatedComplaint>(d));
      } catch { /* silent */ }
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchUser();
      setIsLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (user) fetchRelated();
  }, [user]);

  // ── change role ────────────────────────────────────────────────────────────
  const handleChangeRole = async () => {
    if (!newRole || newRole === user?.role) return;
    setIsSaving(true);
    try {
      await apiClient.patch(ENDPOINTS.AUTH.CHANGE_ROLE(Number(id)), {
        role: newRole,
      });
      toast.success("نقش کاربر با موفقیت تغییر یافت");
      setShowChangeRole(false);
      await fetchUser();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  // ── deactivate ─────────────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    setIsSaving(true);
    try {
      await apiClient.delete(ENDPOINTS.AUTH.USER(Number(id)));
      toast.success("کاربر غیرفعال شد");
      setShowDeactivate(false);
      router.push("/admin/users");
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  // ── reset password ─────────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    setIsSaving(true);
    try {
      // این endpoint فرضی است - در صورت نیاز پیاده‌سازی شود
      await apiClient.post(`/api/v1/auth/users/${id}/reset-password/`);
      toast.success("رمز عبور بازنشانی و به موبایل کاربر ارسال شد");
      setShowResetPassword(false);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.full_name}
        subtitle={`${user.phone_number} • ${user.role_display}`}
        breadcrumbs={[
          { label: "کاربران", href: "/admin/users" },
          { label: user.full_name },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {user.is_active ? (
              <Badge variant="success" dot size="md">فعال</Badge>
            ) : (
              <Badge variant="default" dot size="md">غیرفعال</Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangeRole(true)}
              leftIcon={<ShieldCheckIcon className="h-4 w-4" />}
            >
              تغییر نقش
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetPassword(true)}
              leftIcon={<KeyIcon className="h-4 w-4" />}
            >
              بازنشانی رمز
            </Button>

            {user.is_active && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeactivate(true)}
                leftIcon={<XCircleIcon className="h-4 w-4" />}
              >
                غیرفعال کردن
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Sidebar ── */}
        <div className="space-y-5">
          <Card padding="md">
            <div className="text-center">
              <div className="inline-block mb-4">
                <Avatar
                  name={user.full_name}
                  src={user.avatar}
                  size="xl"
                  status={user.is_phone_verified ? "online" : "offline"}
                />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                {user.full_name}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {user.phone_number}
              </p>
              <div className="mt-4">
                <Badge variant="primary" size="md">
                  {user.role_display}
                </Badge>
              </div>
            </div>
          </Card>

          <Card padding="sm">
            <div className="divide-y divide-slate-100">
              <InfoRow
                icon={CalendarIcon}
                label="تاریخ عضویت"
                value={toJalaliWithTime(user.date_joined)}
              />
              <InfoRow
                icon={ClockIcon}
                label="آخرین ورود"
                value={user.last_login_at ? toJalaliWithTime(user.last_login_at) : "—"}
              />
              <InfoRow
                icon={PhoneIcon}
                label="وضعیت موبایل"
                value={
                  user.is_phone_verified ? (
                    <Badge variant="success" size="sm" dot>تایید شده</Badge>
                  ) : (
                    <Badge variant="warning" size="sm" dot>تایید نشده</Badge>
                  )
                }
              />
            </div>
          </Card>

          {/* Quick stats */}
          {user.role === "store_owner" && stores.length > 0 && (
            <Card padding="md">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                فروشگاه‌ها
              </p>
              <div className="text-center p-4 bg-primary-50 rounded-xl">
                <p className="text-3xl font-bold text-primary-700">
                  {stores.length}
                </p>
                <p className="text-xs text-primary-600 mt-1">فروشگاه ثبت شده</p>
              </div>
            </Card>
          )}

          {(user.role === "customer" || user.role === "inspector") && complaints.length > 0 && (
            <Card padding="md">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                شکایات
              </p>
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <p className="text-3xl font-bold text-orange-700">
                  {complaints.length}
                </p>
                <p className="text-xs text-orange-600 mt-1">شکایت ثبت شده</p>
              </div>
            </Card>
          )}
        </div>

        {/* ── Main ── */}
        <Card className="lg:col-span-2" padding="none">
          {/* Tabs */}
          <div className="px-5 py-3 border-b border-slate-100 flex gap-1 bg-slate-50/50">
            {TABS.map((tab) => {
              // hide stores tab if not store_owner
              if (tab.id === "stores" && user.role !== "store_owner") return null;
              // hide complaints tab if not customer/inspector
              if (tab.id === "complaints" && user.role !== "customer" && user.role !== "inspector") return null;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold",
                    "transition-all duration-200",
                    activeTab === tab.id
                      ? "bg-white text-primary-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-5">
            {activeTab === "info" && <InfoTab user={user} />}
            {activeTab === "stores" && <StoresTab stores={stores} />}
            {activeTab === "complaints" && <ComplaintsTab complaints={complaints} />}
            {activeTab === "activity" && <ActivityTab userId={Number(id)} />}
          </div>
        </Card>
      </div>

      {/* ── Modal: Change Role ── */}
      <Modal
        isOpen={showChangeRole}
        onClose={() => { setShowChangeRole(false); setNewRole(user.role); }}
        title="تغییر نقش کاربر"
        description={`تغییر نقش ${user.full_name}`}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => { setShowChangeRole(false); setNewRole(user.role); }}
            >
              انصراف
            </Button>
            <Button
              onClick={handleChangeRole}
              isLoading={isSaving}
              disabled={!newRole || newRole === user.role}
              leftIcon={<CheckCircleIcon className="h-4 w-4" />}
            >
              تایید تغییر
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="نقش جدید"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as Role)}
            options={ROLE_OPTIONS}
            required
          />
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-800">
              ⚠️ تغییر نقش کاربر ممکن است دسترسی‌های او را تغییر دهد.
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Confirm: Deactivate ── */}
      <ConfirmDialog
        isOpen={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        onConfirm={handleDeactivate}
        title="غیرفعال کردن کاربر"
        message={`آیا از غیرفعال کردن کاربر «${user.full_name}» اطمینان دارید؟ کاربر پس از غیرفعال شدن نمی‌تواند وارد سیستم شود.`}
        confirmLabel="بله، غیرفعال کن"
        variant="danger"
        isLoading={isSaving}
      />

      {/* ── Confirm: Reset Password ── */}
      <ConfirmDialog
        isOpen={showResetPassword}
        onClose={() => setShowResetPassword(false)}
        onConfirm={handleResetPassword}
        title="بازنشانی رمز عبور"
        message={`رمز عبور جدید برای «${user.full_name}» ساخته شده و به شماره موبایل ${user.phone_number} ارسال می‌شود.`}
        confirmLabel="بله، بازنشانی کن"
        variant="warning"
        isLoading={isSaving}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className="text-xs font-medium text-slate-700">{value}</div>
    </div>
  );
}

function InfoTab({ user }: { user: UserDetail }) {
  const fields = [
    { icon: UserCircleIcon,         label: "نام",          value: user.first_name },
    { icon: UserCircleIcon,         label: "نام خانوادگی", value: user.last_name },
    { icon: PhoneIcon,              label: "موبایل",       value: user.phone_number },
    { icon: EnvelopeIcon,           label: "ایمیل",        value: user.email || "—" },
    { icon: IdentificationCardIcon, label: "کد ملی",       value: user.national_code || "—" },
    { icon: ShieldCheckIcon,        label: "نقش",          value: user.role_display },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(({ icon: I, label, value }) => (
        <div key={label} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
          <div className="h-10 w-10 rounded-lg bg-white border border-slate-200
                           flex items-center justify-center flex-shrink-0">
            <I className="h-5 w-5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StoresTab({ stores }: { stores: RelatedStore[] }) {
  if (stores.length === 0) {
    return (
      <div className="text-center py-12">
        <BuildingStorefrontIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">فروشگاهی ثبت نشده است</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {stores.map((store) => (
        <div
          key={store.id}
          className="flex items-center gap-3 p-4 rounded-xl border border-slate-100
                     hover:bg-slate-50 transition-colors"
        >
          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <BuildingStorefrontIcon className="h-5 w-5 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate">{store.name}</p>
            <p className="text-xs text-slate-500">{store.union_name}</p>
          </div>
          <StatusBadge status={store.status} label={store.status_display} />
        </div>
      ))}
    </div>
  );
}

function ComplaintsTab({ complaints }: { complaints: RelatedComplaint[] }) {
  if (complaints.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardDocumentListIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">شکایتی ثبت نشده است</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {complaints.map((c) => (
        <div
          key={c.uuid}
          className="flex items-center gap-3 p-4 rounded-xl border border-slate-100
                     hover:bg-slate-50 transition-colors"
        >
          <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <ClipboardDocumentListIcon className="h-5 w-5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800 truncate">{c.title}</p>
            <p className="text-xs text-slate-400">{toJalaliWithTime(c.created_at)}</p>
          </div>
          <ComplaintBadge status={c.status} label={c.status_display} />
        </div>
      ))}
    </div>
  );
}

function ActivityTab({ userId }: { userId: number }) {
  // فعلاً placeholder - می‌توان timeline ورودها یا تغییرات را نمایش داد
  return (
    <div className="text-center py-12">
      <ClockIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 text-sm">تاریخچه فعالیت کاربر در آینده اضافه می‌شود</p>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const map: Record<string, "success"|"danger"|"warning"|"default"> = {
    active: "success", pending: "warning", suspended: "danger",
    rejected: "danger", closed: "default",
  };
  return (
    <Badge variant={map[status] ?? "default"} size="sm" dot>
      {label}
    </Badge>
  );
}

function ComplaintBadge({ status, label }: { status: string; label: string }) {
  const map: Record<string, "success"|"danger"|"warning"|"info"|"default"> = {
    submitted: "info", reviewing: "warning", referred: "warning",
    inspecting: "warning", confirmed: "success", rejected: "danger", closed: "default",
  };
  return (
    <Badge variant={map[status] ?? "default"} size="sm" dot>
      {label}
    </Badge>
  );
}