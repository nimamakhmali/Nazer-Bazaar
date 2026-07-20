import type { Role } from "@/types/common.types";

// ─── Request Types ────────────────────────────────────────
export interface LoginRequest {
  phone_number: string;
  password: string;
}

export interface OTPRequestPayload {
  phone_number: string;
}

export interface OTPVerifyPayload {
  phone_number: string;
  code: string;
}

export interface RefreshTokenRequest {
  refresh: string;
}

// ─── Response Types ───────────────────────────────────────
export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface UserBasicInfo {
  id: number;
  full_name: string;
  phone_number: string;
  masked_phone: string;
  role: Role;
  role_display: string;
  is_phone_verified: boolean;
  avatar: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  national_code: string | null;
  date_joined: string;
  last_login_at: string | null;
}

export interface LoginResponse {
  user: UserBasicInfo;
  access: string;
  refresh: string;
}

export interface OTPRequestResponse {
  detail: string;
  expires_in?: number;
}

export interface OTPVerifyResponse {
  user: UserBasicInfo;
  access: string;
  refresh: string;
  is_new_user?: boolean;
}

export interface MeResponse extends UserBasicInfo {}

// ─── Store Types ──────────────────────────────────────────
export type AuthStep = "phone" | "code";