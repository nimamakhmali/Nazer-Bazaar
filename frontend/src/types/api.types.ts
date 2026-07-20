export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

export interface SelectOption {
  value: string | number;
  label: string;
}

export type SortDirection = "asc" | "desc";

export interface TableParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  [key: string]: unknown;
}
