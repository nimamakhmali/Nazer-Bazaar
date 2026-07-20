"use client";

import { forwardRef, type InputHTMLAttributes, useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showCharCount?: boolean;
  maxLength?: number;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      showCharCount,
      maxLength,
      className,
      type = "text",
      id,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || props.name;
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;
    const charCount = typeof value === "string" ? value.length : 0;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
            {props.required && (
              <span className="text-red-500 mr-1" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <div className="relative">
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {rightIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            value={value}
            maxLength={maxLength}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : hint
                ? `${inputId}-hint`
                : undefined
            }
            className={cn(
              "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-800",
              "placeholder:text-slate-400",
              "transition-all duration-200 outline-none",
              "focus:ring-2 focus:ring-offset-0",
              error
                ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                : "border-slate-300 focus:border-primary-500 focus:ring-primary-100",
              rightIcon && "pr-10",
              (leftIcon || isPassword) && "pl-10",
              props.disabled && "bg-slate-50 cursor-not-allowed opacity-60",
              className
            )}
            {...props}
          />

          {leftIcon && !isPassword && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {error && (
              <p
                id={`${inputId}-error`}
                className="text-xs text-red-500 flex items-center gap-1"
                role="alert"
              >
                <span aria-hidden="true">⚠</span>
                {error}
              </p>
            )}
            {hint && !error && (
              <p id={`${inputId}-hint`} className="text-xs text-slate-500">
                {hint}
              </p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p className="text-xs text-slate-400 flex-shrink-0">
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = "Input";