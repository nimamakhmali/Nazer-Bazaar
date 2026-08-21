import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import type {
  LoginRequest,
  OTPRequestPayload,
  OTPVerifyPayload,
} from "../types/auth.types";
import type { Role } from "@/types/common.types";

// ─── ساختار واقعی پاسخ Backend ────────────────────────────
interface BackendUser {
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
  union_id: number | null;
  chamber_id: number | null;
  province_office_id: number | null;
}

interface BackendLoginData {
  refresh: string;
  access: string;
  user: BackendUser;
}

export interface BackendResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const authService = {
  login: (data: LoginRequest) =>
    apiClient.post<BackendResponse<BackendLoginData>>(
      ENDPOINTS.AUTH.LOGIN,
      data
    ),

  logout: () =>
    apiClient.post(ENDPOINTS.AUTH.LOGOUT),

  me: () =>
    apiClient.get<BackendResponse<BackendUser>>(ENDPOINTS.AUTH.ME),

  requestOTP: (data: OTPRequestPayload) =>
    apiClient.post<BackendResponse<{ detail: string; expires_in?: number }>>(
      ENDPOINTS.AUTH.OTP_REQUEST,
      data
    ),

  verifyOTP: (data: OTPVerifyPayload) =>
    apiClient.post<BackendResponse<BackendLoginData & { is_new_user?: boolean }>>(
      ENDPOINTS.AUTH.OTP_VERIFY,
      data
    ),

  refreshToken: (refresh: string) =>
    apiClient.post<{ access: string }>(ENDPOINTS.AUTH.REFRESH, { refresh }),
};