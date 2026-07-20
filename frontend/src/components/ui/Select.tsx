"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, hint, options, placeholder, className, id, ...props },
    ref
  ) => {
    const selectId = id || props.name;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
            {props.required && (
              <span className="text-red-500 mr-1" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={!!error}
            className={cn(
              "w-full appearance-none rounded-lg border bg-white px-3 py-2.5 text-sm",
              "transition-all duration-200 outline-none cursor-pointer",
              "focus:ring-2 focus:ring-offset-0",
              error
                ? "border-red-400 focus:border-red-400 focus:ring-red-100 text-red-900"
                : "border-slate-300 focus:border-primary-500 focus:ring-primary-100 text-slate-800",
              !props.value && placeholder && "text-slate-400",
              props.disabled && "bg-slate-50 cursor-not-allowed opacity-60",
              "pl-9",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
              >
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDownIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1" role="alert">
            <span aria-hidden="true">⚠</span> {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-slate-500">{hint}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";