import { useAuthStore } from "@/store";
import type { Role } from "@/types/common.types";
import {
  canManageUsers,
  canManageGeography,
  canManageOrganizations,
  canSetOfficialPrice,
  canSetStorePrice,
  canViewReports,
  canManageComplaints,
} from "@/utils/permission.utils";

export const usePermission = () => {
  const user = useAuthStore((state) => state.user);
  const role = user?.role as Role | undefined;

  return {
    role,
    canManageUsers: canManageUsers(role),
    canManageGeography: canManageGeography(role),
    canManageOrganizations: canManageOrganizations(role),
    canSetOfficialPrice: canSetOfficialPrice(role),
    canSetStorePrice: canSetStorePrice(role),
    canViewReports: canViewReports(role),
    canManageComplaints: canManageComplaints(role),
    isAdmin: role === "admin",
    isProvinceManager: role === "province_manager",
    isChamberManager: role === "chamber_manager",
    isUnionManager: role === "union_manager",
    isStoreOwner: role === "store_owner",
    isInspector: role === "inspector",
    isCustomer: role === "customer",
  };
};
