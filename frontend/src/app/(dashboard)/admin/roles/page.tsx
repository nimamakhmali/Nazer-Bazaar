"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheckIcon, UserGroupIcon, CheckCircleIcon,
  XCircleIcon, BuildingStorefrontIcon, ClipboardDocumentListIcon,
  CurrencyDollarIcon, ChartBarIcon, EyeIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { ROLE_LABELS } from "@/constants/roles";
import type { Role } from "@/types/common.types";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
// Role permissions config
// ─────────────────────────────────────────────────────────────────────────────
interface RoleConfig {
  role:         Role;
  label:        string;
  description:  string;
  color:        string;
  icon:         React.ComponentType<{ className?: string }>;
  permissions:  string[];
  usersCount:   number;
}

const ROLE_CONFIGS: Omit<RoleConfig, "usersCount">[] = [
  {
    role:        "admin",
    label:       ROLE_LABELS.admin,
    description: "دسترسی کامل به تمام بخش‌های سیستم",
    color:       "from-purple-600 to-purple-800",
    icon:        ShieldCheckIcon,
    permissions: [
      "مدیریت کاربران",
      "مدیریت استان‌ها و شهرها",
      "مدیریت سازمان‌ها",
      "مدیریت محصولات",
      "مدیریت محتوا",
      "دسترسی به تمام گزارشات",
    ],
  },
  {
    role:        "province_manager",
    label:       ROLE_LABELS.province_manager,
    description: "مدیریت و نظارت بر سطح استان",
    color:       "from-blue-600 to-blue-800",
    icon:        ChartBarIcon,
    permissions: [
      "مشاهده آمار استان",
      "نظارت بر اتاق‌های اصناف",
      "بررسی شکایات استان",
      "دریافت گزارشات تفصیلی",
    ],
  },
  {
    role:        "chamber_manager",
    label:       ROLE_LABELS.chamber_manager,
    description: "مدیریت اتاق اصناف و فروشگاه‌های شهر",
    color:       "from-indigo-600 to-indigo-800",
    icon:        BuildingStorefrontIcon,
    permissions: [
      "تایید/رد فروشگاه‌های جدید",
      "مدیریت اتحادیه‌های شهر",
      "بررسی شکایات شهر",
      "نظارت بر قیمت‌گذاری",
    ],
  },
  {
    role:        "union_manager",
    label:       ROLE_LABELS.union_manager,
    description: "مدیریت اتحادیه و قیمت‌گذاری روزانه",
    color:       "from-primary-600 to-primary-800",
    icon:        CurrencyDollarIcon,
    permissions: [
      "ثبت قیمت‌های مصوب روزانه",
      "مدیریت فروشگاه‌های عضو",
      "بررسی گران‌فروشی‌ها",
      "پاسخ به شکایات",
    ],
  },
  {
    role:        "store_owner",
    label:       ROLE_LABELS.store_owner,
    description: "مدیریت فروشگاه و قیمت‌گذاری محصولات",
    color:       "from-green-600 to-green-800",
    icon:        BuildingStorefrontIcon,
    permissions: [
      "ثبت فروشگاه جدید",
      "قیمت‌گذاری محصولات",
      "مدیریت مدارک فروشگاه",
      "مشاهده شکایات دریافتی",
    ],
  },
  {
    role:        "inspector",
    label:       ROLE_LABELS.inspector,
    description: "بازرسی و رسیدگی به شکایات",
    color:       "from-orange-600 to-orange-800",
    icon:        ClipboardDocumentListIcon,
    permissions: [
      "بررسی شکایات محوله",
      "بازدید از فروشگاه‌ها",
      "ثبت گزارش بازرسی",
      "تایید/رد شکایات",
    ],
  },
  {
    role:        "customer",
    label:       ROLE_LABELS.customer,
    description: "شهروندان عادی - ثبت شکایت",
    color:       "from-slate-600 to-slate-800",
    icon:        UserGroupIcon,
    permissions: [
      "ثبت شکایت جدید",
      "رهگیری شکایات",
      "مشاهده قیمت‌های عمومی",
      "جستجوی فروشگاه‌ها",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleConfig | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // ── fetch user counts per role ─────────────────────────────────────────────
  useEffect(() => {
    const fetchCounts = async () => {
      setIsLoading(true);
      try {
        const promises = ROLE_CONFIGS.map(async (config) => {
          try {
            const res = await apiClient.get(ENDPOINTS.AUTH.USERS, {
              params: { role: config.role, page_size: 1 },
            });
            const data = res.data?.data ?? res.data;
            return {
              ...config,
              usersCount: data?.count ?? 0,
            };
          } catch {
            return { ...config, usersCount: 0 };
          }
        });

        const results = await Promise.all(promises);
        setRoles(results);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, []);

  // ── view detail ────────────────────────────────────────────────────────────
  const viewDetail = (role: RoleConfig) => {
    setSelectedRole(role);
    setShowDetail(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت نقش‌ها و دسترسی‌ها"
        subtitle="نمایش نقش‌های سیستمی و تعداد کاربران هر نقش"
        breadcrumbs={[
          { label: "مدیریت کاربران", href: "/admin/users" },
          { label: "نقش‌ها" },
        ]}
      />

      {/* ── Roles Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {roles.map((role) => (
            <RoleCard key={role.role} role={role} onViewDetail={viewDetail} />
          ))}
        </div>
      )}

      {/* ── Detail Modal ── */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={selectedRole?.label ?? ""}
        description={selectedRole?.description}
        size="lg"
        footer={
          <div className="flex items-center gap-3 w-full">
            <Button variant="ghost" onClick={() => setShowDetail(false)} fullWidth>
              بستن
            </Button>
            <Button
              onClick={() => {
                window.location.href = `/admin/users?role=${selectedRole?.role}`;
              }}
              fullWidth
            >
              مشاهده کاربران این نقش
            </Button>
          </div>
        }
      >
        {selectedRole && (
          <div className="space-y-5">
            {/* Header */}
            <div
              className={cn(
                "p-5 rounded-2xl bg-gradient-to-br text-white",
                selectedRole.color
              )}
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur-sm
                                 flex items-center justify-center flex-shrink-0">
                  <selectedRole.icon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedRole.label}</h3>
                  <p className="text-sm opacity-90 mt-0.5">
                    {selectedRole.usersCount.toLocaleString("fa-IR")} کاربر فعال
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <p className="text-sm font-bold text-slate-700 mb-3">
                دسترسی‌های این نقش:
              </p>
              <div className="space-y-2">
                {selectedRole.permissions.map((perm, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                  >
                    <div className="h-6 w-6 rounded-lg bg-green-100 flex items-center
                                     justify-center flex-shrink-0">
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm text-slate-700">{perm}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center
                                 justify-center flex-shrink-0">
                  <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    نکته امنیتی
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    تغییر نقش کاربران تنها توسط ادمین کل امکان‌پذیر است.
                    دسترسی‌های هر نقش توسط سیستم کنترل می‌شود.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Card
// ─────────────────────────────────────────────────────────────────────────────
function RoleCard({
  role,
  onViewDetail,
}: {
  role: RoleConfig;
  onViewDetail: (role: RoleConfig) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card
                     hover:shadow-card-hover transition-all duration-200 overflow-hidden">
      {/* Gradient header */}
      <div className={cn("h-2 bg-gradient-to-r", role.color)} />

      <div className="p-5">
        {/* Icon + Title */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={cn(
              "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0",
              role.color
            )}
          >
            <role.icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 truncate">{role.label}</h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
              {role.description}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-slate-50 rounded-xl text-center">
            <UserGroupIcon className="h-4 w-4 text-slate-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800">
              {role.usersCount.toLocaleString("fa-IR")}
            </p>
            <p className="text-[10px] text-slate-400">کاربر فعال</p>
          </div>
          <div className="p-3 bg-primary-50 rounded-xl text-center">
            <ShieldCheckIcon className="h-4 w-4 text-primary-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-primary-700">
              {role.permissions.length}
            </p>
            <p className="text-[10px] text-primary-500">دسترسی</p>
          </div>
        </div>

        {/* Permissions preview */}
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 mb-2">نمونه دسترسی‌ها:</p>
          <div className="space-y-1.5">
            {role.permissions.slice(0, 3).map((perm, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircleIcon className="h-3 w-3 text-green-500 flex-shrink-0" />
                <span className="truncate">{perm}</span>
              </div>
            ))}
            {role.permissions.length > 3 && (
              <p className="text-xs text-slate-400 text-center pt-1">
                و {role.permissions.length - 3} دسترسی دیگر...
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetail(role)}
            leftIcon={<EyeIcon className="h-3.5 w-3.5" />}
          >
            جزئیات
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.location.href = `/admin/users?role=${role.role}`;
            }}
            leftIcon={<UserGroupIcon className="h-3.5 w-3.5" />}
          >
            کاربران
          </Button>
        </div>
      </div>
    </div>
  );
}