"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import apiClient from "@/services/api.client";
import { ENDPOINTS } from "@/services/endpoints";
import { parseApiError, extractArray } from "@/utils/error.utils";
import { toJalali } from "@/utils/date.utils";
import toast from "react-hot-toast";

interface Page {
  id: number;
  title: string;
  slug: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface PageForm {
  title: string;
  content: string;
  is_published: boolean;
}

const DEFAULT_FORM: PageForm = { title: "", content: "", is_published: true };

export default function AdminPagesPage() {
  const [pages,     setPages]     = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected,  setSelected]  = useState<Page | null>(null);
  const [form,      setForm]      = useState<PageForm>(DEFAULT_FORM);
  const [saving,    setSaving]    = useState(false);

  const isEdit = !!selected;

  const fetchPages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res  = await apiClient.get(ENDPOINTS.CMS.ADMIN_PAGES);
      const data = res.data?.data ?? res.data;
      setPages(extractArray<Page>(data));
    } catch {
      setPages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const openCreate = () => { setSelected(null); setForm(DEFAULT_FORM); setShowModal(true); };

  const openEdit = (p: Page) => {
    setSelected(p);
    setForm({ title: p.title, content: "", is_published: p.is_published });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("عنوان صفحه الزامی است"); return; }
    setSaving(true);
    try {
      await apiClient.post(ENDPOINTS.CMS.ADMIN_PAGES, form);
      toast.success(isEdit ? "صفحه ویرایش شد" : "صفحه جدید ایجاد شد");
      setShowModal(false);
      fetchPages();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت صفحات ثابت"
        subtitle="صفحاتی مثل درباره ما، قوانین و تماس با ما"
        breadcrumbs={[{ label: "ادمین" }, { label: "محتوا" }, { label: "صفحات" }]}
        actions={
          <Button onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
            صفحه جدید
          </Button>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : pages.length === 0 ? (
          <EmptyState
            title="صفحه‌ای یافت نشد"
            action={
              <Button onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
                صفحه جدید
              </Button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                {["عنوان صفحه", "نامک (slug)", "وضعیت", "آخرین بروزرسانی", "عملیات"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4 font-semibold text-slate-800">{page.title}</td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                      {page.slug}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {page.is_published ? (
                      <Badge variant="success" dot>منتشر شده</Badge>
                    ) : (
                      <Badge variant="default" dot>پیش‌نویس</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-sm">
                    {toJalali(page.updated_at)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => openEdit(page)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEdit ? "ویرایش صفحه" : "صفحه جدید"}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>انصراف</Button>
            <Button onClick={handleSave} isLoading={saving}>
              {isEdit ? "ذخیره تغییرات" : "ایجاد صفحه"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="عنوان صفحه"
            placeholder="مثال: درباره ما"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              محتوا <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="محتوای صفحه را اینجا بنویسید..."
              rows={12}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
            />
          </div>
          <Toggle
            checked={form.is_published}
            onChange={(v) => setForm((p) => ({ ...p, is_published: v }))}
            label="صفحه منتشر شود"
          />
        </div>
      </Modal>
    </div>
  );
}