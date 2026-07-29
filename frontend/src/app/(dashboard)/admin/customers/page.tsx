"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  UserGroupIcon, MagnifyingGlassIcon, FunnelIcon,
  CheckCircleIcon, XCircleIcon, EyeIcon,
  ClipboardDocumentListIcon, CalendarIcon,
  PhoneIcon, EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { Drawer } from "@/components/ui/Drawer";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { extractArray, extractCount } from "@/utils/error.utils";
import { toJalali, toJalaliWithTime } from "@/utils/date.utils";
import { cn } from "@/lib/cn";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Customer {
  id:                number;
  full_name:         string;
  phone_number:      string;
  email:             string;
  is_phone_verified: boolean;
  is_active:         boolean;
  complaints_count:  number;
  date_joined:       string;
  last_login_at:     string;
}

interface CustomerDetail extends Customer {
  national_code: string;
  avatar:        string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // drawer
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        role: "customer",
        page,
        page_size: 15,
      };
      if (search) params.search = search;
      if (statusFilter !== "all") params.is_active = statusFilter === "active";
      if (verifiedFilter !== "all") params.is_phone_verified = verifiedFilter === "verified";

      const res = await apiClient.get(ENDPOINTS.AUTH.USERS, { params });
      const data = res.data?.data ?? res.data;
      setCustomers(extractArray<Customer>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 15) || 1);
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, verifiedFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, verifiedFilter]);

  // ── view detail ────────────────────────────────────────────────────────────
  const viewDetail = async (customer: Customer) => {
    setShowDrawer(true);
    setLoadingDetail(true);
    try {
      const res = await apiClient.get(ENDPOINTS.AUTH.USER(customer.id));
      const data = res.data?.data ?? res.data;
      setSelectedCustomer(data);
    } catch {
      /* silent */
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="مشتریان (شهروندان)"
        subtitle={`${totalCount.toLocaleString("fa-IR")} کاربر ثبت‌نام کرده`}
        breadcrumbs={[
          { label: "مدیریت کاربران", href: "/admin/users" },
          { label: "مشتریان" },
        ]}
      />

      {/* ── Filters ── */}
      <Card padding="md">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4
                         text-slate-400 pointer-events-none"
            />
            <input
              type="search"
              placeholder="جستجوی نام، موبایل، ایمیل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                         focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-primary-100
                       bg-white appearance-none min-w-[140px]"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
          </select>

          {/* Verified filter */}
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value as typeof verifiedFilter)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-primary-100
                       bg-white appearance-none min-w-[140px]"
          >
            <option value="all">همه تاییدیه‌ها</option>
            <option value="verified">تایید شده</option>
            <option value="unverified">تایید نشده</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<FunnelIcon className="h-4 w-4" />}
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setVerifiedFilter("all");
            }}
          >
            پاک کردن فیلترها
          </Button>
        </div>
      </Card>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={10} cols={6} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<UserGroupIcon className="h-16 w-16" />}
            title="مشتری یافت نشد"
            description="با فیلترهای انتخاب شده هیچ مشتری وجود ندارد."
            size="lg"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#f8fafc",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    {[
                      "مشتری",
                      "موبایل",
                      "ایمیل",
                      "شکایات",
                      "تاریخ عضویت",
                      "وضعیت",
                      "عملیات",
                    ].map((h) => (
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
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Name + Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={customer.full_name}
                            size="sm"
                            status={customer.is_phone_verified ? "online" : "offline"}
                          />
                          <div>
                            <p className="font-semibold text-slate-800">
                              {customer.full_name || "بدون نام"}
                            </p>
                            <p className="text-xs text-slate-400">
                              شناسه: {customer.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <PhoneIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="font-mono text-xs text-slate-700">
                            {customer.phone_number}
                          </span>
                          {customer.is_phone_verified && (
                            <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4">
                        {customer.email ? (
                          <div className="flex items-center gap-2">
                            <EnvelopeIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-slate-600 truncate max-w-[150px]">
                              {customer.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Complaints */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <ClipboardDocumentListIcon className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-bold text-slate-700">
                            {customer.complaints_count ?? 0}
                          </span>
                        </div>
                      </td>

                      {/* Date joined */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-500">
                            {toJalali(customer.date_joined)}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {customer.is_active ? (
                            <Badge variant="success" size="sm" dot>
                              فعال
                            </Badge>
                          ) : (
                            <Badge variant="default" size="sm" dot>
                              غیرفعال
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewDetail(customer)}
                            className="p-1.5 rounded-lg text-slate-400
                                       hover:text-primary-600 hover:bg-primary-50
                                       transition-colors"
                            aria-label="مشاهده جزئیات"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <Link href={`/admin/users/${customer.id}`}>
                            <button
                              className="p-1.5 rounded-lg text-slate-400
                                         hover:text-secondary-600 hover:bg-secondary-50
                                         transition-colors"
                              aria-label="مدیریت"
                            >
                              <UserGroupIcon className="h-4 w-4" />
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className="px-5 py-3 border-t border-slate-100 bg-slate-50/50
                           flex items-center justify-between"
              >
                <p className="text-xs text-slate-500">
                  نمایش {((page - 1) * 15 + 1).toLocaleString("fa-IR")} تا{" "}
                  {Math.min(page * 15, totalCount).toLocaleString("fa-IR")} از{" "}
                  {totalCount.toLocaleString("fa-IR")} مشتری
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Drawer: Customer Detail ── */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={selectedCustomer?.full_name ?? "جزئیات مشتری"}
        size="lg"
        footer={
          <Link href={`/admin/users/${selectedCustomer?.id}`}>
            <Button variant="outline" fullWidth>
              مدیریت کامل کاربر
            </Button>
          </Link>
        }
      >
        {loadingDetail ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 rounded-full border-4 border-slate-200
                             border-t-primary-600 animate-spin" />
          </div>
        ) : selectedCustomer ? (
          <div className="space-y-5">
            {/* Avatar */}
            <div className="text-center pb-5 border-b border-slate-100">
              <Avatar
                name={selectedCustomer.full_name}
                src={selectedCustomer.avatar}
                size="xl"
                status={selectedCustomer.is_phone_verified ? "online" : "offline"}
                className="mx-auto mb-4"
              />
              <h3 className="text-lg font-bold text-slate-800">
                {selectedCustomer.full_name || "بدون نام"}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {selectedCustomer.phone_number}
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                {selectedCustomer.is_active ? (
                  <Badge variant="success" size="sm" dot>
                    فعال
                  </Badge>
                ) : (
                  <Badge variant="default" size="sm" dot>
                    غیرفعال
                  </Badge>
                )}
                {selectedCustomer.is_phone_verified ? (
                  <Badge variant="info" size="sm" icon={<CheckCircleIcon className="h-3 w-3" />}>
                    موبایل تایید شده
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm" icon={<XCircleIcon className="h-3 w-3" />}>
                    موبایل تایید نشده
                  </Badge>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                اطلاعات تماس
              </p>
              {[
                { label: "موبایل", value: selectedCustomer.phone_number },
                { label: "ایمیل", value: selectedCustomer.email || "—" },
                { label: "کد ملی", value: selectedCustomer.national_code || "—" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-3 py-2
                             border-b border-slate-50 last:border-0"
                >
                  <span className="text-xs text-slate-400 flex-shrink-0 w-20">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-slate-700 text-left flex-1">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Activity */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                فعالیت
              </p>
              {[
                { label: "تاریخ عضویت", value: toJalaliWithTime(selectedCustomer.date_joined) },
                {
                  label: "آخرین ورود",
                  value: selectedCustomer.last_login_at
                    ? toJalaliWithTime(selectedCustomer.last_login_at)
                    : "—",
                },
                { label: "تعداد شکایات", value: selectedCustomer.complaints_count ?? 0 },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-3 py-2
                             border-b border-slate-50 last:border-0"
                >
                  <span className="text-xs text-slate-400 flex-shrink-0 w-28">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-slate-700 text-left flex-1">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}