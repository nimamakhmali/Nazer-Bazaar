"use client";

import { useState, useEffect, Fragment } from "react";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/Badge";
import { pricingService } from "@/features/pricing/services/pricing.service";
import { geographyService } from "@/features/geography/services/geography.service";
import { formatPriceWithUnit } from "@/utils/number.utils";
import { toJalali } from "@/utils/date.utils";
import { extractArray, extractCount } from "@/utils/api.utils";
import type { OfficialPrice, PriceComparison } from "@/features/pricing/types/pricing.types";

export default function PricesPage() {
  // فیلترها
  const [provinces, setProvinces]   = useState<SelectOption[]>([]);
  const [cities, setCities]         = useState<SelectOption[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedCity, setSelectedCity]         = useState<string>("");
  const [search, setSearch]                     = useState<string>("");
  const [onlyToday, setOnlyToday]               = useState<boolean>(true);

  // داده‌ها
  const [prices, setPrices]         = useState<OfficialPrice[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // مقایسه فروشگاه‌ها برای ردیف باز شده
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [storeComparisons, setStoreComparisons] = useState<PriceComparison[]>([]);
  const [isCompareLoading, setIsCompareLoading] = useState(false);

  // لود استان‌ها
  useEffect(() => {
    geographyService.getProvinces()
      .then((res) => {
        const provincesList = extractArray(res.data);
        setProvinces(
          provincesList.map((p: any) => ({
            value: p.id,
            label: p.name,
          }))
        );
      })
      .catch((err) => console.error("Error loading provinces:", err));
  }, []);

  // لود شهرها با تغییر استان
  useEffect(() => {
    if (!selectedProvince) {
      setCities([]);
      setSelectedCity("");
      return;
    }
    geographyService.getProvinceCities(Number(selectedProvince))
      .then((res) => {
        const citiesList = extractArray(res.data);
        setCities(
          citiesList.map((c: any) => ({
            value: c.id,
            label: c.name,
          }))
        );
      })
      .catch((err) => {
        console.error("Error loading cities:", err);
        setCities([]);
      });
  }, [selectedProvince]);

  

  // لود قیمت‌ها با فیلترها
  const fetchPrices = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        search: search || undefined,
        is_today: onlyToday ? true : undefined,
      };
      if (selectedCity) params.city = selectedCity;
      if (selectedProvince && !selectedCity) params.province = selectedProvince;

      const res = await pricingService.getOfficialPrices(params);
      
      const pricesArray = extractArray<OfficialPrice>(res.data);
      const totalCount = extractCount(res.data, pricesArray.length);

      setPrices(pricesArray);
      setTotalPages(Math.ceil(totalCount / 10) || 1);
    } catch (err) {
      console.error("Error fetching prices:", err);
      setPrices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, [selectedProvince, selectedCity, search, onlyToday, page]);

  // کلیک روی ردیف برای مقایسه قیمت فروشگاه‌ها
  const handleRowClick = async (priceItem: OfficialPrice) => {
    if (expandedRowId === priceItem.id) {
      setExpandedRowId(null);
      return;
    }

    setExpandedRowId(priceItem.id);
    setIsCompareLoading(true);
    try {
      const res = await pricingService.comparePrice({
        product: priceItem.product,
        city: selectedCity || undefined,
      });
      setStoreComparisons(extractArray<PriceComparison>(res.data));
    } catch (err) {
      console.error("Error comparing prices:", err);
      setStoreComparisons([]);
    } finally {
      setIsCompareLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">نرخ مصوب کالاهای اساسی</h1>
          <p className="text-sm text-slate-500 mt-1">مشاهده قیمت مصوب و مقایسه نرخ فروشگاه‌ها در سراسر کشور</p>
        </div>
        <Button variant="outline" leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}>
          خروجی اکسل
        </Button>
      </div>

      {/* Filter Card */}
      <div className="card p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <Select
          label="استان"
          placeholder="همه استان‌ها"
          options={provinces}
          value={selectedProvince}
          onChange={(e) => setSelectedProvince(e.target.value)}
        />
        <Select
          label="شهر"
          placeholder={selectedProvince ? "همه شهرها" : "ابتدا استان انتخاب کنید"}
          options={cities}
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          disabled={!selectedProvince}
        />
        <Input
          label="جستجوی محصول"
          placeholder="نام کالا..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center h-10 pb-1">
          <Toggle
            checked={onlyToday}
            onChange={setOnlyToday}
            label="فقط قیمت‌های امروز"
          />
        </div>
        <Button onClick={() => { setPage(1); fetchPrices(); }} variant="primary">
          اعمال فیلتر
        </Button>
      </div>

      {/* Main Prices Table */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-right">محصول</th>
                  <th className="px-6 py-3.5 text-right">واحد</th>
                  <th className="px-6 py-3.5 text-right">اتحادیه</th>
                  <th className="px-6 py-3.5 text-right">شهر</th>
                  <th className="px-6 py-3.5 text-right">قیمت مصوب</th>
                  <th className="px-6 py-3.5 text-right">حداقل مجاز (۸۰٪)</th>
                  <th className="px-6 py-3.5 text-right">اعتبار</th>
                  <th className="px-6 py-3.5 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      در حال بارگذاری اطلاعات...
                    </td>
                  </tr>
                ) : prices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      موردی با این مشخصات یافت نشد.
                    </td>
                  </tr>
                ) : (
                  prices.map((item) => {
                    const isExpanded = expandedRowId === item.id;
                    return (
                      <Fragment key={item.id}>
                        <tr
                          onClick={() => handleRowClick(item)}
                          className="hover:bg-primary-50/40 transition-colors cursor-pointer"
                          title="کلیک برای مقایسه قیمت در فروشگاه‌ها"
                        >
                          <td className="px-6 py-4 font-bold text-primary-700 flex items-center gap-2">
                            {isExpanded ? <ChevronUpIcon className="h-4 w-4 text-secondary-600" /> : <ChevronDownIcon className="h-4 w-4 text-slate-400" />}
                            {item.product_name}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{item.product_unit_name}</td>
                          <td className="px-6 py-4 text-slate-600">{item.union_name}</td>
                          <td className="px-6 py-4 text-slate-500">{item.city_name}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {formatPriceWithUnit(item.price)}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {formatPriceWithUnit(item.min_allowed_price)}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {toJalali(item.effective_date)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {item.is_today ? (
                              <Badge variant="primary" dot>امروز</Badge>
                            ) : item.is_expired ? (
                              <Badge variant="default">منقضی</Badge>
                            ) : (
                              <Badge variant="success">فعال</Badge>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Store Comparison Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={8} className="px-8 py-6">
                              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-primary-700 text-sm">
                                    مقایسه قیمت «{item.product_name}» در فروشگاه‌های سطح شهر:
                                  </h4>
                                  <span className="text-xs text-slate-400">نرخ مصوب مرجع: {formatPriceWithUnit(item.price)}</span>
                                </div>

                                {isCompareLoading ? (
                                  <div className="text-center py-6 text-sm text-slate-400">در حال دریافت قیمت فروشگاه‌ها...</div>
                                ) : storeComparisons.length === 0 ? (
                                  <div className="text-center py-6 text-sm text-slate-400">قیمتی توسط فروشگاه‌ها برای این محصول ثبت نشده است.</div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead className="bg-slate-100 text-slate-600 uppercase">
                                        <tr>
                                          <th className="p-3 text-right">فروشگاه</th>
                                          <th className="p-3 text-right">آدرس</th>
                                          <th className="p-3 text-right">قیمت فروشگاه</th>
                                          <th className="p-3 text-right">تخفیف نسبت به مصوب</th>
                                          <th className="p-3 text-center">وضعیت رعایت نرخ</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {storeComparisons.map((store) => (
                                          <tr key={store.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-semibold text-slate-800">{store.store_name}</td>
                                            <td className="p-3 text-slate-500">{store.store_address}</td>
                                            <td className="p-3 font-bold text-slate-900">{formatPriceWithUnit(store.price)}</td>
                                            <td className="p-3 text-green-600 font-medium">
                                              {store.discount_percent > 0 ? `${store.discount_percent}٪ تخفیف` : "بدون تخفیف"}
                                            </td>
                                            <td className="p-3 text-center">
                                              {store.is_compliant ? (
                                                <Badge variant="success">مجاز (مورد تایید)</Badge>
                                              ) : (
                                                <Badge variant="danger" icon={<ExclamationTriangleIcon className="h-3.5 w-3.5" />}>
                                                  گران‌فروشی
                                                </Badge>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
