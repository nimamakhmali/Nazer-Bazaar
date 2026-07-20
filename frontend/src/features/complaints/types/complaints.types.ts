import type { ComplaintStatus } from "@/types/common.types";

export interface Complaint {
  uuid: string;
  customer: {
    id: number;
    full_name: string;
    phone_number: string;
    role: string;
  };
  store: number;
  store_name: string;
  product: number;
  product_name: string;
  title: string;
  description: string;
  price_reported: number;
  price_proof: string | null;
  status: ComplaintStatus;
  status_display: string;
  assigned_to: number | null;
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
  user: {
    id: number;
    full_name: string;
    phone_number: string;
    role: string;
  };
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
  title: string;
  store_name: string;
  status: ComplaintStatus;
  status_display: string;
  created_at: string;
}
