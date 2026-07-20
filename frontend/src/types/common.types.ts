export type Role =
  | "admin"
  | "province_manager"
  | "chamber_manager"
  | "union_manager"
  | "store_owner"
  | "inspector"
  | "customer";

export type StoreStatus =
  | "pending"
  | "active"
  | "suspended"
  | "rejected"
  | "closed";

export type ComplaintStatus =
  | "submitted"
  | "reviewing"
  | "referred"
  | "inspecting"
  | "confirmed"
  | "rejected"
  | "closed";

export type DocumentType =
  | "business_license"
  | "national_id"
  | "store_image"
  | "health_certificate"
  | "other";

export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}
