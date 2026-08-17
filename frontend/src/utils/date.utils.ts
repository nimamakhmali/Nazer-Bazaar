import { toJalaali, toGregorian } from "jalaali-js";

const isValidDate = (date: Date): boolean =>
  date instanceof Date && !isNaN(date.getTime());

export const toJalali = (dateStr: string): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (!isValidDate(date)) return "-";
  try {
    const { jy, jm, jd } = toJalaali(date);
    return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
  } catch {
    return "-";
  }
};

export const toJalaliWithTime = (dateStr: string): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (!isValidDate(date)) return "-";
  try {
    const { jy, jm, jd } = toJalaali(date);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")} - ${hours}:${minutes}`;
  } catch {
    return "-";
  }
};

export const getTodayJalali = (): string => {
  const now = new Date();
  const { jy, jm, jd } = toJalaali(now);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
};

export const getTodayGregorian = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const fromJalaliToGregorian = (jalaliDate: string): string => {
  const normalized = jalaliDate.replace(/\//g, "-");
  const [jy, jm, jd] = normalized.split("-").map(Number);
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
};

export const timeAgo = (dateStr: string): string => {
  if (!dateStr) return "-";
  const now = new Date();
  const date = new Date(dateStr);
  if (!isValidDate(date)) return "-";
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "لحظاتی پیش";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقیقه پیش`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ساعت پیش`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} روز پیش`;
  return toJalali(dateStr);
};