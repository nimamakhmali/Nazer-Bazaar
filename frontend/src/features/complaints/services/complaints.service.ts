import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import type { ComplaintCreateRequest } from "../types/complaints.types";

export const complaintsService = {
  createComplaint: (data: ComplaintCreateRequest) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as string | Blob);
      }
    });
    return apiClient.post(ENDPOINTS.COMPLAINTS.LIST, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getComplaint: (uuid: string) =>
    apiClient.get(ENDPOINTS.COMPLAINTS.DETAIL(uuid)),

  getMyComplaints: (params?: Record<string, unknown>) =>
    apiClient.get(ENDPOINTS.COMPLAINTS.MY, { params }),

  trackComplaint: (uuid: string) =>
    apiClient.get(ENDPOINTS.COMPLAINTS.TRACK(uuid)),
};
