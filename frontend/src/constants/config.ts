export const CONFIG = {
  APP_NAME:     "سامانه پایش قیمت کالا",
  API_URL:      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  VERSION:      "1.0.0",

  // قوانین قیمت
  PRICE_DISCOUNT_PERCENT: 20,
  MIN_PRICE_RATIO:        0.8,

  // Pagination
  DEFAULT_PAGE_SIZE:  10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],

  // Token keys در Cookie
  ACCESS_TOKEN_KEY:  "access_token",
  REFRESH_TOKEN_KEY: "refresh_token",

  // OTP
  OTP_COUNTDOWN: 120,
} as const;