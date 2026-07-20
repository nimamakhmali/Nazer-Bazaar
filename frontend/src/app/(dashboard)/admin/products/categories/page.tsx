"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon, PencilSquareIcon, TagIcon, ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { parseApiError, extractArray } from "@/utils/error.utils";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";

interface Category {
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
  children?: Category[];
}

interface CategoryForm {
  name: string;
  parent_id: string;
  description: string;
  icon: string;
  order: string;
  is_active: boolean;
}

const DEFAULT_FORM: CategoryForm = {
  name: "", parent_id: "", description: "", icon: "", order: "0", is_active: true,
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [selected,   setSelected]   = useState<Category | null>(null);
  const [form,       setForm]       = useState<CategoryForm>(DEFAULT_FORM);
  const [saving,     setSaving]     = useState(false);
  const [expanded,   setExpanded]   = useState<Set<number>>(new Set());

  const isEdit = !!selected;

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res  = await apiClient.get(ENDPOINTS.PRODUCTS.CATEGORIES, {
        params: { page_size: 200 },
      });
      const data = res.data?.data ?? res.data;
      setCategories(extractArray<Category>(data));
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Build tree
  const rootCategories = categories.filter((c) => !c.parent);
  const getChildren    = (parentId: number) =>
    categories.filter((c) => c.parent === parentId);

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openCreate = (parentId?: number) => {
    setSelected(null);
    setForm({ ...DEFAULT_FORM, parent_id: parentId ? String(parentId) : "" });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setSelected(cat);
    setForm({
      name:        cat.name,
      parent_id:   cat.parent ? String(cat.parent) : "",
      description: "",
      icon:        cat.icon || "",
      order:       String(cat.order),
      is_active:   cat.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("نام دسته‌بندی الزامی است"); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name:      form.name,
        icon:      form.icon || undefined,
        order:     Number(form.order) || 0,
        is_active: form.is_active,
      };
      if (form.parent_id)  payload.parent_id   = Number(form.parent_id);
      if (form.description) payload.description = form.description;

      if (isEdit && selected) {
        await apiClient.patch(ENDPOINTS.PRODUCTS.CATEGORY(selected.id), payload);
        toast.success("دسته‌بندی ویرایش شد");
      } else {
        await apiClient.post(ENDPOINTS.PRODUCTS.CATEGORIES, payload);
        toast.success("دسته‌بندی جدید ایجاد شد");
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = categories
    .filter((c) => !c.parent)
    .map((c) => ({ value: c.id, label: c.name }));

  const CategoryNode = ({ cat, depth = 0 }: { cat: Category; depth?: number }) => {
    const children   = getChildren(cat.id);
    const hasChildren = children.length > 0 || cat.children_count > 0;
    const isExpanded  = expanded.has(cat.id);

    return (
      <div>
        <div
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group",
            depth > 0 && "mr-6 border-r-2 border-slate-100"
          )}
        >
          {/* Expand toggle */}
          <button
            onClick={() => hasChildren && toggleExpanded(cat.id)}
            className={cn(
              "h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
              hasChildren
                ? "text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                : "invisible"
            )}
          >
            <ChevronDownIcon
              className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")}
            />
          </button>

          {/* Icon */}
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
              depth === 0
                ? "bg-primary-100 text-primary-600"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {cat.icon ? (
              <span className="text-base">{cat.icon}</span>
            ) : (
              <TagIcon className="h-4 w-4" />
            )}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "font-medium",
                depth === 0 ? "text-slate-800" : "text-slate-600 text-sm"
              )}>
                {cat.name}
              </span>
              {cat.is_active ? (
                <Badge variant="success" size="sm">فعال</Badge>
              ) : (
                <Badge variant="danger" size="sm">غیرفعال</Badge>
              )}
              <span className="text-xs text-slate-400">
                {cat.products_count.toLocaleString("fa-IR")} محصول
              </span>
              {hasChildren && (
                <span className="text-xs text-primary-600 font-medium">
                  {children.length || cat.children_count} زیردسته
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => openCreate(cat.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors text-xs"
              title="افزودن زیردسته"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => openEdit(cat)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              title="ویرایش"
            >
              <PencilSquareIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && children.length > 0 && (
          <div className="mr-3 mt-0.5 space-y-0.5">
            {children.map((child) => (
              <CategoryNode key={child.id} cat={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="دسته‌بندی محصولات"
        subtitle={`${categories.length.toLocaleString("fa-IR")} دسته‌بندی`}
        breadcrumbs={[{ label: "ادمین" }, { label: "محصولات" }, { label: "دسته‌بندی‌ها" }]}
        actions={
          <Button onClick={() => openCreate()} leftIcon={<PlusIcon className="h-4 w-4" />}>
            دسته‌بندی جدید
          </Button>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-2">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rootCategories.length === 0 ? (
          <EmptyState
            title="دسته‌بندی‌ای یافت نشد"
            action={
              <Button onClick={() => openCreate()} leftIcon={<PlusIcon className="h-4 w-4" />}>
                دسته‌بندی جدید
              </Button>
            }
          />
        ) : (
          <div className="space-y-0.5 p-2">
            {rootCategories.map((cat) => (
              <CategoryNode key={cat.id} cat={cat} />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEdit ? "ویرایش دسته‌بندی" : "دسته‌بندی جدید"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>انصراف</Button>
            <Button onClick={handleSave} isLoading={saving}>
              {isEdit ? "ذخیره" : "ایجاد"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="نام دسته‌بندی"
            placeholder="مثال: لبنیات"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Select
            label="دسته والد (اختیاری)"
            placeholder="دسته اصلی"
            options={parentOptions}
            value={form.parent_id}
            onChange={(e) => setForm((p) => ({ ...p, parent_id: e.target.value }))}
          />
          <Input
            label="آیکون (emoji)"
            placeholder="مثال: 🥛"
            value={form.icon}
            onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
          />
          <Input
            label="ترتیب نمایش"
            type="number"
            value={form.order}
            onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
            dir="ltr"
          />
          <Toggle
            checked={form.is_active}
            onChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
            label="دسته‌بندی فعال باشد"
          />
        </div>
      </Modal>
    </div>
  );
}