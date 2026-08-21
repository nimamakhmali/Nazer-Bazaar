"use client";

import { useQuery, type UseQueryOptions, type QueryClient } from "@tanstack/react-query";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { queryClient } from "@/lib/query-client";
import apiClient from "@/services/api.client";

// ─────────────────────────────────────────────────────────────────────────────
// useApiQuery
// ─────────────────────────────────────────────────────────────────────────────
export function useApiQuery<TData, TError = Error>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<{ data: TData }>,
  options?: Omit<
    UseQueryOptions<TData, TError>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      const response = await queryFn();
      return response.data;
    },
    ...options,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// useApiMutation
// ─────────────────────────────────────────────────────────────────────────────
interface UseApiMutationOptions<TData, TVariables> {
  successMessage?: string;
  invalidateKeys?: Array<readonly unknown[]>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData }>,
  options?: UseApiMutationOptions<TData, TVariables>
) {
  const { successMessage, invalidateKeys, onSuccess, onError } = options || {};

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const response = await mutationFn(variables);
      return response.data;
    },
    onSuccess: (data, variables) => {
      if (successMessage) {
        toast.success(successMessage);
      }
      if (invalidateKeys && invalidateKeys.length > 0) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      onError?.(error, variables);
    },
  });
}
