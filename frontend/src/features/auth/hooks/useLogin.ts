"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store";
import { authService } from "../services/auth.service";
import { parseApiError } from "@/utils/error.utils";
import type { LoginFormData } from "../validations/auth.schema";

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, getDashboardPath } = useAuthStore();

  const login = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const response = await authService.login({
        phone_number: data.phone_number,
        password:     data.password,
      });

      // ✅ Backend: { success, message, data: { access, refresh, user } }
      const { user, access, refresh } = response.data.data;

      setAuth(user, access, refresh, data.remember_me ?? false);

      toast.success(`خوش آمدید، ${user.full_name || "کاربر"}!`);

      const redirectTo    = searchParams.get("redirect");
      const dashboardPath = getDashboardPath();

      router.replace(redirectTo || dashboardPath);

    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading };
};