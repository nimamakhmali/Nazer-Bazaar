import type { ComplaintStatus } from "@/types/common.types";

export interface ComplaintCustomer {
  id: number;
  full_name: string;
  phone_number: string;
  role: string;
}

export interface Complaint {
  uuid: string;
  tracking_code: string;
  customer: ComplaintCustomer;
  store: number;
  store_name: string;
  product: number;
  product_name: string;
  title: string;
  description: string;
  price_reported: number;
  price_reported_formatted?: string;
  price_proof: string | null;
  status: ComplaintStatus;
  status_display: string;
  assigned_to: number | null;
  assigned_union_manager_name: string | null;
  assigned_chamber_manager_name: string | null;
  assigned_province_manager_name: string | null;
  escalation_level: number;
  hours_since_created: number;
  is_overdue_48h: boolean;
  is_overdue_96h: boolean;
  escalated_at_48h: string | null;
  escalated_at_96h: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  attachments: ComplaintAttachment[];
  responses: ComplaintResponse[];
}

export interface ComplaintAttachment {
  id: number;
  file: string;
  description: string;
  uploaded_by: number;
  created_at: string;
}

export interface ComplaintResponse {
  id: number;
  user: ComplaintCustomer;
  response_text: string;
  is_internal_note: boolean;
  created_at: string;
}

export interface ComplaintCreateRequest {
  store: number;
  product: number;
  title: string;
  description: string;
  price_reported: number;
  price_proof?: File;
}

export interface ComplaintListItem {
  uuid: string;
  tracking_code: string;
  title: string;
  store_name: string;
  product_name: string;
  status: ComplaintStatus;
  status_display: string;
  escalation_level: number;
  is_overdue: boolean;
  hours_since_created: number;
  created_at: string;
  updated_at: string;
}

// ✅ NEW
export interface ComplaintStatusChangeRequest {
  status:
    | "reviewing"
    | "referred"
    | "inspecting"
    | "confirmed"
    | "rejected"
    | "closed";
  note?: string;
}