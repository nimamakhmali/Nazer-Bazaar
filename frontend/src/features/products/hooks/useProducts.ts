"use client";

import { useState, useEffect, useCallback } from "react";
import { productsService } from "../services/products.service";
import type { Product } from "../types/products.types";
import { extractArray, extractCount } from "@/utils/error.utils";

interface UseProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string | number;
  unionId?: string | number;
  featured?: boolean;
}

export const useProducts = (params: UseProductsParams = {}) => {
  const {
    page = 1,
    pageSize = 12,
    search = "",
    categoryId = "",
    unionId = "",
    featured,
  } = params;

  const [products,   setProducts]   = useState<Product[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error,      setError]      = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams: Record<string, unknown> = {
        page,
        page_size: pageSize,
      };
      if (search)     queryParams.search   = search;
      if (categoryId) queryParams.category = categoryId;
      if (unionId)    queryParams.union    = unionId;
      if (featured)   queryParams.featured = featured;

      const res  = await productsService.getProducts(queryParams);
      const data = res.data?.data ?? res.data;

      setProducts(extractArray<Product>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / pageSize) || 1);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "خطا در دریافت محصولات";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, categoryId, unionId, featured]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    totalCount,
    totalPages,
    error,
    refetch: fetchProducts,
  };
};

export const useProductsByUnion = (unionId: number) => {
  const [products,  setProducts]  = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!unionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res  = await productsService.getProductsByUnion(unionId, {
        page_size: 200,
      });
      const data = res.data?.data ?? res.data;
      setProducts(extractArray<Product>(data));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "خطا در دریافت محصولات اتحادیه";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [unionId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { products, isLoading, error, refetch: fetch };
};