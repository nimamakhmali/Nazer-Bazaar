import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import Cookies from "js-cookie";
import type { UserBasicInfo } from "@/features/auth/types/auth.types";
import { CONFIG } from "@/constants/config";
import { ROLE_DASHBOARD_MAP } from "@/constants/roles";
import type { Role } from "@/types/common.types";

interface AuthState {
  user: UserBasicInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setAuth: (
    user: UserBasicInfo,
    access: string,
    refresh: string,
    rememberMe?: boolean
  ) => void;
  setUser: (user: UserBasicInfo) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => void;

  // Computed
  getDashboardPath: () => string;
  hasRole: (roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,

      setAuth: (user, access, refresh, rememberMe = false) => {
        // مدت اعتبار token بر اساس remember me
        const accessExpire  = rememberMe ? 7 : 1;
        const refreshExpire = rememberMe ? 30 : 7;

        Cookies.set(CONFIG.ACCESS_TOKEN_KEY, access, {
          expires:  accessExpire,
          sameSite: "strict",
          secure:   process.env.NODE_ENV === "production",
        });

        Cookies.set(CONFIG.REFRESH_TOKEN_KEY, refresh, {
          expires:  refreshExpire,
          sameSite: "strict",
          secure:   process.env.NODE_ENV === "production",
        });

        set({ user, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      setLoading: (isLoading) => set({ isLoading }),

      setInitialized: (isInitialized) => set({ isInitialized }),

      logout: () => {
        Cookies.remove(CONFIG.ACCESS_TOKEN_KEY);
        Cookies.remove(CONFIG.REFRESH_TOKEN_KEY);
        set({
          user:            null,
          isAuthenticated: false,
          isInitialized:   true,
        });
      },

      getDashboardPath: () => {
        const { user } = get();
        if (!user) return "/login";
        return ROLE_DASHBOARD_MAP[user.role as Role] ?? "/dashboard";
      },

      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role as Role);
      },
    }),
    {
      name:    "auth-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);