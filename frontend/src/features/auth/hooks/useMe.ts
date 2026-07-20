"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store";
import { authService } from "../services/auth.service";

import { useQuery }  from "@tanstack/react-query";
import apiClient     from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { QUERY_KEYS } from "@/hooks";
import { UserProfile } from "@/features/users/types/users.types";

import Cookies from "js-cookie";
import { CONFIG } from "@/constants/config";

export const useMe = () => {
  const {
    setUser,
    setLoading,
    setInitialized,
    logout,
    isInitialized,
    isAuthenticated,
  } = useAuthStore();

  const hasToken = !!Cookies.get(CONFIG.ACCESS_TOKEN_KEY);
  const fetchedRef = useRef(false);

    const query = useQuery<UserProfile>({
    queryKey: QUERY_KEYS.ME,
    queryFn:  async () => {
      const r = await apiClient.get(ENDPOINTS.AUTH.ME);
      return r.data?.data ?? r.data;
    },
    enabled:     hasToken,
    staleTime:   10 * 60 * 1000,  // 10 دقیقه
    retry:       1,
  });
  
  useEffect(() => {
    if (isInitialized || fetchedRef.current) return;
    fetchedRef.current = true;

    const token = Cookies.get(CONFIG.ACCESS_TOKEN_KEY);

    if (!token) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    setLoading(true);

    authService
      .me()
      .then(({ data }) => {
        // ✅ Backend: { success, message, data: { ...user } }
        const userData = data.data;
        setUser(userData);
        useAuthStore.setState({ isAuthenticated: true });
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setLoading(false);
        setInitialized(true);
      });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};