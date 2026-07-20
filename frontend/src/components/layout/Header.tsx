"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import { useUIStore, useAuthStore } from "@/store";
import { Avatar } from "@/components/ui/Avatar";
import { ROLE_LABELS } from "@/constants/roles";
import type { Role } from "@/types/common.types";
import { cn } from "@/lib/cn";

// ─── Breadcrumb map ───────────────────────────────────────
const ROUTE_LABELS: Record<string, string> = {
  admin:             "ادمین",
  users:             "کاربران",
  customers:         "مشتریان",
  roles:             "نقش‌ها",
  provinces:         "استان‌ها",
  cities:            "شهرها",
  "province-offices": "استانداری‌ها",
  chambers:          "اتاق‌های اصناف",
  unions:            "اتحادیه‌ها",
  stores:            "فروشگاه‌ها",
  products:          "محصولات",
  categories:        "دسته‌بندی‌ها",
  complaints:        "شکایت‌ها",
  pricing:           "قیمت‌گذاری",
  cms:               "مدیریت محتوا",
  blogs:             "مقالات",
  gallery:           "گالری",
  pages:             "صفحات",
  settings:          "تنظیمات",
  dashboard:         "داشبورد",
  overview:          "نمای کلی",
  pending:           "در انتظار",
  official:          "قیمت مصوب",
  history:           "تاریخچه",
};

const buildBreadcrumbs = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let path = "";

  for (const seg of segments) {
    path += `/${seg}`;
    const isId = /^\d+$/.test(seg) || seg.includes("-") && seg.length > 20;
    crumbs.push({
      label: isId ? "جزئیات" : (ROUTE_LABELS[seg] ?? seg),
      href:  path,
    });
  }
  return crumbs;
};

export const Header = () => {
  const pathname = usePathname();
  const { toggleSidebar, toggleMobileSidebar } = useUIStore();
  const { user } = useAuthStore();
  const role = user?.role as Role;

  const breadcrumbs = buildBreadcrumbs(pathname);
  const pageTitle   = breadcrumbs[breadcrumbs.length - 1]?.label ?? "داشبورد";

  return (
    <header
      className="h-16 flex items-center gap-4 px-4 md:px-6 flex-shrink-0 sticky top-0 z-30"
      style={{
        backgroundColor: "#ffffff",
        borderBottom:     "1px solid #e2e8f0",
        boxShadow:        "0 1px 3px rgba(27,58,107,0.06)",
      }}
    >
      {/* Desktop sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="hidden md:flex p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
        aria-label="toggle sidebar"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      {/* Mobile sidebar toggle */}
      <button
        onClick={toggleMobileSidebar}
        className="md:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
        aria-label="mobile menu"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      {/* Breadcrumb — desktop */}
      <div className="hidden md:flex items-center gap-1.5 text-sm flex-1 min-w-0">
        <Link
          href="/dashboard"
          className="text-slate-400 hover:text-primary-600 transition-colors flex-shrink-0"
        >
          <HomeIcon className="h-4 w-4" />
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            <ChevronLeftIcon className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
            {i === breadcrumbs.length - 1 ? (
              <span className="font-semibold text-primary-700 truncate">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-slate-400 hover:text-primary-600 transition-colors truncate"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>

      {/* Page title — mobile */}
      <div className="md:hidden flex-1">
        <p className="text-sm font-bold text-primary-700 truncate">{pageTitle}</p>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search (placeholder) */}
        <button
          className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
          aria-label="جستجو"
          title="جستجو"
        >
          <MagnifyingGlassIcon className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
          aria-label="اعلان‌ها"
        >
          <BellIcon className="h-5 w-5" />
          <span
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2 border-white"
            style={{ backgroundColor: "#c0392b" }}
          />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* User */}
        <Link href="/profile" className="flex items-center gap-2.5 group">
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-700 group-hover:text-primary-700 transition-colors leading-tight">
              {user?.full_name || "کاربر"}
            </p>
            <p className="text-[10px] leading-tight" style={{ color: "#c49a2e" }}>
              {role ? ROLE_LABELS[role] : ""}
            </p>
          </div>
          <Avatar name={user?.full_name} src={user?.avatar} size="sm" />
        </Link>
      </div>
    </header>
  );
};