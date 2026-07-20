import { useApiQuery, useApiMutation, QUERY_KEYS } from "@/hooks";
import apiClient     from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import type {
  OfficialPrice,
  OfficialPriceCreateRequest,
} from "../types/pricing.types";
import { extractArray } from "@/utils/error.utils";

export function useOfficialPrices(params?: Record<string, unknown>) {
  return useApiQuery<OfficialPrice[]>(
    QUERY_KEYS.OFFICIAL_PRICES(params),
    async () => {
      const r = await apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICES, { params });
      const d = r.data?.data ?? r.data;
      return { data: extractArray<OfficialPrice>(d) };
    },
    { staleTime: 5 * 60 * 1000 }
  );
}

export function useTodayPrices(params?: Record<string, unknown>) {
  return useApiQuery<OfficialPrice[]>(
    QUERY_KEYS.TODAY_PRICES(params),
    async () => {
      const r = await apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICES_TODAY, { params });
      const d = r.data?.data ?? r.data;
      return { data: extractArray<OfficialPrice>(d) };
    },
    { staleTime: 5 * 60 * 1000 }
  );
}

export function useCreateOfficialPrice() {
  return useApiMutation<OfficialPrice, OfficialPriceCreateRequest>(
    (data) => apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICES, data),
    {
      successMessage: "قیمت مصوب با موفقیت ثبت شد",
      invalidateKeys: [
        QUERY_KEYS.OFFICIAL_PRICES(),
        QUERY_KEYS.TODAY_PRICES(),
        QUERY_KEYS.PRICE_HISTORY(),
      ],
    }
  );
}

export function useBulkCreateOfficialPrices() {
  return useApiMutation<unknown, unknown>(
    (data) => apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICES_BULK, data),
    {
      successMessage: "قیمت‌ها با موفقیت ثبت شدند",
      invalidateKeys: [
        QUERY_KEYS.OFFICIAL_PRICES(),
        QUERY_KEYS.TODAY_PRICES(),
      ],
    }
  );
}

export function useDeactivateOfficialPrice() {
  return useApiMutation<unknown, number>(
    (id) => apiClient.post(ENDPOINTS.PRICING.OFFICIAL_PRICE_DEACTIVATE(id)),
    {
      successMessage: "قیمت غیرفعال شد",
      invalidateKeys: [QUERY_KEYS.OFFICIAL_PRICES()],
    }
  );
}