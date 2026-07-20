import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import type { OfficialPriceCreateRequest, StorePriceSetRequest } from "../types/pricing.types";

export const pricingService = {
  // Official Prices
  getOfficialPrices: (params?: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICES, { params }),

  getOfficialPrice: (id: number) =>
    apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICE(id)),

  createOfficialPrice: (data: OfficialPriceCreateRequest) =>
    apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICES, data),

  updateOfficialPrice: (id: number, data: Partial<OfficialPriceCreateRequest>) =>
    apiClient.patch(ENDPOINTS.PRICING.OFFICIAL_PRICE(id), data),

  deactivateOfficialPrice: (id: number) =>
    apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICE_DEACTIVATE(id)),

  bulkCreateOfficialPrices: (data: unknown) =>
    apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICES_BULK, data),

  getTodayOfficialPrices: (params?: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICES_TODAY, { params }),

  // Store Prices
  setStorePrice: (data: StorePriceSetRequest) =>
    apiClient.post(ENDPOINTS.PRICING.STORE_PRICES_SET, data),

  bulkSetStorePrices: (data: unknown) =>
    apiClient.post(ENDPOINTS.PRICING.STORE_PRICES_BULK, data),

  getStorePrice: (id: number) =>
    apiClient.get(ENDPOINTS.PRICING.STORE_PRICE(id)),

  getTodayStorePrices: (params?: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.PRICING.STORE_PRICES_TODAY, { params }),

  // Analysis
  comparePrice: (params: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.PRICING.COMPARE, { params }),

  getPriceHistory: (params?: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.PRICING.HISTORY, { params }),

  getOverpricedStores: (params?: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.PRICING.OVERPRICED, { params }),

  getPriceRange: (params: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.PRICING.PRICE_RANGE, { params }),

  getPriceStats: (params: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.PRICING.STATS, { params }),
};
