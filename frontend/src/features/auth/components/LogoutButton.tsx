"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { CONFIG } from "@/constants/config";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

export const LogoutButton = ({ children }: { children?: React.ReactNode }) => {
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    const refreshToken = Cookies.get(CONFIG.REFRESH_TOKEN_KEY);
    try {
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT, {
        refresh: refreshToken ?? "",
      });
    } catch {
      // حتی اگر سرور خطا داد، logout محلی انجام شود
    }
    logout();
    router.push("/login");
  };

  return (
    <button onClick={handleLogout}>
      {children ?? "خروج"}
    </button>
  );
};