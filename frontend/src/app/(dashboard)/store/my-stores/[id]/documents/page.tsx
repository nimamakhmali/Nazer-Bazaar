"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams }  from "next/navigation";
import {
  DocumentCheckIcon, CloudArrowUpIcon,
  CheckCircleIcon,   XMarkIcon,
  ClockIcon,         TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { PageHeader }    from "@/components/layout/PageHeader";
import { Button }        from "@/components/ui/Button";
import { Badge }         from "@/components/ui/Badge";
import { Modal }         from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select }        from "@/components/ui/Select";
import { Input }         from "@/components/ui/Input";
import { Alert }         from "@/components/ui/Alert";
import { Spinner }       from "@/components/ui/Spinner";
import { FileUpload }    from "@/components/common/FileUpload";
import apiClient         from "@/services/api.client";
import { ENDPOINTS }     from "@/services/endpoints";
import { parseApiError, extractArray } from "@/utils/error.utils";
import { toJalali }      from "@/utils/date.utils";
import toast             from "react-hot-toast";
import { cn }            from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
interface StoreDocument {
  id:                   number;
  document_type:        string;
  document_type_display:string;
  title:                string;
  file:                 string;
  description:          string;
  expire_date:          string | null;
  is_verified:          boolean;
  verified_by_name:     string;
  verified_at:          string | null;
  is_expired:           boolean;
  created_at:           string;
}

const DOC_TYPE_OPTIONS = [
  { value: "business_license",  label: "پروانه کسب" },
  { value: "national_id",       label: "کارت ملی"   },
  { value: "store_image",       label: "تصویر فروشگاه" },
  { value: "health_certificate",label: "گواهی بهداشت" },
  { value: "other",             label: "سایر"       },
];

