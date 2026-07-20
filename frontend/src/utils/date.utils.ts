// جایگزین import قبلی
import { toJalaali, toGregorian } from "jalaali-js";

export const toJalali = (dateStr: string): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const { jy, jm, jd } = toJalaali(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
    return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
  } catch {
    return "-";
  }
};

export const toJalaliWithTime = (dateStr: string): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const { jy, jm, jd } = toJalaali(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
    const hours   = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")} - ${hours}:${minutes}`;
  } catch {
    return "-";
  }
};

export const getTodayJalali = (): string => {
  try {
    const now = new Date();
    const { jy, jm, jd } = toJalaali(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );
    return `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
  } catch {
    return "";
  }
};

export const fromJalaliToGregorian = (jalaliDate: string): string => {
  try {
    const [jy, jm, jd] = jalaliDate.split("-").map(Number);
    const { gy, gm, gd } = toGregorian(jy, jm, jd);
    return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
  } catch {
    return "";
  }
};

export const timeAgo = (dateStr: string): string => {
  if (!dateStr) return "-";
  try {
    const now     = new Date();
    const date    = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60)     return "لحظاتی پیش";
    if (seconds < 3600)   return `${Math.floor(seconds / 60)} دقیقه پیش`;
    if (seconds < 86400)  return `${Math.floor(seconds / 3600)} ساعت پیش`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} روز پیش`;
    return toJalali(dateStr);
  } catch {
    return "-";
  }
};

export const jalaliMonthName = (month: number): string => {
  const months = [
    "فروردین", "اردیبهشت", "خرداد",
    "تیر",     "مرداد",    "شهریور",
    "مهر",     "آبان",     "آذر",
    "دی",      "بهمن",     "اسفند",
  ];
  return months[month - 1] ?? "";
};