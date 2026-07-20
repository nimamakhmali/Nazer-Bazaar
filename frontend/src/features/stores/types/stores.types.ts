import type { StoreStatus } from "@/types/common.types";

export interface Store {
  id: number;
  name: string;
  union: number;
  union_name: string;
  city_name: string;
  province_name: string;
  owner: number;
  owner_name: string;
  owner_phone: string;
  license_number: string;
  phone: string;
  mobile: string;
  address: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  image: string | null;
  status: StoreStatus;
  status_display: string;
  can_set_price: boolean;
  is_active: boolean;
  has_location: boolean;
  complaints_count: number;
  pending_complaints_count: number;
  rejection_reason: string | null;
  status_changed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreDocument {
  id: number;
  store: number;
  document_type: string;
  document_type_display: string;
  title: string;
  file: string;
  description: string;
  expire_date: string | null;
  is_verified: boolean;
  verified_by_name: string;
  verified_at: string | null;
  is_expired: boolean;
  created_at: string;
}

export interface StoreLicense {
  id: number;
  store: number;
  license_number: string;
  issue_date: string;
  expire_date: string;
  issuing_authority: string;
  business_type: string;
  is_valid: boolean;
  is_expired: boolean;
  days_until_expiry: number;
  needs_renewal: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreRegisterRequest {
  union_id: number;
  owner_id: number;
  name: string;
  license_number: string;
  address: string;
  phone?: string;
  mobile?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
}
