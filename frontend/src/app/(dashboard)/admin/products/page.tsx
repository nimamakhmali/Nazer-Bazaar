"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Button }        from "@/components/ui/Button";
import { Badge }         from "@/components/ui/Badge";
import { Modal }         from "@/components/ui/Modal";
import { Input }         from "@/components/ui/Input";
import { Select }        from "@/components/ui/Select";
import { Toggle }        from "@/components/ui/Toggle";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState }    from "@/components/ui/EmptyState";
import { Pagination }    from "@/components/common/Pagination";
import { FileUpload }    from "@/components/common/FileUpload";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { parseApiError, extractArray, extractCount } from "@/utils/error.utils";
import toast             from "react-hot-toast";
import Image             from "next/image";
import Link              from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id:            number;
  name:          string;
  slug:          string;
  union:         number;
  union_name:    string;
  category:      number;
  category_name: string;
  unit:          number;
  unit_name:     string;
  unit_symbol:   string;
  brand:         string;
  image:         string | null;
  is_featured:   boolean;
  is_active:     boolean;
  barcode:       string | null;
}

interface Category { id: number; name: string; }
interface Unit     { id: number; name: string; symbol: string; }
interface Union    { id: number; name: string; }

interface ProductForm {
  union_id:    string;
  name:        string;
  category_id: string;
  unit_id:     string;
  description: string;
  brand:       string;
  origin:      string;
  barcode:     string;
  is_featured: boolean;
}