const DOC_TYPE_ICONS: Record<string, string> = {
  business_license:   "📋",
  national_id:        "🪪",
  store_image:        "🏪",
  health_certificate: "🏥",
  other:              "📄",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function StoreDocumentsPage() {
  const { id }          = useParams<{ id: string }>();
  const [docs,   setDocs]  = useState<StoreDocument[]>([]);
  const [loading,setLoading]= useState(true);
  const [showUpload,setShowUpload] = useState(false);
  const [showDelete,setShowDelete] = useState(false);
  const [selDoc, setSelDoc]= useState<StoreDocument | null>(null);
  const [uploading,setUploading]= useState(false);
  const [files,  setFiles] = useState<File[]>([]);
  const [uploadForm, setUploadForm] = useState({
    document_type: "", title: "", description: "", expire_date: "",
  });

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get(ENDPOINTS.STORES.DOCUMENTS(Number(id)));
      const d = r.data?.data ?? r.data;
      setDocs(extractArray<StoreDocument>(d));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ── upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadForm.document_type) { toast.error("نوع مدرک را انتخاب کنید"); return; }
    if (!uploadForm.title.trim())  { toast.error("عنوان مدرک الزامی است");   return; }
    if (files.length === 0)        { toast.error("فایل را انتخاب کنید");     return; }

    setUploading(true);
    const fd = new FormData();
    fd.append("document_type", uploadForm.document_type);
    fd.append("title",         uploadForm.title);
    fd.append("file",          files[0]);
    if (uploadForm.description) fd.append("description", uploadForm.description);
    if (uploadForm.expire_date) fd.append("expire_date", uploadForm.expire_date);

    try {
      await apiClient.post(ENDPOINTS.STORES.DOCUMENTS(Number(id)), fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("مدرک با موفقیت آپلود شد");
      setShowUpload(false);
      setFiles([]);
      setUploadForm({ document_type: "", title: "", description: "", expire_date: "" });
      fetchDocs();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setUploading(false);
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selDoc) return;
    try {
      await apiClient.delete(ENDPOINTS.STORES.DOCUMENT_DELETE(selDoc.id));
      toast.success("مدرک حذف شد");
      setShowDelete(false);
      fetchDocs();
    } catch (err) {
      toast.error(parseApiError(err));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="مدارک فروشگاه"
        subtitle="آپلود و مدیریت مدارک"
        breadcrumbs={[
          { label: "فروشگاه‌های من", href: "/store/my-stores" },
          { label: "مدارک" },
        ]}
        actions={
          <Button
            onClick={() => setShowUpload(true)}
            leftIcon={<CloudArrowUpIcon className="h-4 w-4" />}
          >
            آپلود مدرک جدید
          </Button>
        }
      />

      <Alert
        variant="info"
        message="مدارک آپلود شده توسط مدیر اتاق اصناف بررسی و تایید می‌شوند. وضعیت تایید در این صفحه نمایش داده می‌شود."
        icon
        dismissible
      />

      {/* Docs grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="xl" />
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-6 bg-slate-100 rounded-3xl mb-6">
            <DocumentCheckIcon className="h-16 w-16 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">مدرکی آپلود نشده</h3>
          <p className="text-slate-400 mb-8">
            مدارک فروشگاه خود را آپلود کنید تا فرآیند تایید تسریع شود
          </p>
          <Button
            onClick={() => setShowUpload(true)}
            leftIcon={<CloudArrowUpIcon className="h-4 w-4" />}
          >
            آپلود مدرک
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className={cn(
                "bg-white rounded-2xl border shadow-card p-5",
                doc.is_expired
                  ? "border-red-200"
                  : doc.is_verified
                  ? "border-green-200"
                  : "border-slate-100",
              )}
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl",
                  doc.is_expired
                    ? "bg-red-50"
                    : doc.is_verified
                    ? "bg-green-50"
                    : "bg-slate-100",
                )}>
                  {DOC_TYPE_ICONS[doc.document_type] ?? "📄"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate">{doc.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {doc.document_type_display}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {doc.is_verified ? (
                    <Badge variant="success" dot size="sm">تایید شده</Badge>
                  ) : doc.is_expired ? (
                    <Badge variant="danger" dot size="sm">منقضی</Badge>
                  ) : (
                    <Badge variant="warning" dot size="sm">در انتظار</Badge>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                {doc.description && (
                  <p className="text-xs text-slate-500">{doc.description}</p>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">تاریخ آپلود</span>
                  <span className="font-medium text-slate-700">
                    {toJalali(doc.created_at)}
                  </span>
                </div>
                {doc.expire_date && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">تاریخ انقضا</span>
                    <span className={cn(
                      "font-medium",
                      doc.is_expired ? "text-red-600" : "text-slate-700",
                    )}>
                      {toJalali(doc.expire_date)}
                    </span>
                  </div>
                )}
                {doc.is_verified && doc.verified_by_name && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">تایید توسط</span>
                    <span className="font-medium text-green-700">
                      {doc.verified_by_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Expiry warning */}
              {doc.is_expired && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50
                                 border border-red-200 rounded-xl mb-4 text-xs text-red-700">
                  <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                  این مدرک منقضی شده است
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <a
                  href={doc.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2",
                    "px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                    "bg-primary-50 text-primary-700 hover:bg-primary-100",
                  )}
                >
                  <DocumentCheckIcon className="h-3.5 w-3.5" />
                  مشاهده فایل
                </a>
                {!doc.is_verified && (
                  <button
                    onClick={() => { setSelDoc(doc); setShowDelete(true); }}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600
                                hover:bg-red-50 transition-colors"
                    title="حذف مدرک"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        title="آپلود مدرک جدید"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowUpload(false)}>انصراف</Button>
            <Button onClick={handleUpload} isLoading={uploading}>
              آپلود مدرک
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="نوع مدرک"
            placeholder="انتخاب نوع..."
            options={DOC_TYPE_OPTIONS}
            value={uploadForm.document_type}
            onChange={(e) =>
              setUploadForm((p) => ({ ...p, document_type: e.target.value }))
            }
            required
          />
          <Input
            label="عنوان مدرک"
            placeholder="مثال: پروانه کسب ۱۴۰۳"
            value={uploadForm.title}
            onChange={(e) =>
              setUploadForm((p) => ({ ...p, title: e.target.value }))
            }
            required
          />
          <Input
            label="تاریخ انقضا (اختیاری)"
            type="date"
            value={uploadForm.expire_date}
            onChange={(e) =>
              setUploadForm((p) => ({ ...p, expire_date: e.target.value }))
            }
            dir="ltr"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              توضیحات (اختیاری)
            </label>
            <textarea
              value={uploadForm.description}
              onChange={(e) =>
                setUploadForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="توضیحات..."
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-100 resize-none"
            />
          </div>
          <FileUpload
            onFilesChange={setFiles}
            accept={{
              "image/*": [".jpg", ".jpeg", ".png", ".webp"],
              "application/pdf": [".pdf"],
            }}
            maxSize={10 * 1024 * 1024}
            label="فایل مدرک"
            hint="تصویر (JPG, PNG) یا PDF — حداکثر ۱۰ مگابایت"
          />
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="حذف مدرک"
        message={`آیا از حذف مدرک «${selDoc?.title}» اطمینان دارید؟`}
        confirmLabel="حذف"
        variant="danger"
      />
    </div>
  );
}