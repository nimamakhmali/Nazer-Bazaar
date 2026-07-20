import type { Role } from "@/types/common.types";

export const hasRole = (userRole: Role | undefined, allowedRoles: Role[]): boolean => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

export const isAdmin = (role?: Role) => role === "admin";
export const isProvinceManager = (role?: Role) => role === "province_manager";
export const isChamberManager = (role?: Role) => role === "chamber_manager";
export const isUnionManager = (role?: Role) => role === "union_manager";
export const isStoreOwner = (role?: Role) => role === "store_owner";
export const isInspector = (role?: Role) => role === "inspector";
export const isCustomer = (role?: Role) => role === "customer";

export const canManageUsers = (role?: Role) => hasRole(role, ["admin"]);
export const canManageGeography = (role?: Role) => hasRole(role, ["admin"]);
export const canManageOrganizations = (role?: Role) => hasRole(role, ["admin", "province_manager"]);
export const canSetOfficialPrice = (role?: Role) => hasRole(role, ["union_manager"]);
export const canSetStorePrice = (role?: Role) => hasRole(role, ["store_owner"]);
export const canViewReports = (role?: Role) => hasRole(role, ["admin", "province_manager", "chamber_manager", "union_manager", "inspector"]);
export const canManageComplaints = (role?: Role) => hasRole(role, ["admin", "province_manager", "chamber_manager", "union_manager", "inspector"]);
