import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";

export const cmsService = {
  getSliders: () =>
    apiClient.get(ENDPOINTS.CMS.SLIDERS),

  getAds: (position?: string) =>
    apiClient.get(ENDPOINTS.CMS.ADS, { params: { position } }),

  getBlogs: (params?: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.CMS.BLOGS, { params }),

  getBlogDetail: (slug: string) =>
    apiClient.get(ENDPOINTS.CMS.BLOG(slug)),

  getPageDetail: (slug: string) =>
    apiClient.get(ENDPOINTS.CMS.PAGE(slug)),
};