const DEFAULT_FORM: ProductForm = {
  union_id:    "",
  name:        "",
  category_id: "",
  unit_id:     "",
  description: "",
  brand:       "",
  origin:      "",
  barcode:     "",
  is_featured: false,
};

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminProductsPage() {
  const [products,    setProducts]    = useState<Product[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [units,       setUnits]       = useState<Unit[]>([]);
  const [unions,      setUnions]      = useState<Union[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);
  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState("");
  const [unionFilter, setUnionFilter] = useState("");

  const [showModal,  setShowModal]  = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selected,   setSelected]   = useState<Product | null>(null);
  const [form,       setForm]       = useState<ProductForm>(DEFAULT_FORM);
  const [saving,     setSaving]     = useState(false);
  const [importFile, setImportFile] = useState<File[]>([]);
  const [importing,  setImporting]  = useState(false);
  const [exporting,  setExporting]  = useState(false);

  const isEdit = !!selected;

  // ── بارگذاری داده‌های پایه ────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      apiClient.get(ENDPOINTS.PRODUCTS.CATEGORIES, { params: { page_size: 200 } }),
      apiClient.get(ENDPOINTS.PRODUCTS.UNITS),
      apiClient.get(ENDPOINTS.ORGANIZATIONS.UNIONS, { params: { page_size: 200 } }),
    ])
      .then(([catRes, unitRes, unionRes]) => {
        const catData   = catRes.data?.data   ?? catRes.data;
        const unitData  = unitRes.data?.data  ?? unitRes.data;
        const unionData = unionRes.data?.data ?? unionRes.data;
        setCategories(extractArray<Category>(catData));
        setUnits(extractArray<Unit>(unitData));
        setUnions(extractArray<Union>(unionData));
      })
      .catch(() => {});
  }, []);

  // ── بارگذاری محصولات ─────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 12 };
      if (search)      params.search   = search;
      if (catFilter)   params.category = catFilter;
      if (unionFilter) params.union    = unionFilter;

      const res  = await apiClient.get(ENDPOINTS.PRODUCTS.LIST, { params });
      const data = res.data?.data ?? res.data;
      setProducts(extractArray<Product>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 12) || 1);
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, search, catFilter, unionFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [search, catFilter, unionFilter]);

  // ── باز کردن مودال ────────────────────────────────────────────────────────
  const openCreate = () => {
    setSelected(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setSelected(p);
    setForm({
      union_id:    String(p.union),
      name:        p.name,
      category_id: String(p.category),
      unit_id:     String(p.unit),
      description: "",
      brand:       p.brand || "",
      origin:      "",
      barcode:     p.barcode || "",
      is_featured: p.is_featured,
    });
    setShowModal(true);
  };

  // ── ذخیره ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.union_id) {
      toast.error("انتخاب اتحادیه الزامی است");
      return;
    }
    if (!form.name.trim() || !form.category_id || !form.unit_id) {
      toast.error("نام، دسته‌بندی و واحد الزامی است");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        union_id:    Number(form.union_id),
        name:        form.name,
        category_id: Number(form.category_id),
        unit_id:     Number(form.unit_id),
        description: form.description,
        brand:       form.brand,
        origin:      form.origin,
        barcode:     form.barcode || undefined,
        is_featured: form.is_featured,
      };

      if (isEdit && selected) {
        await apiClient.patch(ENDPOINTS.PRODUCTS.DETAIL(selected.id), payload);
        toast.success("محصول ویرایش شد");
      } else {
        await apiClient.post(ENDPOINTS.PRODUCTS.LIST, payload);
        toast.success("محصول جدید ایجاد شد");
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // ── Export / Import ───────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get(ENDPOINTS.PRODUCTS.EXPORT, {
        responseType: "blob",
      });
      const url      = URL.createObjectURL(res.data);
      const a        = document.createElement("a");
      a.href         = url;
      a.download     = "products.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("فایل Excel دانلود شد");
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile[0]) { toast.error("فایل را انتخاب کنید"); return; }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile[0]);
      formData.append("update_existing", "true");
      await apiClient.post(ENDPOINTS.PRODUCTS.IMPORT, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("محصولات از Excel وارد شدند");
      setShowImport(false);
      setImportFile([]);
      fetchProducts();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res  = await apiClient.get(ENDPOINTS.PRODUCTS.IMPORT_TEMPLATE, {
        responseType: "blob",
      });
      const url      = URL.createObjectURL(res.data);
      const a        = document.createElement("a");
      a.href         = url;
      a.download     = "products_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(parseApiError(err));
    }
  };

  // ── Options ───────────────────────────────────────────────────────────────
  const unionFilterOptions = [
    { value: "", label: "همه اتحادیه‌ها" },
    ...unions.map((u) => ({ value: u.id, label: u.name })),
  ];
  const categoryFilterOptions = [
    { value: "", label: "همه دسته‌بندی‌ها" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];
  const unionSelectOptions    = unions.map((u) => ({ value: u.id, label: u.name }));
  const categorySelectOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const unitOptions           = units.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.symbol})`,
  }));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت محصولات"
        subtitle={`${totalCount.toLocaleString("fa-IR")} محصول در سامانه`}
        breadcrumbs={[{ label: "ادمین" }, { label: "محصولات" }]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
            >
              قالب Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImport(true)}
              leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
            >
              ورود از Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              isLoading={exporting}
              leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
            >
              خروجی Excel
            </Button>
            <Button
              onClick={openCreate}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              محصول جدید
            </Button>
          </div>
        }
      />

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="جستجوی محصول..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 bg-slate-50 transition-all"
            />
          </div>

          {/* فیلتر اتحادیه */}
          <select
            value={unionFilter}
            onChange={(e) => setUnionFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 bg-white min-w-[180px]"
          >
            {unionFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* فیلتر دسته‌بندی */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 bg-white min-w-[180px]"
          >
            {categoryFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <Link href="/admin/products/categories">
            <Button variant="ghost" size="md">مدیریت دسته‌بندی‌ها</Button>
          </Link>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} cols={7} />
        ) : products.length === 0 ? (
          <EmptyState
            title="محصولی یافت نشد"
            description="محصول جدید اضافه کنید یا از Excel وارد کنید"
            action={
              <Button
                onClick={openCreate}
                leftIcon={<PlusIcon className="h-4 w-4" />}
              >
                محصول جدید
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  {[
                    "محصول",
                    "اتحادیه",
                    "دسته‌بندی",
                    "واحد",
                    "ویژه",
                    "وضعیت",
                    "عملیات",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* محصول */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <CubeIcon className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {product.name}
                          </p>
                          {product.brand && (
                            <p className="text-xs text-slate-400">
                              {product.brand}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* اتحادیه */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100">
                        {product.union_name}
                      </span>
                    </td>

                    {/* دسته‌بندی */}
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-600">
                        {product.category_name}
                      </span>
                    </td>

                    {/* واحد */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                        {product.unit_symbol}
                      </span>
                    </td>

                    {/* ویژه */}
                    <td className="px-5 py-3.5">
                      {product.is_featured ? (
                        <CheckCircleIcon className="h-5 w-5 text-amber-500" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-slate-200" />
                      )}
                    </td>

                    {/* وضعیت */}
                    <td className="px-5 py-3.5">
                      {product.is_active ? (
                        <Badge variant="success" dot size="sm">فعال</Badge>
                      ) : (
                        <Badge variant="danger" dot size="sm">غیرفعال</Badge>
                      )}
                    </td>

                    {/* عملیات */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => openEdit(product)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="ویرایش"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              نمایش {products.length} از {totalCount.toLocaleString("fa-IR")} محصول
            </p>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* ── Modal Create / Edit ───────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEdit ? "ویرایش محصول" : "محصول جدید"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              انصراف
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              {isEdit ? "ذخیره تغییرات" : "ایجاد محصول"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* اتحادیه - فیلد اول و اجباری */}
          <Select
            label="اتحادیه"
            placeholder="انتخاب اتحادیه..."
            options={unionSelectOptions}
            value={form.union_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, union_id: e.target.value }))
            }
            required
          />

          <Input
            label="نام محصول"
            placeholder="مثال: برنج ایرانی درجه یک"
            value={form.name}
            onChange={(e) =>
              setForm((p) => ({ ...p, name: e.target.value }))
            }
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="دسته‌بندی"
              placeholder="انتخاب دسته..."
              options={categorySelectOptions}
              value={form.category_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, category_id: e.target.value }))
              }
              required
            />
            <Select
              label="واحد اندازه‌گیری"
              placeholder="انتخاب واحد..."
              options={unitOptions}
              value={form.unit_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, unit_id: e.target.value }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="برند"
              placeholder="نام برند"
              value={form.brand}
              onChange={(e) =>
                setForm((p) => ({ ...p, brand: e.target.value }))
              }
            />
            <Input
              label="کشور مبدا"
              placeholder="ایران"
              value={form.origin}
              onChange={(e) =>
                setForm((p) => ({ ...p, origin: e.target.value }))
              }
            />
          </div>

          <Input
            label="بارکد"
            placeholder="بارکد محصول"
            value={form.barcode}
            onChange={(e) =>
              setForm((p) => ({ ...p, barcode: e.target.value }))
            }
            dir="ltr"
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              توضیحات
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="توضیحات محصول..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
            />
          </div>

          <Toggle
            checked={form.is_featured}
            onChange={(v) => setForm((p) => ({ ...p, is_featured: v }))}
            label="محصول ویژه"
            description="محصول ویژه در صفحه اصلی نمایش داده می‌شود"
          />
        </div>
      </Modal>

      {/* ── Modal Import ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        title="ورود محصولات از Excel"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowImport(false)}>
              انصراف
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
            >
              دانلود قالب
            </Button>
            <Button onClick={handleImport} isLoading={importing}>
              وارد کردن
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            ابتدا قالب Excel را دانلود کنید، محصولات را وارد کنید، سپس
            فایل را آپلود کنید.
            <br />
            <span className="font-semibold mt-1 block">
              توجه: ستون اتحادیه (union_id) در فایل الزامی است.
            </span>
          </div>
          <FileUpload
            onFilesChange={setImportFile}
            accept={{
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                [".xlsx"],
            }}
            maxSize={10 * 1024 * 1024}
            label="فایل Excel"
            hint="فقط فرمت .xlsx پشتیبانی می‌شود"
          />
        </div>
      </Modal>
    </div>
  );
}