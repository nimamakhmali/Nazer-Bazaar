import type { Role } from "@/types/common.types";

export const ROLES = {
  ADMIN: "admin" as Role,
  PROVINCE_MANAGER: "province_manager" as Role,
  CHAMBER_MANAGER: "chamber_manager" as Role,
  UNION_MANAGER: "union_manager" as Role,
  STORE_OWNER: "store_owner" as Role,
  INSPECTOR: "inspector" as Role,
  CUSTOMER: "customer" as Role,
} as const;

export const ROLE_LABELS: Record<Role, string> = {
  admin: "ادمین کل",
  province_manager: "ناظر استانداری",
  chamber_manager: "مدیر اتاق اصناف",
  union_manager: "رئیس اتحادیه",
  store_owner: "صاحب فروشگاه",
  inspector: "بازرس",
  customer: "شهروند",
};

export const ROLE_DASHBOARD_MAP: Record<Role, string> = {
  admin: "/admin/users",
  province_manager: "/province/overview",
  chamber_manager: "/chamber/overview",
  union_manager: "/union/overview",
  store_owner: "/store/overview",
  inspector: "/inspector/overview",
  customer: "/customer/overview",
};

export const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-red-100 text-red-800",
  province_manager: "bg-purple-100 text-purple-800",
  chamber_manager: "bg-blue-100 text-blue-800",
  union_manager: "bg-indigo-100 text-indigo-800",
  store_owner: "bg-green-100 text-green-800",
  inspector: "bg-orange-100 text-orange-800",
  customer: "bg-gray-100 text-gray-800",
};
