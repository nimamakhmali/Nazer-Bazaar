export interface ProvinceOffice {
  id: number;
  name: string;
  province: number;
  province_name: string;
  manager: number | null;
  manager_name: string;
  manager_phone: string;
  address: string;
  phone: string;
  email: string;
  chambers_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Chamber {
  id: number;
  name: string;
  city: number;
  city_name: string;
  province_name: string;
  manager: number | null;
  manager_name: string;
  manager_phone: string;
  address: string;
  phone: string;
  email: string;
  established_year: number | null;
  unions_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Union {
  id: number;
  name: string;
  chamber: number;
  chamber_name: string;
  city_name: string;
  province_name: string;
  manager: number | null;
  manager_name: string;
  manager_phone: string;
  description: string;
  license_number: string;
  established_year: number | null;
  phone: string;
  address: string;
  logo: string | null;
  stores_count: number;
  full_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
