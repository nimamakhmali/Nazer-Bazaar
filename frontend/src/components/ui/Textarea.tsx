"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  showCharCount?: boolean;
  resize?: "none" | "vertical" | "horizontal" | "both";
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      showCharCount,
      resize = "vertical",
      className,
      id,
      value,
      maxLength,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || props.name;
    const charCount = typeof value === "string" ? value.length : 0;
    const resizeClass = {
      none: "resize-none",
      vertical: "resize-y",
      horizontal: "resize-x",
      both: "resize",
    }[resize];

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
            {props.required && (
              <span className="text-red-500 mr-1" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          value={value}
          maxLength={maxLength}
          aria-invalid={!!error}
          className={cn(
            "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-800",
            "placeholder:text-slate-400",
            "transition-all duration-200 outline-none",
            "focus:ring-2 focus:ring-offset-0",
            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-100"
              : "border-slate-300 focus:border-primary-500 focus:ring-primary-100",
            props.disabled && "bg-slate-50 cursor-not-allowed opacity-60",
            resizeClass,
            className
          )}
          {...props}
        />

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1" role="alert">
                <span aria-hidden="true">⚠</span> {error}
              </p>
            )}
            {hint && !error && (
              <p className="text-xs text-slate-500">{hint}</p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p className={cn(
              "text-xs flex-shrink-0",
              charCount >= maxLength ? "text-red-500" : "text-slate-400"
            )}>
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";