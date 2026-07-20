/**
 * استخراج ایمن آرایه از هر نوع پاسخ API (جنگو یا انولوپ‌های سفارشی)
 * این تابع تضمین می‌کند که خروجی همیشه یک آرایه معتبر است تا سیستم کرش نکند.
 */
export const extractArray = <T = any>(data: any): T[] => {
  if (!data) return [];
  
  // ۱. اگر داده خودش مستقیماً آرایه باشد
  if (Array.isArray(data)) return data;
  
  // ۲. اگر ساختار استاندارد DRF با results باشد
  if (data.results && Array.isArray(data.results)) return data.results;
  
  // ۳. اگر بک‌اند داده‌ها را در کلید data کپسوله کرده باشد
  if (data.data) {
    if (Array.isArray(data.data)) return data.data;
    if (data.data.results && Array.isArray(data.data.results)) return data.data.results;
  }
  
  return [];
};

/**
 * استخراج تعداد کل آیتم‌ها برای محاسبات صفحه‌بندی
 */
export const extractCount = (data: any, fallbackLength: number = 0): number => {
  if (!data) return fallbackLength;
  if (typeof data.count === "number") return data.count;
  if (data.data && typeof data.data.count === "number") return data.data.count;
  return fallbackLength;
};