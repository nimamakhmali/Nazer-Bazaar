import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import type { ProductCreateRequest } from "../types/products.types";

export const productsService = {
  getProducts: (params?: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.PRODUCTS.LIST, { params }),

  getProduct: (id: number) =>
    apiClient.get(ENDPOINTS.PRODUCTS.DETAIL(id)),

  createProduct: (data: ProductCreateRequest) =>
    apiClient.post(ENDPOINTS.PRODUCTS.LIST, data),

  updateProduct: (id: number, data: Partial<ProductCreateRequest>) =>
    apiClient.patch(ENDPOINTS.PRODUCTS.DETAIL(id), data),

  uploadImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return apiClient.post(ENDPOINTS.PRODUCTS.UPLOAD_IMAGE(id), formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getCategories: (params?: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.PRODUCTS.CATEGORIES, { params }),

  getCategory: (id: number) =>
    apiClient.get(ENDPOINTS.PRODUCTS.CATEGORY(id)),

  createCategory: (data: unknown) =>
    apiClient.post(ENDPOINTS.PRODUCTS.CATEGORIES, data),

  updateCategory: (id: number, data: unknown) =>
    apiClient.patch(ENDPOINTS.PRODUCTS.CATEGORY(id), data),

  getUnits: () =>
    apiClient.get(ENDPOINTS.PRODUCTS.UNITS),

  exportProducts: () =>
    apiClient.get(ENDPOINTS.PRODUCTS.EXPORT, { responseType: "blob" }),

  importProducts: (file: File, updateExisting = false) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("update_existing", String(updateExisting));
    return apiClient.post(ENDPOINTS.PRODUCTS.IMPORT, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  downloadTemplate: () =>
    apiClient.get(ENDPOINTS.PRODUCTS.IMPORT_TEMPLATE, { responseType: "blob" }),
};
