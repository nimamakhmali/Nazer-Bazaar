import type { Role } from "@/types/common.types";

export interface UserProfile {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  masked_phone: string;
  email: string | null;
  national_code: string | null;
  role: Role;
  role_display: string;
  is_phone_verified: boolean;
  avatar: string | null;
  date_joined: string;
  last_login_at: string | null;
  // ── فیلدهای سازمانی (از API /auth/me/ برمی‌گردند) ──
  union_id: number | null;
  union_name: string | null;
  chamber_id: number | null;
  chamber_name: string | null;
  province_office_id: number | null;
  province_id: number | null;
}

export interface UserAdmin extends UserProfile {
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBasicInfo {
  id: number;
  full_name: string;
  phone_number: string;
  role: Role;
  union_id?: number | null;
  union_name?: string | null;
}

export interface CreateUserRequest {
  phone_number: string;
  role: string;
  first_name?: string;
  last_name?: string;
  national_code?: string;
  password?: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  national_code?: string;
}