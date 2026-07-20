import type { StoreStatus, ComplaintStatus } from "@/types/common.types";

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  pending: "در انتظار تایید",
  active: "فعال",
  suspended: "تعلیق شده",
  rejected: "رد شده",
  closed: "تعطیل",
};

export const STORE_STATUS_COLORS: Record<StoreStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  active: "bg-green-100 text-green-800 border-green-200",
  suspended: "bg-orange-100 text-orange-800 border-orange-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  submitted: "ثبت شده",
  reviewing: "در حال بررسی",
  referred: "ارجاع داده شده",
  inspecting: "در حال بازرسی",
  confirmed: "تایید شده",
  rejected: "رد شده",
  closed: "مختومه",
};

export const COMPLAINT_STATUS_COLORS: Record<ComplaintStatus, string> = {
  submitted: "bg-blue-100 text-blue-800",
  reviewing: "bg-yellow-100 text-yellow-800",
  referred: "bg-purple-100 text-purple-800",
  inspecting: "bg-orange-100 text-orange-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  closed: "bg-gray-100 text-gray-800",
};
