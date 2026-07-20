export interface OfficialPrice {
  id: number;
  product: number;
  product_name: string;
  product_unit_name: string;
  product_unit_symbol: string;
  union: number;
  union_name: string;
  city_name: string;
  price: number;
  price_formatted: string;
  min_allowed_price: number;
  max_allowed_price: number;
  min_price_formatted: string;
  effective_date: string;
  expire_date: string | null;
  description: string;
  is_today: boolean;
  is_expired: boolean;
  is_active: boolean;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface StorePrice {
  id: number;
  store: number;
  store_name: string;
  union_name: string;
  product: number;
  product_name: string;
  product_unit_name: string;
  product_unit_symbol: string;
  official_price: number;
  price: number;
  price_formatted: string;
  official_price_amount: number;
  official_price_formatted: string;
  min_allowed_price_amount: number;
  discount_percent: number;
  price_ratio: number;
  is_compliant: boolean;
  is_overpriced: boolean;
  violation_amount: number;
  is_today: boolean;
  price_date: string;
  description: string;
  is_active: boolean;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface PriceComparison {
  id: number;
  store: number;
  store_name: string;
  store_address: string;
  union_name: string;
  price: number;
  official_price_amount: number;
  discount_percent: number;
  is_compliant: boolean;
}

export interface OfficialPriceCreateRequest {
  union_id: number;
  product_id: number;
  price: number;
  effective_date?: string;
  expire_date?: string;
  description?: string;
}

export interface StorePriceSetRequest {
  store_id: number;
  product_id: number;
  price: number;
  price_date?: string;
  description?: string;
}
