"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export const useQueryParams = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getParam = (key: string) => searchParams.get(key);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const setParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const removeParam = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return { getParam, setParam, setParams, removeParam, searchParams };
};
