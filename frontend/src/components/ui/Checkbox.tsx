"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className, id, ...props }, ref) => {
    const checkId = id || props.name;

    return (
      <div className="flex items-start gap-3">
        <div className="flex items-center h-5 mt-0.5">
          <input
            ref={ref}
            id={checkId}
            type="checkbox"
            className={cn(
              "h-4 w-4 rounded border-slate-300 text-primary-600",
              "focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
              "transition-colors duration-150 cursor-pointer",
              error && "border-red-400",
              props.disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label
                htmlFor={checkId}
                className="block text-sm font-medium text-slate-700 cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
            {error && (
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";