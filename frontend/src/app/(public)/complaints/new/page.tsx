"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BuildingStorefrontIcon,
  CubeIcon,
  CurrencyDollarIcon,
  PaperClipIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentCheckIcon,
  XMarkIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import apiClient    from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { parseApiError, extractArray } from "@/utils/error.utils";
import { formatPrice } from "@/utils/number.utils";
import { toEnglishNumber } from "@/utils/number.utils";
import { cn } from "@/lib/cn";
import toast from "react-hot-toast";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
interface Store {
  id:         number;
  name:       string;
  union_name: string;
  city_name:  string;
  address:    string;
  status:     string;
}

interface Product {
  id:           number;
  name:         string;
  unit_symbol:  string;
  category_name:string;
}

interface OfficialPrice {
  id:                 number;
  price:              number;
  min_allowed_price:  number;
  price_formatted:    string;
  min_price_formatted:string;
  product_name:       string;
  union_name:         string;
  is_today:           boolean;
}

interface FormData {
  store:          Store | null;
  product:        Product | null;
  officialPrice:  OfficialPrice | null;
  title:          string;
  description:    string;
  price_reported: string;
  price_proof:    File | null;
}

const STEPS = [
  { id: 1, label: "انتخاب فروشگاه و محصول", icon: BuildingStorefrontIcon },
  { id: 2, label: "جزئیات شکایت",           icon: DocumentCheckIcon    },
  { id: 3, label: "مدرک (اختیاری)",         icon: PaperClipIcon        },
  { id: 4, label: "تایید نهایی",            icon: CheckCircleIcon      },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function ComplaintNewPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    store:          null,
    product:        null,
    officialPrice:  null,
    title:          "",
    description:    "",
    price_reported: "",
    price_proof:    null,
  });

  // search
  const [storeSearch,   setStoreSearch]   = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [stores,        setStores]        = useState<Store[]>([]);
  const [products,      setProducts]      = useState<Product[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingProducts,setLoadingProducts]= useState(false);

  // submit
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [resultUUID, setResultUUID] = useState("");

  // errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Search stores ──────────────────────────────────────────────────────────
  const searchStores = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setStores([]); return; }
    setLoadingStores(true);
    try {
      const r = await apiClient.get(ENDPOINTS.STORES.LIST, {
        params: { search: q, status: "active", page_size: 10 },
      });
      const d = r.data?.data ?? r.data;
      setStores(extractArray<Store>(d));
    } catch { setStores([]); }
    finally { setLoadingStores(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchStores(storeSearch), 400);
    return () => clearTimeout(t);
  }, [storeSearch, searchStores]);

  // ── Search products ────────────────────────────────────────────────────────
  const searchProducts = useCallback(async (q: string) => {
    setLoadingProducts(true);
    try {
      const params: Record<string, unknown> = { page_size: 20 };
      if (q) params.search = q;
      const r = await apiClient.get(ENDPOINTS.PRODUCTS.LIST, { params });
      const d = r.data?.data ?? r.data;
      setProducts(extractArray<Product>(d));
    } catch { setProducts([]); }
    finally { setLoadingProducts(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(productSearch), 400);
    return () => clearTimeout(t);
  }, [productSearch, searchProducts]);

  // load products on mount
  useEffect(() => { searchProducts(""); }, [searchProducts]);

  // ── Fetch official price when store+product selected ──────────────────────
  useEffect(() => {
    if (!form.store || !form.product) return;
    const fetchPrice = async () => {
      try {
        const r = await apiClient.get(ENDPOINTS.PRICING.OFFICIAL_PRICES_TODAY, {
          params: { product: form.product!.id },
        });
        const d    = r.data?.data ?? r.data;
        const list = extractArray<OfficialPrice>(d);
        if (list.length > 0) {
          setForm((p) => ({ ...p, officialPrice: list[0] }));
        } else {
          setForm((p) => ({ ...p, officialPrice: null }));
        }
      } catch {
        setForm((p) => ({ ...p, officialPrice: null }));
      }
    };
    fetchPrice();
  }, [form.store?.id, form.product?.id]);

  // ── Validate step ──────────────────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!form.store)   errs.store   = "انتخاب فروشگاه الزامی است";
      if (!form.product) errs.product = "انتخاب محصول الزامی است";
    }
    if (s === 2) {
      if (!form.title.trim() || form.title.length < 5)
        errs.title = "عنوان شکایت حداقل ۵ کاراکتر باشد";
      if (!form.description.trim() || form.description.length < 20)
        errs.description = "شرح شکایت حداقل ۲۰ کاراکتر باشد";
      const priceNum = Number(toEnglishNumber(form.price_reported));
      if (!form.price_reported || isNaN(priceNum) || priceNum <= 0)
        errs.price_reported = "قیمت پرداختی را به درستی وارد کنید";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) setStep((s) => s + 1);
  };

  const goPrev = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors({});
    try {
      const priceNum = Number(toEnglishNumber(form.price_reported));

      // ✅ FIX: ارسال با FormData (برای پشتیبانی از فایل)
      const fd = new FormData();
      fd.append("store", String(form.store!.id));
      fd.append("product", String(form.product!.id));
      fd.append("title", form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("price_reported", String(priceNum));
      
      // ✅ فقط اگر فایل وجود داشت اضافه کن
      if (form.price_proof) {
        fd.append("price_proof", form.price_proof);
      }

      const r = await apiClient.post(ENDPOINTS.COMPLAINTS.LIST, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = r.data?.data ?? r.data;
      const uuid = data?.uuid ?? data?.id ?? "unknown";
      setResultUUID(String(uuid));
      setSubmitted(true);
      toast.success("شکایت شما با موفقیت ثبت شد");
    } catch (err: any) {
      console.error("❌ Submit Error:", err);
      console.error("Response:", err.response?.data);
      
      const msg = parseApiError(err);
      setErrors({ submit: msg });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Price calculations ─────────────────────────────────────────────────────
  const priceNum       = Number(toEnglishNumber(form.price_reported || "0"));
  const officialPrice  = form.officialPrice?.price ?? 0;
  const minPrice       = form.officialPrice?.min_allowed_price ?? 0;
  const isOverpriced   = officialPrice > 0 && priceNum > officialPrice;
  const isUnderMin     = officialPrice > 0 && priceNum < minPrice && priceNum > 0;
  const violationAmt   = isOverpriced ? priceNum - officialPrice : 0;

  // ─────────────────────────────────────────────────────────────────────────
  // SUCCESS STATE
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            {/* Success icon */}
            <div className="relative inline-flex mb-6">
              <div className="h-24 w-24 rounded-full bg-green-100 flex items-center
                               justify-center">
                <CheckCircleSolid className="h-14 w-14 text-green-500" />
              </div>
              <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-green-500
                               flex items-center justify-center animate-bounce">
                <span className="text-white text-lg">✓</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              شکایت ثبت شد!
            </h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              شکایت شما با موفقیت در سامانه ثبت شد و به کارشناسان ارجاع داده می‌شود.
            </p>

            {/* UUID */}
            <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 mb-6">
              <p className="text-xs text-primary-500 mb-1 font-medium">
                کد پیگیری شکایت
              </p>
              <p className="font-mono text-sm font-bold text-primary-800 break-all">
                {resultUUID}
              </p>
            </div>

            {/* Copy button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(resultUUID);
                toast.success("کد پیگیری کپی شد");
              }}
              className="w-full mb-3 py-3 bg-primary-700 text-white rounded-xl
                         font-bold text-sm hover:bg-primary-800 transition-colors"
            >
              کپی کد پیگیری
            </button>

            <Link href={`/complaints/track/${resultUUID}`}>
              <button className="w-full py-3 border-2 border-primary-200 text-primary-700
                                  rounded-xl font-bold text-sm hover:bg-primary-50
                                  transition-colors mb-3">
                رهگیری شکایت
              </button>
            </Link>

            <Link href="/">
              <button className="w-full py-2.5 text-slate-500 text-sm hover:text-slate-700
                                  transition-colors">
                بازگشت به صفحه اصلی
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN FORM
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-slate-50
                     py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-primary-700 rounded-2xl mb-4">
            <ShieldExclamationIcon className="h-8 w-8 text-secondary-400" />
          </div>
          <h1 className="text-2xl font-bold text-primary-800">ثبت شکایت گران‌فروشی</h1>
          <p className="text-slate-500 text-sm mt-1">
            گزارش تخلف واحد صنفی به بازرسان مراجع نظارتی
          </p>
        </div>

        {/* ── Stepper ── */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => {
            const isDone    = step > s.id;
            const isCurrent = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    "h-10 w-10 rounded-full border-2 flex items-center justify-center",
                    "transition-all duration-300 font-bold text-sm",
                    isDone
                      ? "border-green-500 bg-green-500 text-white"
                      : isCurrent
                      ? "border-primary-600 bg-primary-600 text-white shadow-lg shadow-primary-200"
                      : "border-slate-300 bg-white text-slate-400",
                  )}>
                    {isDone ? "✓" : s.id}
                  </div>
                  <span className={cn(
                    "text-[10px] font-semibold text-center leading-tight max-w-[60px]",
                    isCurrent ? "text-primary-700" : isDone ? "text-green-600" : "text-slate-400"
                  )}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-1 rounded-full transition-all duration-300",
                    step > s.id ? "bg-green-400" : "bg-slate-200"
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Card ── */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Step header */}
          <div className="bg-gradient-to-r from-primary-700 to-primary-600 px-6 py-4">
            <div className="flex items-center gap-3">
              {React.createElement(STEPS[step - 1].icon, {
                className: "h-5 w-5 text-secondary-400 flex-shrink-0"
              })}
              <h2 className="text-white font-bold">
                مرحله {step}: {STEPS[step - 1].label}
              </h2>
            </div>
          </div>

          <div className="p-6 space-y-5">

            {/* ════════════════════════════════════════════════════
                STEP 1 — Store & Product selection
                ════════════════════════════════════════════════════ */}
            {step === 1 && (
              <>
                {/* Store search */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">
                    فروشگاه متخلف
                    <span className="text-red-500 mr-1">*</span>
                  </label>

                  {form.store ? (
                    <SelectedCard
                      icon={<BuildingStorefrontIcon className="h-5 w-5 text-primary-600" />}
                      title={form.store.name}
                      subtitle={`${form.store.union_name} · ${form.store.city_name}`}
                      detail={form.store.address}
                      onClear={() => {
                        setForm((p) => ({ ...p, store: null, officialPrice: null }));
                        setStoreSearch("");
                      }}
                    />
                  ) : (
                    <SearchInput
                      value={storeSearch}
                      onChange={setStoreSearch}
                      placeholder="نام فروشگاه را جستجو کنید..."
                      isLoading={loadingStores}
                    />
                  )}

                  {/* Store results */}
                  {!form.store && stores.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden
                                     shadow-sm divide-y divide-slate-50">
                      {stores.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setForm((p) => ({ ...p, store: s }));
                            setStoreSearch("");
                            setErrors((e) => ({ ...e, store: "" }));
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3
                                     hover:bg-primary-50 transition-colors text-right"
                        >
                          <div className="h-8 w-8 rounded-lg bg-primary-50
                                           flex items-center justify-center flex-shrink-0">
                            <BuildingStorefrontIcon className="h-4 w-4 text-primary-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 truncate text-sm">
                              {s.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {s.union_name} · {s.city_name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {!form.store && storeSearch.length >= 2 && !loadingStores && stores.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3">
                      فروشگاهی یافت نشد
                    </p>
                  )}
                  {errors.store && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                      {errors.store}
                    </p>
                  )}
                </div>

                {/* Product search */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">
                    محصول
                    <span className="text-red-500 mr-1">*</span>
                  </label>

                  {form.product ? (
                    <SelectedCard
                      icon={<CubeIcon className="h-5 w-5 text-secondary-600" />}
                      title={form.product.name}
                      subtitle={`${form.product.category_name} · واحد: ${form.product.unit_symbol}`}
                      onClear={() => {
                        setForm((p) => ({ ...p, product: null, officialPrice: null }));
                        setProductSearch("");
                      }}
                    />
                  ) : (
                    <SearchInput
                      value={productSearch}
                      onChange={setProductSearch}
                      placeholder="نام محصول را جستجو کنید..."
                      isLoading={loadingProducts}
                    />
                  )}

                  {/* Product results */}
                  {!form.product && products.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden
                                     shadow-sm divide-y divide-slate-50 max-h-48 overflow-y-auto">
                      {products.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setForm((f) => ({ ...f, product: p }));
                            setProductSearch("");
                            setErrors((e) => ({ ...e, product: "" }));
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3
                                     hover:bg-secondary-50 transition-colors text-right"
                        >
                          <div className="h-8 w-8 rounded-lg bg-secondary-50
                                           flex items-center justify-center flex-shrink-0">
                            <CubeIcon className="h-4 w-4 text-secondary-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 truncate text-sm">
                              {p.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {p.category_name} · {p.unit_symbol}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.product && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                      {errors.product}
                    </p>
                  )}
                </div>

                {/* Official price info */}
                {form.store && form.product && (
                  <OfficialPriceInfo price={form.officialPrice} />
                )}
              </>
            )}

            {/* ════════════════════════════════════════════════════
                STEP 2 — Complaint details
                ════════════════════════════════════════════════════ */}
            {step === 2 && (
              <>
                {/* Summary */}
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl">
                  <InfoChip
                    icon={<BuildingStorefrontIcon className="h-3.5 w-3.5" />}
                    text={form.store?.name ?? ""}
                  />
                  <InfoChip
                    icon={<CubeIcon className="h-3.5 w-3.5" />}
                    text={form.product?.name ?? ""}
                  />
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-700">
                    عنوان شکایت
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="مثال: فروش مرغ گران‌تر از نرخ مصوب"
                    maxLength={200}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-sm transition-all",
                      "focus:outline-none focus:ring-2",
                      errors.title
                        ? "border-red-400 focus:ring-red-100"
                        : "border-slate-200 focus:ring-primary-100 focus:border-primary-400"
                    )}
                  />
                  {errors.title && (
                    <p className="text-xs text-red-500">{errors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-700">
                    شرح کامل شکایت
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="لطفاً شرح کاملی از تخلف را بنویسید. چه کالایی خریدید، چه قیمتی پرداختید و چه اتفاقی افتاد..."
                    rows={5}
                    maxLength={2000}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-sm transition-all resize-none",
                      "focus:outline-none focus:ring-2",
                      errors.description
                        ? "border-red-400 focus:ring-red-100"
                        : "border-slate-200 focus:ring-primary-100 focus:border-primary-400"
                    )}
                  />
                  <div className="flex justify-between">
                    {errors.description ? (
                      <p className="text-xs text-red-500">{errors.description}</p>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs text-slate-400">
                      {form.description.length}/2000
                    </p>
                  </div>
                </div>

                {/* Price reported */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-700">
                    قیمت پرداختی شما (ریال)
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                  <div className="relative">
                    <CurrencyDollarIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                                    h-5 w-5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.price_reported}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9۰-۹]/g, "");
                        setForm((p) => ({ ...p, price_reported: val }));
                      }}
                      placeholder="مثال: 450000"
                      className={cn(
                        "w-full pr-10 pl-4 py-3 rounded-xl border text-sm transition-all",
                        "focus:outline-none focus:ring-2",
                        errors.price_reported
                          ? "border-red-400 focus:ring-red-100"
                          : isOverpriced
                          ? "border-red-300 bg-red-50 focus:ring-red-100"
                          : isUnderMin
                          ? "border-amber-300 bg-amber-50 focus:ring-amber-100"
                          : "border-slate-200 focus:ring-primary-100 focus:border-primary-400"
                      )}
                    />
                  </div>

                  {/* Price validation feedback */}
                  {form.officialPrice && priceNum > 0 && (
                    <PriceFeedback
                      priceNum={priceNum}
                      officialPrice={officialPrice}
                      minPrice={minPrice}
                      violationAmt={violationAmt}
                      isOverpriced={isOverpriced}
                      isUnderMin={isUnderMin}
                    />
                  )}

                  {errors.price_reported && (
                    <p className="text-xs text-red-500">{errors.price_reported}</p>
                  )}
                </div>

                {/* Helper info */}
                {!form.officialPrice && (
                  <div className="flex gap-2 p-3 bg-blue-50 rounded-xl">
                    <InformationCircleIcon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      قیمت مصوب این محصول در سیستم ثبت نشده. مبلغ پرداختی خود را وارد کنید.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ════════════════════════════════════════════════════
                STEP 3 — Attachment
                ════════════════════════════════════════════════════ */}
            {step === 3 && (
              <>
                <div className="flex gap-2 p-3 bg-blue-50 rounded-xl mb-2">
                  <InformationCircleIcon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    آپلود مدرک (تصویر فاکتور، رسید، یا عکس از قیمت‌گذاری) اختیاری است
                    اما به تسریع بررسی شکایت کمک می‌کند.
                  </p>
                </div>

                <FileDropzone
                  file={form.price_proof}
                  onChange={(f) => setForm((p) => ({ ...p, price_proof: f }))}
                />
              </>
            )}

            {/* ════════════════════════════════════════════════════
                STEP 4 — Review & Submit
                ════════════════════════════════════════════════════ */}
            {step === 4 && (
              <>
                <div className="space-y-3">
                  {/* Store */}
                  <ReviewRow
                    icon={<BuildingStorefrontIcon className="h-4 w-4 text-primary-600" />}
                    label="فروشگاه متخلف"
                    value={form.store?.name ?? "—"}
                    sub={`${form.store?.union_name} · ${form.store?.city_name}`}
                    bg="bg-primary-50"
                  />
                  {/* Product */}
                  <ReviewRow
                    icon={<CubeIcon className="h-4 w-4 text-secondary-600" />}
                    label="محصول"
                    value={form.product?.name ?? "—"}
                    bg="bg-secondary-50"
                  />
                  {/* Price */}
                  <ReviewRow
                    icon={<CurrencyDollarIcon className="h-4 w-4 text-red-500" />}
                    label="قیمت پرداختی شما"
                    value={`${formatPrice(priceNum)} ریال`}
                    bg={isOverpriced ? "bg-red-50" : "bg-slate-50"}
                    valueClass={isOverpriced ? "text-red-700 font-bold" : ""}
                  />

                  {/* Violation summary */}
                  {isOverpriced && form.officialPrice && (
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                        <p className="font-bold text-red-800 text-sm">گران‌فروشی تشخیص داده شد</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-red-400">قیمت مصوب</p>
                          <p className="font-bold text-red-700">
                            {formatPrice(officialPrice)} ریال
                          </p>
                        </div>
                        <div>
                          <p className="text-red-400">مبلغ اضافه‌دریافت</p>
                          <p className="font-bold text-red-700">
                            +{formatPrice(violationAmt)} ریال
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">عنوان شکایت</p>
                    <p className="text-sm font-semibold text-slate-800">{form.title}</p>
                  </div>

                  {/* Description preview */}
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">شرح شکایت</p>
                    <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
                      {form.description}
                    </p>
                  </div>

                  {/* Attachment */}
                  {form.price_proof && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl
                                     border border-green-200">
                      <CheckCircleSolid className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-green-800">
                          مدرک آپلود شده
                        </p>
                        <p className="text-xs text-green-600 truncate max-w-[200px]">
                          {form.price_proof.name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error */}
                {errors.submit && (
                  <div className="flex items-center gap-2 p-3 bg-red-50
                                   border border-red-200 rounded-xl">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">{errors.submit}</p>
                  </div>
                )}

                {/* Terms */}
                <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    با ثبت این شکایت تأیید می‌کنم که اطلاعات ارائه‌شده صحیح است
                    و مسئولیت ارائه اطلاعات نادرست را می‌پذیرم.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ── Navigation ── */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50
                           flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                onClick={goPrev}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm
                           font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <ArrowRightIcon className="h-4 w-4" />
                مرحله قبل
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm
                           font-bold bg-primary-700 hover:bg-primary-800 text-white
                           transition-colors shadow-sm hover:shadow"
              >
                مرحله بعد
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm
                           font-bold bg-green-600 hover:bg-green-700 text-white
                           transition-colors shadow-sm disabled:opacity-50
                           disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30
                                     border-t-white animate-spin" />
                    در حال ارسال...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4" />
                    ثبت نهایی شکایت
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SearchInput({
  value, onChange, placeholder, isLoading,
}: {
  value:       string;
  onChange:    (v: string) => void;
  placeholder: string;
  isLoading:   boolean;
}) {
  return (
    <div className="relative">
      <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2
                                       h-4 w-4 text-slate-400 pointer-events-none" />
      {isLoading && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full
                         border-2 border-primary-300 border-t-primary-600 animate-spin" />
      )}
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pr-9 pl-9 py-3 rounded-xl border border-slate-200 text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-100
                   focus:border-primary-400 bg-slate-50 transition-all"
      />
    </div>
  );
}

function SelectedCard({
  icon, title, subtitle, detail, onClear,
}: {
  icon:     React.ReactNode;
  title:    string;
  subtitle: string;
  detail?:  string;
  onClear:  () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-primary-50 border-2 border-primary-200
                     rounded-xl">
      <div className="h-10 w-10 rounded-xl bg-white border border-primary-200
                       flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-primary-900 truncate">{title}</p>
        <p className="text-xs text-primary-600 mt-0.5">{subtitle}</p>
        {detail && <p className="text-xs text-slate-500 mt-0.5 truncate">{detail}</p>}
      </div>
      <button
        onClick={onClear}
        className="p-1 rounded-lg text-primary-400 hover:text-red-500
                   hover:bg-red-50 transition-colors flex-shrink-0"
        aria-label="حذف انتخاب"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function OfficialPriceInfo({ price }: { price: OfficialPrice | null }) {
  if (!price) return (
    <div className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
      <InformationCircleIcon className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-slate-500">
        قیمت مصوب برای این محصول امروز ثبت نشده است.
      </p>
    </div>
  );

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
      <div className="flex items-center gap-2">
        <InformationCircleIcon className="h-4 w-4 text-blue-600" />
        <p className="text-xs font-bold text-blue-800">قیمت مصوب امروز</p>
        {price.is_today && (
          <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full font-bold">
            امروز
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-blue-500 mb-0.5">حداکثر مجاز</p>
          <p className="text-sm font-bold text-primary-700">
            {formatPrice(price.price)} ریال
          </p>
        </div>
        <div className="bg-white rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-blue-500 mb-0.5">حداقل مجاز</p>
          <p className="text-sm font-bold text-slate-700">
            {formatPrice(price.min_allowed_price)} ریال
          </p>
        </div>
      </div>
    </div>
  );
}

function PriceFeedback({
  priceNum, officialPrice, minPrice, violationAmt, isOverpriced, isUnderMin,
}: {
  priceNum:      number;
  officialPrice: number;
  minPrice:      number;
  violationAmt:  number;
  isOverpriced:  boolean;
  isUnderMin:    boolean;
}) {
  if (isOverpriced) return (
    <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
      <ExclamationTriangleIcon className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="text-xs text-red-700">
        <p className="font-bold mb-0.5">قیمت از حد مجاز بیشتر است!</p>
        <p>
          قیمت مصوب: {formatPrice(officialPrice)} ریال |
          اضافه: <span className="font-bold">+{formatPrice(violationAmt)} ریال</span>
        </p>
      </div>
    </div>
  );

  if (isUnderMin) return (
    <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
      <InformationCircleIcon className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-700">
        قیمت وارد شده ({formatPrice(priceNum)} ریال) کمتر از حداقل مجاز
        ({formatPrice(minPrice)} ریال) است.
      </p>
    </div>
  );

  return (
    <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
      <CheckCircleIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-green-700 font-semibold">
        قیمت در محدوده مجاز است.
      </p>
    </div>
  );
}

function FileDropzone({
  file, onChange,
}: {
  file:     File | null;
  onChange: (f: File | null) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  };

  return (
    <div>
      <label
        className={cn(
          "flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed",
          "cursor-pointer transition-all",
          dragging
            ? "border-primary-400 bg-primary-50"
            : "border-slate-300 bg-slate-50 hover:border-primary-300 hover:bg-primary-50/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="hidden"
          accept="image/*,.pdf"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <div className={cn(
          "p-3 rounded-full transition-colors",
          dragging ? "bg-primary-100" : "bg-white border border-slate-200"
        )}>
          <PaperClipIcon className={cn(
            "h-8 w-8 transition-colors",
            dragging ? "text-primary-600" : "text-slate-400"
          )} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">
            {dragging ? "رها کنید" : "فایل را بکشید یا کلیک کنید"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            PNG, JPG, PDF حداکثر ۵ مگابایت
          </p>
        </div>
      </label>

      {file && (
        <div className="mt-3 flex items-center gap-3 p-3 bg-green-50 border
                         border-green-200 rounded-xl">
          <CheckCircleSolid className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800 truncate">{file.name}</p>
            <p className="text-xs text-green-600">
              {(file.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            onClick={() => onChange(null)}
            className="p-1 text-green-400 hover:text-red-500 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function InfoChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white
                      border border-slate-200 rounded-full text-xs font-semibold
                      text-slate-700">
      {icon}
      {text}
    </span>
  );
}

function ReviewRow({
  icon, label, value, sub, bg, valueClass,
}: {
  icon:        React.ReactNode;
  label:       string;
  value:       string;
  sub?:        string;
  bg:          string;
  valueClass?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 p-4 rounded-xl", bg)}>
      <div className="h-9 w-9 rounded-xl bg-white border border-slate-200
                       flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className={cn("text-sm font-semibold text-slate-800 truncate", valueClass)}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}