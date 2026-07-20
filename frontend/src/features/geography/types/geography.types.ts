export interface Province {
  id: number;
  name: string;
  code: string;
  is_active?: boolean;
  cities_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface City {
  id: number;
  name: string;
  province: number;
  province_name: string;
  province_code?: string;
  is_active?: boolean;
}

export interface ProvinceCreateRequest {
  name: string;
  code: string;
  is_active?: boolean;
}

export interface CityCreateRequest {
  name: string;
  province: number;
  is_active?: boolean;
}
