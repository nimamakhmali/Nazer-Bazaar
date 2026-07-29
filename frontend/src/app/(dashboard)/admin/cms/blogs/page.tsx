"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FolderIcon, PlusIcon, PencilSquareIcon,
  TrashIcon, CheckCircleIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import apiClient from "@/services/api.client";
import { parseApiError, extractArray } from "@/utils/error.utils";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Schema
// ─────────────────────────────────────────────────────────────────────────────
const categorySchema = z.object({
  name:        z.string().min(2, "نام دسته باید حداقل ۲ حرف باشد"),
  slug:        z.string().min(2, "نامک باید حداقل ۲ حرف باشد").regex(/^[a-z0-9-]+$/, "فقط حروف انگلیسی، اعداد و خط تیره"),
  description: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface BlogCategory {
  id:          number;
  name:        string;
  slug:        string;
  description: string;
  posts_count: number;
  created_at:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminBlogCategoriesPage() {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<BlogCategory | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      // endpoint فرضی - باید در backend پیاده‌سازی شود
      const res = await apiClient.get("/api/v1/cms/blog-categories/");
      const data = res.data?.data ?? res.data;
      setCategories(extractArray<BlogCategory>(data));
    } catch {
      // fallback
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ── create / edit ──────────────────────────────────────────────────────────
  const onSubmit = async (data: CategoryFormData) => {
    setIsSaving(true);
    try {
      if (editingCategory) {
        // Edit
        await apiClient.patch(`/api/v1/cms/blog-categories/${editingCategory.id}/`, data);
        toast.success("دسته‌بندی بروزرسانی شد");
      } else {
        // Create
        await apiClient.post("/api/v1/cms/blog-categories/", data);
        toast.success("دسته‌بندی جدید ایجاد شد");
      }
      setShowModal(false);
      reset();
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  // ── open edit ──────────────────────────────────────────────────────────────
  const openEdit = (category: BlogCategory) => {
    setEditingCategory(category);
    reset({
      name:        category.name,
      slug:        category.slug,
      description: category.description || "",
    });
    setShowModal(true);
  };

  // ── open create ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingCategory(null);
    reset({ name: "", slug: "", description: "" });
    setShowModal(true);
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingCategory) return;
    setIsSaving(true);
    try {
      await apiClient.delete(`/api/v1/cms/blog-categories/${deletingCategory.id}/`);
      toast.success("دسته‌بندی حذف شد");
      setDeletingCategory(null);
      fetchCategories();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="دسته‌بندی مقالات"
        subtitle="مدیریت دسته‌بندی‌های وبلاگ و مقالات"
        breadcrumbs={[
          { label: "مدیریت محتوا", href: "/admin/cms/blogs" },
          { label: "دسته‌بندی‌ها" },
        ]}
        actions={
          <Button
            onClick={openCreate}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            دسته‌بندی جدید
          </Button>
        }
      />

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="xl" />
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<FolderIcon className="h-16 w-16" />}
          title="دسته‌بندی وجود ندارد"
          description="برای شروع، اولین دسته‌بندی را ایجاد کنید."
          size="lg"
          action={
            <Button onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
              ایجاد دسته‌بندی
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={() => openEdit(category)}
              onDelete={() => setDeletingCategory(category)}
            />
          ))}
        </div>
      )}

      {/* ── Modal: Create/Edit ── */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCategory(null);
          reset();
        }}
        title={editingCategory ? "ویرایش دسته‌بندی" : "دسته‌بندی جدید"}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowModal(false);
                setEditingCategory(null);
                reset();
              }}
            >
              انصراف
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              isLoading={isSaving}
              leftIcon={<CheckCircleIcon className="h-4 w-4" />}
            >
              {editingCategory ? "بروزرسانی" : "ایجاد"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="نام دسته‌بندی"
            {...register("name")}
            error={errors.name?.message}
            placeholder="اخبار، آموزش، راهنما..."
            required
          />

          <Input
            label="نامک (Slug)"
            {...register("slug")}
            error={errors.slug?.message}
            placeholder="news, tutorial, guide"
            hint="فقط حروف انگلیسی کوچک، اعداد و خط تیره"
            required
          />

          <Textarea
            label="توضیحات (اختیاری)"
            {...register("description")}
            error={errors.description?.message}
            rows={3}
            placeholder="توضیح مختصر درباره این دسته‌بندی..."
          />
        </form>
      </Modal>

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDelete}
        title="حذف دسته‌بندی"
        message={`آیا از حذف دسته‌بندی «${deletingCategory?.name}» اطمینان دارید؟${
          (deletingCategory?.posts_count ?? 0) > 0
            ? ` این دسته شامل ${deletingCategory?.posts_count} مقاله است.`
            : ""
        }`}
        confirmLabel="بله، حذف کن"
        variant="danger"
        isLoading={isSaving}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Card
// ─────────────────────────────────────────────────────────────────────────────
function CategoryCard({
  category,
  onEdit,
  onDelete,
}: {
  category: BlogCategory;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      padding="md"
      hover
      className="group relative overflow-hidden"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center
                         justify-center flex-shrink-0 group-hover:bg-primary-200
                         transition-colors">
          <FolderIcon className="h-6 w-6 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 truncate group-hover:text-primary-700
                          transition-colors">
            {category.name}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            /{category.slug}
          </p>
        </div>
        <Badge variant="primary" size="sm">
          {category.posts_count ?? 0} مقاله
        </Badge>
      </div>

      {category.description && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">
          {category.description}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          leftIcon={<PencilSquareIcon className="h-3.5 w-3.5" />}
          className="flex-1"
        >
          ویرایش
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          leftIcon={<TrashIcon className="h-3.5 w-3.5" />}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          حذف
        </Button>
      </div>
    </Card>
  );
}