"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  PhotoIcon, PlusIcon, TrashIcon, ArrowDownTrayIcon,
  MagnifyingGlassIcon, FunnelIcon, CheckIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { FileUpload } from "@/components/common/FileUpload";
import apiClient from "@/services/api.client";
import { parseApiError, extractArray } from "@/utils/error.utils";
import { toJalali } from "@/utils/date.utils";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";
import Image from "next/image";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface GalleryImage {
  id:         number;
  title:      string;
  file:       string;
  alt_text:   string;
  size:       number;
  uploaded_at:string;
  uploaded_by:string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [deletingImage, setDeletingImage] = useState<GalleryImage | null>(null);
  const [search, setSearch] = useState("");

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      // endpoint فرضی
      const res = await apiClient.get("/api/v1/cms/gallery/");
      const data = res.data?.data ?? res.data;
      setImages(extractArray<GalleryImage>(data));
    } catch {
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // ── upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast.error("لطفاً حداقل یک فایل انتخاب کنید");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      uploadFiles.forEach((file) => {
        formData.append("files", file);
      });

      await apiClient.post("/api/v1/cms/gallery/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(`${uploadFiles.length} تصویر آپلود شد`);
      setShowUpload(false);
      setUploadFiles([]);
      fetchImages();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setUploading(false);
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingImage) return;
    try {
      await apiClient.delete(`/api/v1/cms/gallery/${deletingImage.id}/`);
      toast.success("تصویر حذف شد");
      setDeletingImage(null);
      fetchImages();
    } catch (err) {
      toast.error(parseApiError(err));
    }
  };

  // ── bulk delete ────────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedImages).map((id) =>
          apiClient.delete(`/api/v1/cms/gallery/${id}/`)
        )
      );
      toast.success(`${selectedImages.size} تصویر حذف شد`);
      setSelectedImages(new Set());
      fetchImages();
    } catch (err) {
      toast.error(parseApiError(err));
    }
  };

  // ── toggle select ──────────────────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedImages);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedImages(newSet);
  };

  // ── select all ─────────────────────────────────────────────────────────────
  const selectAll = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredImages.map((img) => img.id)));
    }
  };

  // ── filter ─────────────────────────────────────────────────────────────────
  const filteredImages = images.filter((img) =>
    !search ||
    img.title.toLowerCase().includes(search.toLowerCase()) ||
    img.alt_text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="گالری تصاویر"
        subtitle={`${images.length.toLocaleString("fa-IR")} تصویر در گالری`}
        breadcrumbs={[
          { label: "مدیریت محتوا", href: "/admin/cms/blogs" },
          { label: "گالری" },
        ]}
        actions={
          <Button
            onClick={() => setShowUpload(true)}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            آپلود تصویر
          </Button>
        }
      />

      {/* ── Toolbar ── */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <MagnifyingGlassIcon
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4
                         text-slate-400 pointer-events-none"
            />
            <input
              type="search"
              placeholder="جستجوی تصویر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-sm border border-slate-200
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100
                         focus:border-primary-500 bg-slate-50"
            />
          </div>

          {/* Select all */}
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            leftIcon={<CheckIcon className="h-4 w-4" />}
          >
            {selectedImages.size === filteredImages.length && filteredImages.length > 0
              ? "لغو انتخاب همه"
              : "انتخاب همه"}
          </Button>

          {/* Bulk delete */}
          {selectedImages.size > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
              leftIcon={<TrashIcon className="h-4 w-4" />}
            >
              حذف ({selectedImages.size})
            </Button>
          )}
        </div>
      </Card>

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="xl" />
        </div>
      ) : filteredImages.length === 0 ? (
        <EmptyState
          icon={<PhotoIcon className="h-16 w-16" />}
          title={search ? "تصویری یافت نشد" : "گالری خالی است"}
          description={
            search
              ? "با عبارت جستجوی دیگری تلاش کنید"
              : "برای شروع، اولین تصویر را آپلود کنید"
          }
          size="lg"
          action={
            !search && (
              <Button onClick={() => setShowUpload(true)} leftIcon={<PlusIcon className="h-4 w-4" />}>
                آپلود تصویر
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredImages.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              isSelected={selectedImages.has(image.id)}
              onToggleSelect={() => toggleSelect(image.id)}
              onDelete={() => setDeletingImage(image)}
            />
          ))}
        </div>
      )}

      {/* ── Modal: Upload ── */}
      <Modal
        isOpen={showUpload}
        onClose={() => {
          setShowUpload(false);
          setUploadFiles([]);
        }}
        title="آپلود تصاویر جدید"
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowUpload(false);
                setUploadFiles([]);
              }}
            >
              انصراف
            </Button>
            <Button
              onClick={handleUpload}
              isLoading={uploading}
              disabled={uploadFiles.length === 0}
              leftIcon={<PhotoIcon className="h-4 w-4" />}
            >
              آپلود ({uploadFiles.length})
            </Button>
          </>
        }
      >
        <FileUpload
          onFilesChange={setUploadFiles}
          accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] }}
          maxSize={5 * 1024 * 1024}
          maxFiles={10}
          multiple
          label="تصاویر"
          hint="فرمت‌های مجاز: JPG, PNG, WebP, GIF — حداکثر حجم هر فایل: ۵MB"
        />
      </Modal>

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        isOpen={!!deletingImage}
        onClose={() => setDeletingImage(null)}
        onConfirm={handleDelete}
        title="حذف تصویر"
        message={`آیا از حذف تصویر «${deletingImage?.title}» اطمینان دارید؟`}
        confirmLabel="بله، حذف کن"
        variant="danger"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Card
// ─────────────────────────────────────────────────────────────────────────────
function ImageCard({
  image,
  isSelected,
  onToggleSelect,
  onDelete,
}: {
  image:          GalleryImage;
  isSelected:     boolean;
  onToggleSelect: () => void;
  onDelete:       () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn(
        "group relative aspect-square rounded-2xl overflow-hidden",
        "border-2 transition-all duration-200 cursor-pointer",
        isSelected
          ? "border-primary-600 shadow-lg"
          : "border-slate-100 hover:border-slate-200 hover:shadow-card"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Image */}
      <div className="relative w-full h-full bg-slate-100">
        <Image
          src={image.file}
          alt={image.alt_text || image.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
        />
      </div>

      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent",
          "transition-opacity duration-200",
          showActions || isSelected ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <p className="text-xs font-semibold truncate">{image.title}</p>
          <p className="text-[10px] opacity-80 mt-0.5">
            {(image.size / 1024).toFixed(0)} KB • {toJalali(image.uploaded_at)}
          </p>
        </div>

        {/* Actions */}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          {/* Select checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className={cn(
              "h-6 w-6 rounded-lg flex items-center justify-center",
              "transition-all duration-200 backdrop-blur-sm",
              isSelected
                ? "bg-primary-600 text-white"
                : "bg-white/20 text-white hover:bg-white/30"
            )}
          >
            {isSelected && <CheckIcon className="h-4 w-4" />}
          </button>

          {/* Download */}
          <a
            href={image.file}
            download
            onClick={(e) => e.stopPropagation()}
            className="h-6 w-6 rounded-lg flex items-center justify-center
                       bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm
                       transition-all duration-200"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </a>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-6 w-6 rounded-lg flex items-center justify-center
                       bg-red-500/80 text-white hover:bg-red-600
                       backdrop-blur-sm transition-all duration-200"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary-600" />
      )}
    </div>
  );
}