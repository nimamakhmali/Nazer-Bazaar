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
}

export interface UserAdmin extends UserProfile {
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
