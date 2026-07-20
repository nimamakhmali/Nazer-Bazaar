import type { AxiosError } from "axios";

// ─── ساختار خطاهای احتمالی از Backend ────────────────────
interface ApiErrorData {
  success?:          boolean;
  message?:          string;
  detail?:           string;
  non_field_errors?: string[];
  phone_number?:     string[];
  password?:         string[];
  code?:             string[];
  data?: {
    detail?:  string;
    message?: string;
  };
  [key: string]: unknown;
}

const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: "اطلاعات ارسال شده نادرست است",
  401: "نام کاربری یا رمز عبور اشتباه است",
  403: "دسترسی به این بخش ندارید",
  404: "مورد مورد نظر یافت نشد",
  408: "زمان درخواست به پایان رسید",
  409: "این اطلاعات قبلاً ثبت شده است",
  422: "اطلاعات ارسال شده معتبر نیست",
  429: "تعداد درخواست‌ها بیش از حد مجاز است",
  500: "خطای سرور - لطفاً دوباره تلاش کنید",
  502: "سرور در دسترس نیست",
  503: "سرویس موقتاً در دسترس نیست",
};

export const parseApiError = (error: unknown): string => {
  const axiosError = error as AxiosError<ApiErrorData>;

  // بدون پاسخ از سرور (network error)
  if (!axiosError.response) {
    if (axiosError.code === "ECONNABORTED") {
      return "اتصال به سرور قطع شد";
    }
    // ✅ navigator.onLine فقط در client بررسی می‌شود
    if (typeof window !== "undefined" && !navigator.onLine) {
      return "اتصال اینترنت برقرار نیست";
    }
    return "خطا در ارتباط با سرور";
  }

  const { status, data } = axiosError.response;

  // ✅ اولویت‌بندی: message از بک‌اند این پروژه
  if (data?.message)               return data.message;
  if (data?.detail)                return data.detail;
  if (data?.data?.message)         return data.data.message;
  if (data?.data?.detail)          return data.data.detail;
  if (data?.non_field_errors?.[0]) return data.non_field_errors[0];

  // خطاهای فیلد خاص
  const fieldErrors = Object.entries(data || {})
    .filter(([key]) => !["success", "message", "detail", "data"].includes(key))
    .flatMap(([, value]) => (Array.isArray(value) ? value : []))
    .filter((v): v is string => typeof v === "string");

  if (fieldErrors.length > 0) return fieldErrors[0];

  return HTTP_ERROR_MESSAGES[status] || "خطای ناشناخته رخ داد";
};

// ─── Helper: استخراج آرایه از پاسخ‌های مختلف ─────────────
export const extractArray = <T = unknown>(data: unknown): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];

  const d = data as Record<string, unknown>;

  if (d.results && Array.isArray(d.results)) return d.results as T[];

  if (d.data) {
    if (Array.isArray(d.data)) return d.data as T[];
    const nested = d.data as Record<string, unknown>;
    if (nested.results && Array.isArray(nested.results))
      return nested.results as T[];
  }

  return [];
};

// ─── Helper: استخراج تعداد برای pagination ────────────────
export const extractCount = (
  data: unknown,
  fallbackLength = 0
): number => {
  if (!data) return fallbackLength;

  const d = data as Record<string, unknown>;

  if (typeof d.count === "number") return d.count;
  if (d.data) {
    const nested = d.data as Record<string, unknown>;
    if (typeof nested.count === "number") return nested.count;
  }

  return fallbackLength;
};