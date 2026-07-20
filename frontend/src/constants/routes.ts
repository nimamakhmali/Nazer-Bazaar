export const ROUTES = {
  // Public
  HOME: "/",
  PRICES: "/prices",
  STORES: "/stores",
  COMPLAINT_NEW: "/complaints/new",
  COMPLAINT_TRACK: (uuid: string) => `/complaints/track/${uuid}`,
  BLOGS: "/blogs",
  BLOG_DETAIL: (slug: string) => `/blogs/${slug}`,
  PAGE: (slug: string) => `/pages/${slug}`,

  // Auth
  LOGIN: "/login",
  OTP: "/otp",

  // Shared Dashboard
  DASHBOARD: "/dashboard",
  PROFILE: "/profile",

  // Admin
  ADMIN_USERS: "/admin/users",
  ADMIN_USER: (id: number) => `/admin/users/${id}`,
  ADMIN_PROVINCES: "/admin/provinces",
  ADMIN_PROVINCE: (id: number) => `/admin/provinces/${id}`,
  ADMIN_CITIES: "/admin/cities",
  ADMIN_PROVINCE_OFFICES: "/admin/province-offices",
  ADMIN_PROVINCE_OFFICE: (id: number) => `/admin/province-offices/${id}`,
  ADMIN_CHAMBERS: "/admin/chambers",
  ADMIN_CHAMBER: (id: number) => `/admin/chambers/${id}`,
  ADMIN_UNIONS: "/admin/unions",
  ADMIN_UNION: (id: number) => `/admin/unions/${id}`,
  ADMIN_PRODUCTS: "/admin/products",
  ADMIN_PRODUCT: (id: number) => `/admin/products/${id}`,
  ADMIN_CATEGORIES: "/admin/products/categories",
  ADMIN_BLOGS: "/admin/cms/blogs",
  ADMIN_PAGES: "/admin/cms/pages",

  // Province
  PROVINCE_OVERVIEW: "/province/overview",
  PROVINCE_CHAMBERS: "/province/chambers",
  PROVINCE_COMPLAINTS: "/province/complaints",
  PROVINCE_COMPLAINT: (uuid: string) => `/province/complaints/${uuid}`,
  PROVINCE_REPORTS: "/province/reports",

  // Chamber
  CHAMBER_OVERVIEW: "/chamber/overview",
  CHAMBER_UNIONS: "/chamber/unions",
  CHAMBER_STORES: "/chamber/stores",
  CHAMBER_STORES_PENDING: "/chamber/stores/pending",
  CHAMBER_STORE: (id: number) => `/chamber/stores/${id}`,
  CHAMBER_COMPLAINTS: "/chamber/complaints",
  CHAMBER_COMPLAINT: (uuid: string) => `/chamber/complaints/${uuid}`,

  // Union
  UNION_OVERVIEW: "/union/overview",
  UNION_STORES: "/union/stores",
  UNION_STORE: (id: number) => `/union/stores/${id}`,
  UNION_PRICING: "/union/pricing",
  UNION_PRICING_OFFICIAL: "/union/pricing/official",
  UNION_PRICING_HISTORY: "/union/pricing/history",
  UNION_COMPLAINTS: "/union/complaints",
  UNION_COMPLAINT: (uuid: string) => `/union/complaints/${uuid}`,

  // Store
  STORE_OVERVIEW: "/store/overview",
  STORE_MY_STORES: "/store/my-stores",
  STORE_REGISTER: "/store/register-store",
  STORE_DETAIL: (id: number) => `/store/my-stores/${id}`,
  STORE_DOCUMENTS: (id: number) => `/store/my-stores/${id}/documents`,
  STORE_LICENSE: (id: number) => `/store/my-stores/${id}/license`,
  STORE_PRICING: "/store/pricing",

  // Inspector
  INSPECTOR_OVERVIEW: "/inspector/overview",
  INSPECTOR_STORES: "/inspector/stores",
  INSPECTOR_OVERPRICED: "/inspector/overpriced",
  INSPECTOR_COMPLAINTS: "/inspector/complaints",
  INSPECTOR_COMPLAINT: (uuid: string) => `/inspector/complaints/${uuid}`,

  // Customer
  CUSTOMER_OVERVIEW: "/customer/overview",
  CUSTOMER_COMPLAINTS: "/customer/complaints",
  CUSTOMER_COMPLAINT: (uuid: string) => `/customer/complaints/${uuid}`,
} as const;
