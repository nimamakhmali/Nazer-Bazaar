"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useAuthStore, useUIStore } from "@/store";
import { Avatar } from "@/components/ui/Avatar";
import { authService } from "@/features/auth/services/auth.service";
import type { Role } from "@/types/common.types";
import { ROLE_LABELS } from "@/constants/roles";
import {
  HomeIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  ShieldCheckIcon,
  UserIcon,
  BuildingOffice2Icon,
  BuildingOfficeIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  TagIcon,
  NewspaperIcon,
  PhotoIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  MapPinIcon,
  ChartBarIcon,
  MegaphoneIcon,
  CurrencyDollarIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────
interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavItem[];
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

// ─── Menu Configuration ───────────────────────────────────
const adminMenu: NavGroup[] = [
  {
    items: [
      { label: "داشبورد",       href: "/dashboard",    icon: HomeIcon },
    ],
  },
  {
    title: "مدیریت کاربران",
    items: [
      { label: "مدیران سامانه", href: "/admin/users",     icon: UserGroupIcon },
      { label: "مشتریان",       href: "/admin/customers", icon: UserIcon },
      { label: "نقش‌ها",        href: "/admin/roles",     icon: ShieldCheckIcon },
    ],
  },
  {
    title: "سازمان‌ها",
    items: [
      { label: "استانداری‌ها",   href: "/admin/province-offices", icon: BuildingOffice2Icon },
      { label: "اتاق‌های اصناف", href: "/admin/chambers",         icon: BuildingOfficeIcon },
      { label: "اتحادیه‌ها",     href: "/admin/unions",           icon: ShieldCheckIcon },
    ],
  },
  {
    title: "فروشگاه و محصول",
    items: [
      { label: "فروشگاه‌ها",  href: "/admin/stores",             icon: BuildingStorefrontIcon },
      { label: "محصولات",     href: "/admin/products",           icon: CubeIcon },
      { label: "دسته‌بندی‌ها", href: "/admin/products/categories", icon: TagIcon },
    ],
  },
  {
    title: "نظارت و گزارش",
    items: [
      { label: "شکایت‌ها",   href: "/admin/complaints", icon: ClipboardDocumentListIcon },
      { label: "قیمت‌گذاری", href: "/admin/pricing",    icon: CurrencyDollarIcon },
    ],
  },
  {
    title: "جغرافیا",
    items: [
      { label: "استان‌ها", href: "/admin/provinces", icon: MapPinIcon },
      { label: "شهرها",    href: "/admin/cities",     icon: MapPinIcon },
    ],
  },
  {
    title: "محتوا",
    items: [
      { label: "مقالات",           href: "/admin/cms/blogs",      icon: NewspaperIcon },
      { label: "دسته‌بندی مقالات", href: "/admin/cms/categories", icon: TagIcon },
      { label: "گالری تصاویر",     href: "/admin/cms/gallery",    icon: PhotoIcon },
      { label: "صفحات ثابت",       href: "/admin/cms/pages",      icon: NewspaperIcon },
    ],
  },
  {
    items: [
      { label: "تنظیمات", href: "/admin/settings", icon: Cog6ToothIcon },
    ],
  },
];

const provinceMenu: NavGroup[] = [
  {
    items: [
      { label: "داشبورد",   href: "/dashboard",         icon: HomeIcon },
      { label: "نمای کلی", href: "/province/overview",  icon: ChartBarIcon },
    ],
  },
  {
    title: "مدیریت",
    items: [
      { label: "اتاق‌های اصناف", href: "/province/chambers",   icon: BuildingOfficeIcon },
      { label: "شکایات",         href: "/province/complaints",  icon: MegaphoneIcon },
      { label: "گزارشات",        href: "/province/reports",     icon: ChartBarIcon },
    ],
  },
];

const chamberMenu: NavGroup[] = [
  {
    items: [
      { label: "داشبورد",   href: "/dashboard",        icon: HomeIcon },
      { label: "نمای کلی", href: "/chamber/overview",  icon: ChartBarIcon },
    ],
  },
  {
    title: "مدیریت",
    items: [
      { label: "اتحادیه‌ها",      href: "/chamber/unions",          icon: ShieldCheckIcon },
      { label: "فروشگاه‌ها",      href: "/chamber/stores",          icon: BuildingStorefrontIcon },
      { label: "در انتظار تایید", href: "/chamber/stores/pending",  icon: ClipboardDocumentListIcon },
      { label: "شکایات",          href: "/chamber/complaints",      icon: MegaphoneIcon },
    ],
  },
];

const unionMenu: NavGroup[] = [
  {
    items: [
      { label: "داشبورد",   href: "/dashboard",      icon: HomeIcon },
      { label: "نمای کلی", href: "/union/overview",  icon: ChartBarIcon },
    ],
  },
  {
    title: "مدیریت",
    items: [
      { label: "فروشگاه‌ها",    href: "/union/stores",           icon: BuildingStorefrontIcon },
      { label: "ثبت قیمت",      href: "/union/pricing/official", icon: CurrencyDollarIcon },
      { label: "قیمت‌های مصوب", href: "/union/pricing",          icon: CurrencyDollarIcon },
      { label: "تاریخچه",       href: "/union/pricing/history",  icon: ChartBarIcon },
      { label: "شکایات",        href: "/union/complaints",       icon: MegaphoneIcon },
    ],
  },
];

const storeMenu: NavGroup[] = [
  {
    items: [
      { label: "داشبورد",   href: "/dashboard",     icon: HomeIcon },
      { label: "نمای کلی", href: "/store/overview", icon: ChartBarIcon },
    ],
  },
  {
    title: "فروشگاه",
    items: [
      { label: "فروشگاه‌های من", href: "/store/my-stores",     icon: BuildingStorefrontIcon },
      { label: "ثبت فروشگاه",   href: "/store/register-store", icon: BuildingStorefrontIcon },
      { label: "قیمت‌گذاری",    href: "/store/pricing",        icon: CurrencyDollarIcon },
    ],
  },
];

const inspectorMenu: NavGroup[] = [
  {
    items: [
      { label: "داشبورد",   href: "/dashboard",         icon: HomeIcon },
      { label: "نمای کلی", href: "/inspector/overview", icon: ChartBarIcon },
    ],
  },
  {
    title: "بازرسی",
    items: [
      { label: "فروشگاه‌ها",  href: "/inspector/stores",     icon: BuildingStorefrontIcon },
      { label: "گران‌فروشان", href: "/inspector/overpriced",  icon: MegaphoneIcon },
      { label: "شکایات",      href: "/inspector/complaints",  icon: ClipboardDocumentListIcon },
    ],
  },
];

const customerMenu: NavGroup[] = [
  {
    items: [
      { label: "داشبورد",   href: "/dashboard",        icon: HomeIcon },
      { label: "نمای کلی", href: "/customer/overview", icon: ChartBarIcon },
    ],
  },
  {
    title: "شکایات من",
    items: [
      { label: "شکایات من",  href: "/customer/complaints", icon: ClipboardDocumentListIcon },
      { label: "ثبت شکایت", href: "/complaints/new",       icon: MegaphoneIcon },
    ],
  },
];

const menuByRole: Record<Role, NavGroup[]> = {
  admin:           adminMenu,
  province_manager: provinceMenu,
  chamber_manager:  chamberMenu,
  union_manager:    unionMenu,
  store_owner:      storeMenu,
  inspector:        inspectorMenu,
  customer:         customerMenu,
};

// ─── Nav Item Component ───────────────────────────────────
const SidebarNavItem = ({
  item,
  isCollapsed,
}: {
  item: NavItem;
  isCollapsed: boolean;
}) => {
  const pathname = usePathname();
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
        "transition-all duration-150 relative",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
        isActive
          ? "bg-gradient-to-l from-amber-500/20 to-amber-400/10 text-amber-300 shadow-sm"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
        isCollapsed && "justify-center px-2"
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-400 rounded-l-full" />
      )}

      <item.icon
        className={cn(
          "flex-shrink-0 h-5 w-5 transition-colors",
          isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"
        )}
      />

      {!isCollapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && item.badge > 0 && (
            <span className="flex-shrink-0 h-5 min-w-[20px] px-1 bg-amber-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
};

// ─── Main Sidebar Component ───────────────────────────────
export const Sidebar = () => {
  const router   = useRouter();
  const { user, logout } = useAuthStore();
  const { isSidebarOpen, toggleSidebar } = useUIStore();

  const role     = user?.role as Role;
  const groups   = menuByRole[role] ?? [];
  const isCollapsed = !isSidebarOpen;

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    logout();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full relative",
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[68px]" : "w-64"
      )}
      style={{
        background: "linear-gradient(180deg, #0a1628 0%, #0f2347 40%, #1a1a2e 100%)",
        borderRight: "1px solid rgba(196,154,46,0.12)",
      }}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 flex-shrink-0",
          "border-b",
          isCollapsed && "justify-center px-0"
        )}
        style={{ borderColor: "rgba(196,154,46,0.15)" }}
      >
        <div
          className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center shadow-lg"
          style={{
            background: "linear-gradient(135deg, #c49a2e, #deb94a)",
          }}
        >
          <ShieldCheckIcon className="h-5 w-5 text-white" />
        </div>

        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white leading-tight truncate">
              پایش قیمت کالا
            </p>
            <p className="text-[10px] leading-tight truncate" style={{ color: "#c49a2e" }}>
              سامانه نظارت اصناف
            </p>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex-shrink-0 p-1.5 rounded-lg transition-colors",
            "text-slate-500 hover:text-slate-300 hover:bg-white/5",
            isCollapsed && "hidden"
          )}
          aria-label="بستن منو"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-thin">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-3" : ""}>
            {/* Group title */}
            {group.title && !isCollapsed && (
              <p
                className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "rgba(196,154,46,0.5)" }}
              >
                {group.title}
              </p>
            )}

            {/* Divider in collapsed mode */}
            {group.title && isCollapsed && gi > 0 && (
              <div
                className="mx-3 my-2 h-px"
                style={{ backgroundColor: "rgba(196,154,46,0.15)" }}
              />
            )}

            {group.items.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* ── User footer ──────────────────────────────────── */}
      <div
        className={cn(
          "flex-shrink-0 border-t",
          isCollapsed ? "p-2" : "p-3"
        )}
        style={{ borderColor: "rgba(196,154,46,0.15)" }}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar name={user?.full_name} src={user?.avatar} size="sm" />
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              aria-label="خروج"
              title="خروج از سیستم"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            className="flex items-center gap-3 p-2.5 rounded-xl"
            style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            <Avatar name={user?.full_name} src={user?.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name || "کاربر"}
              </p>
              <p className="text-[10px] truncate" style={{ color: "rgba(196,154,46,0.7)" }}>
                {role ? ROLE_LABELS[role] : ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              aria-label="خروج"
              title="خروج از سیستم"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};