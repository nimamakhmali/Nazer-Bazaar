import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import type { ProvinceCreateRequest, CityCreateRequest } from "../types/geography.types";

export const geographyService = {
  // Provinces
  getProvinces: (params?: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.GEOGRAPHY.PROVINCES, { params }),

  getProvince: (id: number) =>
    apiClient.get(ENDPOINTS.GEOGRAPHY.PROVINCE(id)),

  createProvince: (data: ProvinceCreateRequest) =>
    apiClient.post(ENDPOINTS.GEOGRAPHY.PROVINCES, data),

  updateProvince: (id: number, data: Partial<ProvinceCreateRequest>) =>
    apiClient.patch(ENDPOINTS.GEOGRAPHY.PROVINCE(id), data),

  deleteProvince: (id: number) =>
    apiClient.delete(ENDPOINTS.GEOGRAPHY.PROVINCE(id)),

  getProvinceCities: (provinceId: number) =>
    apiClient.get(ENDPOINTS.GEOGRAPHY.PROVINCE_CITIES(provinceId)),

  // Cities
  getCities: (params?: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.GEOGRAPHY.CITIES, { params }),

  getCity: (id: number) =>
    apiClient.get(ENDPOINTS.GEOGRAPHY.CITY(id)),

  createCity: (data: CityCreateRequest) =>
    apiClient.post(ENDPOINTS.GEOGRAPHY.CITIES, data),

  updateCity: (id: number, data: Partial<CityCreateRequest>) =>
    apiClient.patch(ENDPOINTS.GEOGRAPHY.CITY(id), data),
};
