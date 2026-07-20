export const formatPrice = (price: number): string =>
  new Intl.NumberFormat("fa-IR").format(price);

export const formatPriceWithUnit = (price: number, unit = "ریال"): string =>
  `${formatPrice(price)} ${unit}`;

export const formatPriceToman = (price: number): string =>
  `${new Intl.NumberFormat("fa-IR").format(Math.round(price / 10))} تومان`;

export const parseFormattedNumber = (value: string): number =>
  Number(value.replace(/[^0-9]/g, ""));

export const toFarsiNumber = (num: number | string): string =>
  String(num).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);

export const toEnglishNumber = (str: string): string =>
  str.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
