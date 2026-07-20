"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  BuildingStorefrontIcon,
  BuildingOffice2Icon,
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { formatPriceWithUnit } from "@/utils/number.utils";
import { geographyService } from "@/features/geography/services/geography.service";
import { pricingService } from "@/features/pricing/services/pricing.service";
import { cmsService } from "@/features/cms/services/cms.service";
import { extractArray } from "@/utils/api.utils";
import type { OfficialPrice } from "@/features/pricing/types/pricing.types";
import type { BlogListItem, Slider } from "@/features/cms/types/cms.types";

export default function HomePage() {
  const router = useRouter();

  // فیلترهای جستجوی سریع
  const [provinces, setProvinces]   = useState<SelectOption[]>([]);
  const [cities, setCities]         = useState<SelectOption[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedCity, setSelectedCity]         = useState<string>("");
  const [productSearch, setProductSearch]       = useState<string>("");

  // داده‌های صفحه
  const [todayPrices, setTodayPrices] = useState<OfficialPrice[]>([]);
  const [sliders, setSliders]         = useState<Slider[]>([]);
  const [blogs, setBlogs]             = useState<BlogListItem[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  // لود اولیه استان‌ها و اطلاعات عمومی
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [provRes, priceRes, sliderRes, blogRes] = await Promise.all([
          geographyService.getProvinces(),
          pricingService.getTodayOfficialPrices({ page_size: 5 }).catch(() => ({ data: [] })),
          cmsService.getSliders().catch(() => ({ data: [] })),
          cmsService.getBlogs({ page_size: 3 }).catch(() => ({ data: [] })),
        ]);

        setProvinces(
          extractArray(provRes.data).map((p: any) => ({
            value: p.id,
            label: p.name,
          }))
        );

        setTodayPrices(extractArray<OfficialPrice>(priceRes.data));
        setSliders(extractArray<Slider>(sliderRes.data));
        setBlogs(extractArray<BlogListItem>(blogRes.data));
      } catch (err) {
        console.error("Error loading initial data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // لود شهرها با تغییر استان
  useEffect(() => {
    if (!selectedProvince) {
      setCities([]);
      setSelectedCity("");
      return;
    }
    geographyService
      .getProvinceCities(Number(selectedProvince))
      .then((res) => {
        const citiesList = extractArray(res.data);
        setCities(
          citiesList.map((c: any) => ({
            value: c.id,
            label: c.name,
          }))
        );
      })
      .catch(() => setCities([]));
  }, [selectedProvince]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedCity) params.set("city", selectedCity);
    if (selectedProvince) params.set("province", selectedProvince);
    if (productSearch) params.set("search", productSearch);
    router.push(`/prices?${params.toString()}`);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* HERO SECTION */}
      <section className="relative bg-primary-700 text-white overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-400 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text & CTAs */}
            <div className="space-y-6 text-center lg:text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-secondary-400 text-xs font-semibold backdrop-blur-sm">
                <ShieldCheckIcon className="h-4 w-4" />
                سامانه رسمی نظارت و پایش قیمت کشور
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-white">
                شفافیت قیمت‌ها، <br />
                <span style={{ color: "#deb94a" }}>حق قانونی شهروندان</span>
              </h1>

              <p className="text-primary-200 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
                قیمت مصوب کالاهای اساسی را هر روز صبح بررسی کنید و در صورت مشاهده گران‌فروشی، به آسانی ثبت شکایت کنید.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                <Link href="/prices">
                  <Button size="lg" className="bg-secondary-600 hover:bg-secondary-700 text-white">
                    <CurrencyDollarIcon className="h-5 w-5 ml-1" />
                    مشاهده قیمت‌های امروز
                  </Button>
                </Link>
                <Link href="/complaints/new">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary-700">
                    ثبت شکایت گران‌فروشی
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Search Box (Card) */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-800 border border-slate-100">
              <h3 className="text-lg font-bold text-primary-700 mb-4 flex items-center gap-2">
                <MagnifyingGlassIcon className="h-5 w-5 text-secondary-600" />
                جستجوی سریع قیمت کالا
              </h3>

              <form onSubmit={handleSearch} className="space-y-4">
                <Select
                  label="استان"
                  placeholder="انتخاب استان..."
                  options={provinces}
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                />

                <Select
                  label="شهر"
                  placeholder={selectedProvince ? "انتخاب شهر..." : "ابتدا استان را انتخاب کنید"}
                  options={cities}
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={!selectedProvince}
                />

                <Input
                  label="نام محصول"
                  placeholder="مثال: مرغ، گوشت، برنج..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />

                <Button type="submit" fullWidth size="lg">
                  جستجوی قیمت کالاها
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="فروشگاه‌های فعال"
            value="۱,۴۲۰"
            suffix="واحد"
            icon={<BuildingStorefrontIcon className="h-6 w-6" />}
            variant="primary"
          />
          <StatCard
            title="اتحادیه‌های صنفی"
            value="۸۵"
            suffix="اتحادیه"
            icon={<BuildingOffice2Icon className="h-6 w-6" />}
            variant="secondary"
          />
          <StatCard
            title="قیمت‌های مصوب امروز"
            value="۳۲۰"
            suffix="کالا"
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
            variant="success"
          />
          <StatCard
            title="شکایات بررسی‌شده"
            value="۹۸٪"
            icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
            variant="warning"
          />
        </div>
      </section>

      {/* TODAY'S PRICES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-primary-700">آخرین قیمت‌های مصوب</h2>
            <p className="text-sm text-slate-500 mt-1">نرخ مصوب اعلامی اتحادیه‌ها برای امروز</p>
          </div>
          <Link href="/prices">
            <Button variant="outline" size="sm">
              مشاهده همه قیمت‌ها
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-right">محصول</th>
                  <th className="px-6 py-3.5 text-right">اتحادیه</th>
                  <th className="px-6 py-3.5 text-right">شهر</th>
                  <th className="px-6 py-3.5 text-right">قیمت مصوب</th>
                  <th className="px-6 py-3.5 text-right">حداقل مجاز (۸۰٪)</th>
                  <th className="px-6 py-3.5 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {todayPrices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      {isLoading ? "در حال بارگذاری..." : "قیمتی برای امروز ثبت نشده است."}
                    </td>
                  </tr>
                ) : (
                  todayPrices.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary-700">
                        {item.product_name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{item.union_name}</td>
                      <td className="px-6 py-4 text-slate-500">{item.city_name}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {formatPriceWithUnit(item.price)}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatPriceWithUnit(item.min_allowed_price)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="success" dot>مصوب امروز</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* STEPS GUIDE */}
      <section className="bg-slate-100/70 py-16 border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-primary-700 mb-3">سامانه چگونه کار می‌کند؟</h2>
            <p className="text-sm text-slate-500">راهنمای ساده استفاده از سامانه نظارت بر قیمت کالا برای شهروندان</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "۰۱", title: "جستجوی کالا", desc: "شهر و محصول مورد نظر خود را جستجو کنید تا نرخ مصوب را ببینید." },
              { step: "۰۲", title: "بررسی قیمت فروشگاه", desc: "قیمت فروشگاه را با نرخ مصوب مقایسه کنید (تا ۲۰٪ تخفیف مجاز است)." },
              { step: "۰۳", title: "ثبت شکایت", desc: "اگر گران‌فروشی دیدید، فرم شکایت را همراه با مدرک ثبت کنید." },
              { step: "۰۴", title: "پیگیری نتیجه", desc: "با کد پیگیری UUID وضعیت رسیدگی بازرسان را دنبال کنید." },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 border border-slate-100 shadow-card relative">
                <span className="text-3xl font-black text-primary-200/80 absolute top-4 left-4">
                  {item.step}
                </span>
                <h3 className="text-base font-bold text-primary-700 mb-2 mt-2">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LATEST BLOGS */}
      {blogs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-primary-700">اخبار و اطلاعیه‌ها</h2>
              <p className="text-sm text-slate-500 mt-1">آخرین بخشنامه‌ها و اطلاعیه‌های اتاق اصناف و استانداری</p>
            </div>
            <Link href="/blogs">
              <Button variant="outline" size="sm">
                همه اخبار
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <Link key={blog.id} href={`/blogs/${blog.slug}`} className="card card-hover flex flex-col overflow-hidden">
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-700">
                        {blog.category_name}
                      </span>
                      <span className="text-xs text-slate-400">{blog.published_at || ""}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-2 line-clamp-2">
                      {blog.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {blog.summary}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-xs font-medium text-primary-600">
                    <span>مطالعه کامل خبر</span>
                    <ArrowLeftIcon className="h-3.5 w-3.5 mr-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8"
          style={{ background: "linear-gradient(135deg, #0f2347 0%, #1b3a6b 50%, #2e6db4 100%)" }}
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl" />

          <div className="relative z-10 space-y-3 text-center md:text-right max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold">
              <ExclamationTriangleIcon className="h-4 w-4" />
              مبارزه با گران‌فروشی
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
              اگر گران‌فروشی دیدید، بی‌تفاوت نگذرید!
            </h2>
            <p className="text-primary-200 text-sm leading-relaxed">
              با ثبت شکایت در کمتر از ۲ دقیقه، بازرسان اصناف و استانداری را مطلع کنید تا با متخلفان برخورد قانونی شود.
            </p>
          </div>

          <div className="relative z-10 flex-shrink-0">
            <Link href="/complaints/new">
              <Button size="lg" className="bg-secondary-600 hover:bg-secondary-700 text-white shadow-lg px-8 py-4 text-base">
                ثبت شکایت فوری
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}