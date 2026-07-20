"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/cn";

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const FileUpload = ({
  onFilesChange,
  accept = { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
  maxSize = 5 * 1024 * 1024,
  maxFiles = 1,
  multiple = false,
  label,
  hint,
  error,
  className,
}: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: { file: File; errors: { message: string }[] }[]) => {
      setFiles(acceptedFiles);
      onFilesChange(acceptedFiles);

      const rejected = fileRejections.map(({ file, errors }) =>
        `${file.name}: ${errors.map((e) => e.message).join(", ")}`
      );
      setRejectedFiles(rejected);
    },
    [onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    multiple,
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange(newFiles);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <p className="text-sm font-medium text-slate-700">{label}</p>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 cursor-pointer",
          "flex flex-col items-center gap-3 text-center",
          "transition-all duration-200",
          isDragActive
            ? "border-primary-400 bg-primary-50"
            : error
            ? "border-red-300 bg-red-50 hover:border-red-400"
            : "border-slate-300 bg-slate-50 hover:border-primary-400 hover:bg-primary-50/50"
        )}
      >
        <input {...getInputProps()} />

        <div className={cn(
          "p-3 rounded-full",
          isDragActive ? "bg-primary-100 text-primary-600" : "bg-white text-slate-400"
        )}>
          <CloudArrowUpIcon className="h-8 w-8" />
        </div>

        <div>
          <p className={cn(
            "text-sm font-medium",
            isDragActive ? "text-primary-700" : "text-slate-600"
          )}>
            {isDragActive ? "فایل را رها کنید" : "فایل را بکشید یا کلیک کنید"}
          </p>
          {hint && (
            <p className="text-xs text-slate-400 mt-1">{hint}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            حداکثر حجم: {formatBytes(maxSize)}
          </p>
        </div>
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={index}
              className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                aria-label="حذف فایل"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Rejected files */}
      {rejectedFiles.length > 0 && (
        <ul className="space-y-1">
          {rejectedFiles.map((msg, i) => (
            <li key={i} className="text-xs text-red-500 flex items-center gap-1">
              <span aria-hidden="true">⚠</span> {msg}
            </li>
          ))}
        </ul>
      )}

      {error && !rejectedFiles.length && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};