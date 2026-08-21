import { useState } from "react";
import { CONFIG } from "@/constants/config";

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

export const usePagination = (initialPageSize = CONFIG.DEFAULT_PAGE_SIZE): UsePaginationReturn => {
  const [page, setPageState] = useState<number>(1);
  const [pageSize, setPageSizeState] = useState<number>(initialPageSize);

  const setPage = (newPage: number) => setPageState(newPage);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPageState(1);
  };

  const reset = () => {
    setPageState(1);
    setPageSizeState(initialPageSize);
  };

  return { page, pageSize, setPage, setPageSize, reset };
};
