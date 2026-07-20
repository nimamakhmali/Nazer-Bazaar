import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";
import { CONFIG } from "@/constants/config";

const apiClient = axios.create({
  baseURL: CONFIG.API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept:         "application/json",
  },
  timeout: 30_000,
});

// ─── Request interceptor ──────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get(CONFIG.ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Token refresh queue ──────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject:  (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

// ─── Response interceptor ─────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = Cookies.get(CONFIG.REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      processQueue(new Error("No refresh token"), null);
      isRefreshing = false;
      redirectToLogin();
      return Promise.reject(error);
    }

    try {
      // ✅ refresh endpoint مستقیم با axios (بدون interceptor)
      const { data } = await axios.post(
        `${CONFIG.API_URL}/auth/token/refresh/`,
        { refresh: refreshToken },
        { headers: { "Content-Type": "application/json" } }
      );

      const newToken = data.access;

      Cookies.set(CONFIG.ACCESS_TOKEN_KEY, newToken, {
        expires:  1,
        sameSite: "strict",
        secure:   process.env.NODE_ENV === "production",
      });

      apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      processQueue(null, newToken);
      return apiClient(originalRequest);

    } catch (refreshError) {
      processQueue(refreshError, null);
      Cookies.remove(CONFIG.ACCESS_TOKEN_KEY);
      Cookies.remove(CONFIG.REFRESH_TOKEN_KEY);
      redirectToLogin();
      return Promise.reject(refreshError);

    } finally {
      isRefreshing = false;
    }
  }
);

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  const isAuthPage = ["/login", "/otp"].some((p) => path.startsWith(p));
  if (!isAuthPage) {
    window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
  }
}

export default apiClient;
