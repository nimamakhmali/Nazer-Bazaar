import { useApiQuery, useApiMutation, QUERY_KEYS } from "@/hooks";
import apiClient     from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import type { Store, StoreRegisterRequest } from "../types/stores.types";
import { extractArray } from "@/utils/error.utils";

export function useStores(params?: Record<string, unknown>) {
  return useApiQuery<Store[]>(
    QUERY_KEYS.STORES(params),
    async () => {
      const r = await apiClient.get(ENDPOINTS.STORES.LIST, { params });
      const d = r.data?.data ?? r.data;
      return { data: extractArray<Store>(d) };
    },
    { staleTime: 5 * 60 * 1000 }
  );
}

export function useMyStores() {
  return useApiQuery<Store[]>(
    [...QUERY_KEYS.MY_STORES],
    async () => {
      const r = await apiClient.get(ENDPOINTS.STORES.MY_STORES);
      const d = r.data?.data ?? r.data;
      return { data: extractArray<Store>(d) };
    },
    { staleTime: 2 * 60 * 1000 }
  );
}

export function usePendingStores() {
  return useApiQuery<Store[]>(
    [...QUERY_KEYS.PENDING_STORES],
    async () => {
      const r = await apiClient.get(ENDPOINTS.STORES.PENDING);
      const d = r.data?.data ?? r.data;
      return { data: extractArray<Store>(d) };
    },
    { staleTime: 1 * 60 * 1000 }
  );
}

export function useStore(id: number) {
  return useApiQuery<Store>(
    QUERY_KEYS.STORE(id),
    async () => {
      const r = await apiClient.get(ENDPOINTS.STORES.DETAIL(id));
      return { data: r.data?.data ?? r.data };
    },
    { enabled: !!id }
  );
}

export function useCreateStore() {
  return useApiMutation<Store, StoreRegisterRequest>(
    (data) => apiClient.post(ENDPOINTS.STORES.LIST, data),
    {
      successMessage: "فروشگاه با موفقیت ثبت شد",
      invalidateKeys: [QUERY_KEYS.MY_STORES, QUERY_KEYS.PENDING_STORES],
    }
  );
}

export function useApproveStore() {
  return useApiMutation<unknown, { id: number; reason?: string }>(
    ({ id, reason }) => apiClient.post(ENDPOINTS.STORES.APPROVE(id), { reason }),
    {
      successMessage: "فروشگاه تایید شد",
      invalidateKeys: [QUERY_KEYS.STORES(), QUERY_KEYS.PENDING_STORES],
    }
  );
}

export function useRejectStore() {
  return useApiMutation<unknown, { id: number; reason: string }>(
    ({ id, reason }) => apiClient.post(ENDPOINTS.STORES.REJECT(id), { reason }),
    {
      successMessage: "فروشگاه رد شد",
      invalidateKeys: [QUERY_KEYS.STORES(), QUERY_KEYS.PENDING_STORES],
    }
  );
}

export function useSuspendStore() {
  return useApiMutation<unknown, { id: number; reason: string }>(
    ({ id, reason }) => apiClient.post(ENDPOINTS.STORES.SUSPEND(id), { reason }),
    {
      successMessage: "فروشگاه تعلیق شد",
      invalidateKeys: [QUERY_KEYS.STORES()],
    }
  );
}