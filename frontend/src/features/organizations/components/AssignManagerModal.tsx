"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Modal }   from "@/components/ui/Modal";
import { Button }  from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Badge }   from "@/components/ui/Badge";
import { cn }      from "@/lib/cn";
import apiClient   from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { useDebounce } from "@/hooks/useDebounce";
import { ROLE_LABELS } from "@/constants/roles";
import type { Role } from "@/types/common.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgUser {
  id:               number;
  full_name:        string;
  phone_number:     string;
  role:             Role;
  role_display:     string;
  has_national_code: boolean;
}

interface AssignManagerModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  onConfirm:   (managerId: number) => Promise<void>;
  title:       string;
  entityName:  string;           // نام اتحادیه یا اتاق اصناف
  entityMeta?: string;           // اطلاعات تکمیلی (شهر، اتاق اصناف)
  roleFilter?: Role;             // فیلتر نقش (اختیاری)
  isLoading?:  boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssignManagerModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  entityName,
  entityMeta,
  roleFilter,
  isLoading = false,
}: AssignManagerModalProps) {

  const [query,        setQuery]        = useState("");
  const [users,        setUsers]        = useState<OrgUser[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [saving,       setSaving]       = useState(false);

  const debouncedQuery = useDebounce(query, 350);
  const inputRef       = useRef<HTMLInputElement>(null);

  // ─── بارگذاری اولیه (همه کاربران سازمانی) و هنگام تایپ ────────────────
  const fetchUsers = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const params: Record<string, string> = {};
      if (q)          params.q    = q;
      if (roleFilter) params.role = roleFilter;

      const res   = await apiClient.get(ENDPOINTS.AUTH.ORG_SEARCH, { params });
      const data  = res.data?.data ?? res.data;
      setUsers(Array.isArray(data) ? data : (data?.results ?? []));
    } catch {
      setUsers([]);
    } finally {
      setSearching(false);
    }
  }, [roleFilter]);

  // اجرا هنگام باز شدن modal
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setSelectedUser(null);
    fetchUsers("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen, fetchUsers]);

  // اجرا هنگام تایپ (debounced)
  useEffect(() => {
    if (!isOpen) return;
    fetchUsers(debouncedQuery);
  }, [debouncedQuery, isOpen, fetchUsers]);

  // ─── تایید تخصیص ─────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedUser)                    return;
    if (!selectedUser.has_national_code)  return; // دکمه disable است

    setSaving(true);
    try {
      await onConfirm(selectedUser.id);
      // بستن modal توسط والد انجام می‌شود
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            انصراف
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={saving}
            disabled={
              !selectedUser ||
              !selectedUser.has_national_code ||
              saving
            }
          >
            تخصیص
          </Button>
        </>
      }
    >
      <div className="space-y-4">

        {/* اطلاعات موجودیت */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-sm font-semibold text-slate-700">{entityName}</p>
          {entityMeta && (
            <p className="text-xs text-slate-400 mt-0.5">{entityMeta}</p>
          )}
        </div>

        {/* جستجو */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            placeholder="جستجو بر اساس نام یا شماره موبایل..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all"
          />
          {searching && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </div>
          )}
        </div>

        {/* لیست کاربران */}
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          {searching && users.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              کاربری یافت نشد
            </div>
          ) : (
            <ul className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelected={selectedUser?.id === user.id}
                  onSelect={setSelectedUser}
                />
              ))}
            </ul>
          )}
        </div>

        {/* اخطار کد ملی */}
        {selectedUser && !selectedUser.has_national_code && (
          <NationalCodeWarning userName={selectedUser.full_name} />
        )}

        {/* تایید انتخاب */}
        {selectedUser && selectedUser.has_national_code && (
          <SelectedUserConfirm user={selectedUser} />
        )}

      </div>
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserRow({
  user,
  isSelected,
  onSelect,
}: {
  user:       OrgUser;
  isSelected: boolean;
  onSelect:   (u: OrgUser) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(user)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-right transition-colors",
          isSelected
            ? "bg-primary/5 border-r-2 border-primary"
            : "hover:bg-slate-50"
        )}
      >
        {/* آیکون */}
        <div
          className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold",
            isSelected
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-500"
          )}
        >
          {user.full_name
            ? user.full_name.charAt(0)
            : <UserCircleIcon className="h-5 w-5" />
          }
        </div>

        {/* اطلاعات */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 truncate">
              {user.full_name || "بدون نام"}
            </span>
            <Badge
              variant="info"
              size="sm"
              className="flex-shrink-0 text-[10px]"
            >
              {user.role_display}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono" dir="ltr">
            {user.phone_number}
          </p>
        </div>

        {/* وضعیت کد ملی */}
        <div className="flex-shrink-0">
          {user.has_national_code ? (
            <CheckCircleIcon
              className="h-5 w-5 text-success"
              title="کد ملی ثبت شده"
            />
          ) : (
            <ExclamationTriangleIcon
              className="h-5 w-5 text-warning"
              title="کد ملی ثبت نشده"
            />
          )}
        </div>
      </button>
    </li>
  );
}

function NationalCodeWarning({ userName }: { userName: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
      <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-800">
          کد ملی ثبت نشده
        </p>
        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
          کد ملی <strong>«{userName}»</strong> در سامانه ثبت نشده است.
          تا زمانی که کد ملی این مدیر توسط ادمین در پروفایل وی ثبت نشود،
          امکان تخصیص مدیریت وجود ندارد.
        </p>
      </div>
    </div>
  );
}

function SelectedUserConfirm({ user }: { user: OrgUser }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
      <CheckCircleIcon className="h-5 w-5 text-success flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-green-800">
          انتخاب شده
        </p>
        <p className="text-xs text-green-700 mt-0.5">
          <strong>{user.full_name}</strong> به عنوان مدیر تخصیص می‌یابد
        </p>
      </div>
    </div>
  );
}