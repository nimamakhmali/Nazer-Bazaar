import { useApiQuery, useApiMutation, QUERY_KEYS } from "@/hooks";
import apiClient     from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import type {
  Complaint,
  ComplaintListItem,
  ComplaintCreateRequest,
} from "../types/complaints.types";
import { extractArray } from "@/utils/error.utils";

export function useComplaints(params?: Record<string, unknown>) {
  return useApiQuery<ComplaintListItem[]>(
    QUERY_KEYS.COMPLAINTS(params),
    async () => {
      const r = await apiClient.get(ENDPOINTS.COMPLAINTS.LIST, { params });
      const d = r.data?.data ?? r.data;
      return { data: extractArray<ComplaintListItem>(d) };
    },
    { staleTime: 2 * 60 * 1000 }
  );
}

export function useMyComplaints(params?: Record<string, unknown>) {
  return useApiQuery<ComplaintListItem[]>(
    QUERY_KEYS.MY_COMPLAINTS(params),
    async () => {
      const r = await apiClient.get(ENDPOINTS.COMPLAINTS.MY, { params });
      const d = r.data?.data ?? r.data;
      return { data: extractArray<ComplaintListItem>(d) };
    },
    { staleTime: 1 * 60 * 1000 }
  );
}

export function useComplaint(uuid: string) {
  return useApiQuery<Complaint>(
    QUERY_KEYS.COMPLAINT(uuid),
    async () => {
      const r = await apiClient.get(ENDPOINTS.COMPLAINTS.DETAIL(uuid));
      return { data: r.data?.data ?? r.data };
    },
    { enabled: !!uuid, staleTime: 30 * 1000 }
  );
}

export function useTrackComplaint(uuid: string) {
  return useApiQuery<Complaint>(
    ["track-complaint", uuid],
    async () => {
      const r = await apiClient.get(ENDPOINTS.COMPLAINTS.TRACK(uuid));
      return { data: r.data?.data ?? r.data };
    },
    { enabled: !!uuid, staleTime: 30 * 1000 }
  );
}

export function useCreateComplaint() {
  return useApiMutation<Complaint, FormData>(
    (formData) =>
      apiClient.post(ENDPOINTS.COMPLAINTS.LIST, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    {
      successMessage: "شکایت با موفقیت ثبت شد",
      invalidateKeys: [QUERY_KEYS.MY_COMPLAINTS(), QUERY_KEYS.COMPLAINTS()],
    }
  );
}