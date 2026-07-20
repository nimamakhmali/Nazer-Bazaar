import { CONFIG } from "@/constants/config";

export const calcAllowedPriceRange = (officialPrice: number) => ({
  min: Math.ceil(officialPrice * CONFIG.MIN_PRICE_RATIO),
  max: officialPrice,
});

export const isOverpriced = (storePrice: number, officialPrice: number): boolean =>
  storePrice > officialPrice;

export const isUnderpriced = (storePrice: number, officialPrice: number): boolean =>
  storePrice < officialPrice * CONFIG.MIN_PRICE_RATIO;

export const isCompliant = (storePrice: number, officialPrice: number): boolean =>
  storePrice >= officialPrice * CONFIG.MIN_PRICE_RATIO && storePrice <= officialPrice;

export const calcDiscountPercent = (storePrice: number, officialPrice: number): number =>
  Math.round(((officialPrice - storePrice) / officialPrice) * 100);

export const calcViolationAmount = (storePrice: number, officialPrice: number): number =>
  Math.max(0, storePrice - officialPrice);

export const getPriceStatusColor = (storePrice: number, officialPrice: number): string => {
  if (isOverpriced(storePrice, officialPrice)) return "text-red-600";
  if (isUnderpriced(storePrice, officialPrice)) return "text-orange-500";
  return "text-green-600";
};

export const getPriceStatusLabel = (storePrice: number, officialPrice: number): string => {
  if (isOverpriced(storePrice, officialPrice)) return "گران‌فروشی";
  if (isUnderpriced(storePrice, officialPrice)) return "زیر حداقل مجاز";
  return "قیمت مجاز";
};
