export interface ProductUnit {
  id: number;
  name: string;
  symbol: string;
  description: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  parent_name: string;
  icon: string | null;
  order: number;
  products_count: number;
  children_count: number;
  is_active: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  full_name: string;
  category: number;
  category_name: string;
  unit: number;
  unit_name: string;
  unit_symbol: string;
  barcode: string | null;
  description: string;
  image: string | null;
  brand: string;
  origin: string;
  specifications: Record<string, unknown>;
  order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCreateRequest {
  name: string;
  category_id: number;
  unit_id: number;
  description?: string;
  brand?: string;
  origin?: string;
  barcode?: string;
  order?: number;
  is_featured?: boolean;
  specifications?: Record<string, unknown>;
}
