export const ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: "/auth/login/",
    LOGOUT: "/auth/logout/",
    ME: "/auth/me/",
    OTP_REQUEST: "/auth/otp/request/",
    OTP_VERIFY: "/auth/otp/verify/",
    REFRESH: "/auth/token/refresh/",
    USERS: "/auth/users/",
    USER: (id: number) => `/auth/users/${id}/`,
    USER_ROLE: (id: number) => `/auth/users/${id}/role/`,
    PROFILE: "/auth/users/profile/",
    ORG_SEARCH: "/auth/users/org-search/",
  },

  // Geography
  GEOGRAPHY: {
    PROVINCES: "/geography/provinces/",
    PROVINCE: (id: number) => `/geography/provinces/${id}/`,
    PROVINCE_CITIES: (id: number) => `/geography/provinces/${id}/cities/`,
    CITIES: "/geography/cities/",
    CITY: (id: number) => `/geography/cities/${id}/`,
  },

  // Organizations
  ORGANIZATIONS: {
    PROVINCE_OFFICES: "/organizations/province-offices/",
    PROVINCE_OFFICE: (id: number) => `/organizations/province-offices/${id}/`,
    PROVINCE_OFFICE_ASSIGN: (id: number) => `/organizations/province-offices/${id}/assign-manager/`,
    CHAMBERS: "/organizations/chambers/",
    CHAMBER: (id: number) => `/organizations/chambers/${id}/`,
    CHAMBER_ASSIGN: (id: number) => `/organizations/chambers/${id}/assign-manager/`,
    CHAMBER_UNIONS: (id: number) => `/organizations/chambers/${id}/unions/`,
    UNIONS: "/organizations/unions/",
    UNION: (id: number) => `/organizations/unions/${id}/`,
    UNION_ASSIGN: (id: number) => `/organizations/unions/${id}/assign-manager/`,
    UNION_TOGGLE: (id: number) => `/organizations/unions/${id}/toggle-active/`,
  },

  // Stores
  STORES: {
    LIST: "/stores/",
    DETAIL: (id: number) => `/stores/${id}/`,
    APPROVE: (id: number) => `/stores/${id}/approve/`,
    REJECT: (id: number) => `/stores/${id}/reject/`,
    SUSPEND: (id: number) => `/stores/${id}/suspend/`,
    REACTIVATE: (id: number) => `/stores/${id}/reactivate/`,
    DOCUMENTS: (id: number) => `/stores/${id}/documents/`,
    DOCUMENT_VERIFY: (docId: number) => `/stores/documents/${docId}/verify/`,
    DOCUMENT_DELETE: (docId: number) => `/stores/documents/${docId}/`,
    LICENSE: (id: number) => `/stores/${id}/license/`,
    MY_STORES: "/stores/my-stores/",
    PENDING: "/stores/pending/",
  },

  // Products
  PRODUCTS: {
    LIST: "/products/",
    DETAIL: (id: number) => `/products/${id}/`,
    UPLOAD_IMAGE: (id: number) => `/products/${id}/upload-image/`,
    CATEGORIES: "/products/categories/",
    CATEGORY: (id: number) => `/products/categories/${id}/`,
    UNITS: "/products/units/",
    EXPORT: "/products/export/",
    IMPORT: "/products/import/",
    IMPORT_TEMPLATE: "/products/import/template/",
  },

  // Pricing
  PRICING: {
    OFFICIAL_PRICES: "/pricing/official-prices/",
    OFFICIAL_PRICE: (id: number) => `/pricing/official-prices/${id}/`,
    OFFICIAL_PRICE_DEACTIVATE: (id: number) => `/pricing/official-prices/${id}/deactivate/`,
    OFFICIAL_PRICES_BULK: "/pricing/official-prices/bulk/",
    OFFICIAL_PRICES_TODAY: "/pricing/official-prices/today/",
    STORE_PRICES_SET: "/pricing/store-prices/set/",
    STORE_PRICES_BULK: "/pricing/store-prices/bulk/",
    STORE_PRICE: (id: number) => `/pricing/store-prices/${id}/`,
    STORE_PRICES_TODAY: "/pricing/store-prices/today/",
    COMPARE: "/pricing/compare/",
    HISTORY: "/pricing/history/",
    OVERPRICED: "/pricing/overpriced/",
    PRICE_RANGE: "/pricing/price-range/",
    STATS: "/pricing/stats/",
  },

  // Complaints
  COMPLAINTS: {
    LIST: "/complaints/",
    DETAIL: (uuid: string) => `/complaints/${uuid}/`,
    MY: "/complaints/my/",
    TRACK: (identifier: string) => `/complaints/track/${identifier}/`,  // ✅ اصلاح شد
  },

  // CMS
  CMS: {
    SLIDERS: "/cms/sliders/",
    ADS: "/cms/ads/",
    BLOGS: "/cms/blogs/",
    BLOG: (slug: string) => `/cms/blogs/${slug}/`,
    PAGES: "/cms/pages/",
    PAGE: (slug: string) => `/cms/pages/${slug}/`,
    ADMIN_BLOGS: "/cms/admin/blogs/",
    ADMIN_PAGES: "/cms/admin/pages/",
  },
} as const;

