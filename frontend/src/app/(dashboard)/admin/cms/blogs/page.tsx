"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon, PencilSquareIcon, MagnifyingGlassIcon,
  NewspaperIcon, EyeIcon, EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { FileUpload } from "@/components/common/FileUpload";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { parseApiError, extractArray, extractCount } from "@/utils/error.utils";
import { toJalali } from "@/utils/date.utils";
import toast from "react-hot-toast";
import Image from "next/image";

interface Blog {
  id: number;
  title: string;
  slug: string;
  category_name: string;
  author_name: string;
  summary: string;
  image: string | null;
  is_published: boolean;
  published_at: string | null;
}

interface BlogCategory { id: number; name: string; }

interface BlogForm {
  title: string;
  category_id: string;
  summary: string;
  content: string;
  is_published: boolean;
}

const DEFAULT_FORM: BlogForm = {
  title: "", category_id: "", summary: "", content: "", is_published: false,
};

export default function AdminBlogsPage() {
  const [blogs,      setBlogs]      = useState<Blog[]>([]);
  const [blogCats,   setBlogCats]   = useState<BlogCategory[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search,     setSearch]     = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selected,  setSelected]  = useState<Blog | null>(null);
  const [form,      setForm]      = useState<BlogForm>(DEFAULT_FORM);
  const [imageFile, setImageFile] = useState<File[]>([]);
  const [saving,    setSaving]    = useState(false);

  const isEdit = !!selected;

  const fetchBlogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: 10 };
      if (search) params.search = search;
      const res  = await apiClient.get(ENDPOINTS.CMS.BLOGS, { params });
      const data = res.data?.data ?? res.data;
      setBlogs(extractArray<Blog>(data));
      const count = extractCount(data, 0);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 10) || 1);
    } catch {
      // public endpoint might not need auth
      setBlogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchBlogs(); }, [fetchBlogs]);
  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => { setSelected(null); setForm(DEFAULT_FORM); setImageFile([]); setShowModal(true); };

  const openEdit = (b: Blog) => {
    setSelected(b);
    setForm({
      title:        b.title,
      category_id:  "",
      summary:      b.summary,
      content:      "",
      is_published: b.is_published,
    });
    setImageFile([]);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("عنوان مقاله الزامی است"); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title",        form.title);
      formData.append("summary",      form.summary);
      formData.append("content",      form.content);
      formData.append("is_published", String(form.is_published));
      if (form.category_id) formData.append("category_id", form.category_id);
      if (imageFile[0])     formData.append("image", imageFile[0]);

      await apiClient.post(ENDPOINTS.CMS.ADMIN_BLOGS, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(isEdit ? "مقاله ویرایش شد" : "مقاله جدید ایجاد شد");
      setShowModal(false);
      fetchBlogs();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت مقالات"
        subtitle={`${totalCount.toLocaleString("fa-IR")} مقاله`}
        breadcrumbs={[{ label: "ادمین" }, { label: "محتوا" }, { label: "مقالات" }]}
        actions={
          <Button onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
            مقاله جدید
          </Button>
        }
      />

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="جستجوی مقاله..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 bg-slate-50 transition-all"
          />
        </div>
      </div>

      {/* Blogs grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse space-y-3">
              <div className="h-40 bg-slate-200 rounded-xl" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <EmptyState
          title="مقاله‌ای یافت نشد"
          action={
            <Button onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
              مقاله جدید
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden hover:shadow-card-hover transition-all group"
              >
                {/* Image */}
                <div className="relative h-44 bg-slate-100">
                  {blog.image ? (
                    <Image
                      src={blog.image}
                      alt={blog.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <NewspaperIcon className="h-12 w-12 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    {blog.is_published ? (
                      <Badge variant="success">منتشر شده</Badge>
                    ) : (
                      <Badge variant="default">پیش‌نویس</Badge>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-slate-800 mb-1 line-clamp-1 group-hover:text-primary-700 transition-colors">
                    {blog.title}
                  </h3>
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{blog.summary}</p>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{blog.author_name}</span>
                    {blog.published_at && (
                      <span>{toJalali(blog.published_at)}</span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(blog)}
                      leftIcon={<PencilSquareIcon className="h-3.5 w-3.5" />}
                    >
                      ویرایش
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={
                        blog.is_published
                          ? <EyeSlashIcon className="h-3.5 w-3.5" />
                          : <EyeIcon className="h-3.5 w-3.5" />
                      }
                    >
                      {blog.is_published ? "پنهان" : "انتشار"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEdit ? "ویرایش مقاله" : "مقاله جدید"}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>انصراف</Button>
            <Button onClick={handleSave} isLoading={saving}>
              {isEdit ? "ذخیره تغییرات" : "ایجاد مقاله"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="عنوان مقاله"
            placeholder="عنوان جذاب برای مقاله..."
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">خلاصه</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
              placeholder="خلاصه‌ای کوتاه از مقاله..."
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">محتوا</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="محتوای کامل مقاله..."
              rows={8}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
            />
          </div>
          <FileUpload
            onFilesChange={setImageFile}
            label="تصویر شاخص"
            hint="تصویر باید حداقل ۸۰۰×۴۰۰ پیکسل باشد"
            accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
            maxSize={5 * 1024 * 1024}
          />
          <Toggle
            checked={form.is_published}
            onChange={(v) => setForm((p) => ({ ...p, is_published: v }))}
            label="انتشار فوری"
            description="در صورت فعال بودن، مقاله بلافاصله منتشر می‌شود"
          />
        </div>
      </Modal>
    </div>
  );
}