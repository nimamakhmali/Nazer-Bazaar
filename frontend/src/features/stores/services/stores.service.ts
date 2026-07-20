import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import type { StoreRegisterRequest } from "../types/stores.types";

export const storesService = {
  getStores: (params?: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.STORES.LIST, { params }),

  getStore: (id: number) =>
    apiClient.get(ENDPOINTS.STORES.DETAIL(id)),

  createStore: (data: StoreRegisterRequest) =>
    apiClient.post(ENDPOINTS.STORES.LIST, data),

  updateStore: (id: number, data: Partial<StoreRegisterRequest>) =>
    apiClient.patch(ENDPOINTS.STORES.DETAIL(id), data),

  approveStore: (id: number, reason?: string) =>
    apiClient.post(ENDPOINTS.STORES.APPROVE(id), { reason }),

  rejectStore: (id: number, reason: string) =>
    apiClient.post(ENDPOINTS.STORES.REJECT(id), { reason }),

  suspendStore: (id: number, reason: string) =>
    apiClient.post(ENDPOINTS.STORES.SUSPEND(id), { reason }),

  reactivateStore: (id: number) =>
    apiClient.post(ENDPOINTS.STORES.REACTIVATE(id)),

  getDocuments: (storeId: number) =>
    apiClient.get(ENDPOINTS.STORES.DOCUMENTS(storeId)),

  uploadDocument: (storeId: number, data: FormData) =>
    apiClient.post(ENDPOINTS.STORES.DOCUMENTS(storeId), data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  verifyDocument: (docId: number) =>
    apiClient.post(ENDPOINTS.STORES.DOCUMENT_VERIFY(docId)),

  deleteDocument: (docId: number) =>
    apiClient.delete(ENDPOINTS.STORES.DOCUMENT_DELETE(docId)),

  getLicense: (storeId: number) =>
    apiClient.get(ENDPOINTS.STORES.LICENSE(storeId)),

  createLicense: (storeId: number, data: unknown) =>
    apiClient.post(ENDPOINTS.STORES.LICENSE(storeId), data),

  getMyStores: () =>
    apiClient.get(ENDPOINTS.STORES.MY_STORES),

  getPendingStores: () =>
    apiClient.get(ENDPOINTS.STORES.PENDING),
};
