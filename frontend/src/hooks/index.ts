// ─────────────────────────────────────────────────────────────────────────────
// Query Keys — مرکزی برای همه کلیدها
// ─────────────────────────────────────────────────────────────────────────────
export const QUERY_KEYS = {
  // Auth
  ME:                  ["me"]                          as const,

  // Geography
  PROVINCES:           (p?: object) => ["provinces",  p],
  PROVINCE:            (id: number)  => ["province",  id],
  CITIES:              (p?: object) => ["cities",     p],
  CITY:                (id: number)  => ["city",      id],

  // Organizations
  PROVINCE_OFFICES:    (p?: object) => ["province-offices", p],
  CHAMBERS:            (p?: object) => ["chambers",         p],
  CHAMBER:             (id: number)  => ["chamber",         id],
  UNIONS:              (p?: object) => ["unions",           p],
  UNION:               (id: number)  => ["union",           id],

  // Stores
  STORES:              (p?: object) => ["stores",       p],
  STORE:               (id: number)  => ["store",       id],
  MY_STORES:           ["my-stores"]                   as const,
  PENDING_STORES:      ["pending-stores"]              as const,
  STORE_DOCS:          (id: number)  => ["store-docs", id],
  STORE_LICENSE:       (id: number)  => ["store-license", id],

  // Products
  PRODUCTS:            (p?: object) => ["products",    p],
  PRODUCT:             (id: number)  => ["product",    id],
  CATEGORIES:          (p?: object) => ["categories",  p],
  UNITS:               ["units"]                       as const,

  // Pricing
  OFFICIAL_PRICES:     (p?: object) => ["official-prices",  p],
  OFFICIAL_PRICE:      (id: number)  => ["official-price",  id],
  TODAY_PRICES:        (p?: object) => ["today-prices",     p],
  STORE_PRICES:        (p?: object) => ["store-prices",     p],
  STORE_PRICE:         (id: number)  => ["store-price",     id],
  TODAY_STORE_PRICES:  (p?: object) => ["today-store-prices", p],
  PRICE_COMPARE:       (p?: object) => ["price-compare",    p],
  PRICE_HISTORY:       (p?: object) => ["price-history",    p],
  OVERPRICED:          (p?: object) => ["overpriced",       p],
  PRICE_STATS:         (p?: object) => ["price-stats",      p],

  // Complaints
  COMPLAINTS:          (p?: object) => ["complaints",   p],
  COMPLAINT:           (uuid: string)=> ["complaint",   uuid],
  MY_COMPLAINTS:       (p?: object) => ["my-complaints",p],

  // CMS
  SLIDERS:             ["sliders"]                     as const,
  ADS:                 ["ads"]                         as const,
  BLOGS:               (p?: object) => ["blogs",       p],
  BLOG:                (slug: string)=> ["blog",       slug],
  PAGES:               (p?: object) => ["pages",       p],
  PAGE:                (slug: string)=> ["page",       slug],

  // Users
  USERS:               (p?: object) => ["users",       p],
  USER:                (id: number)  => ["user",       id],
  PROFILE:             ["profile"]                     as const,
} as const;