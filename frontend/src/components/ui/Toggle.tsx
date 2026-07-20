"use client";

import { Switch } from "@headlessui/react";
import { cn } from "@/lib/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export const Toggle = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
}: ToggleProps) => {
  const sizes = {
    sm: { track: "h-5 w-9", thumb: "h-4 w-4", translate: "translate-x-4" },
    md: { track: "h-6 w-11", thumb: "h-5 w-5", translate: "translate-x-5" },
  };
  const s = sizes[size];

  return (
    <Switch.Group>
      <div className="flex items-center justify-between gap-3">
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <Switch.Label className="block text-sm font-medium text-slate-700 cursor-pointer">
                {label}
              </Switch.Label>
            )}
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
        )}

        <Switch
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            "relative inline-flex flex-shrink-0 rounded-full border-2 border-transparent",
            "transition-colors duration-200 ease-in-out",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
            checked ? "bg-primary-600" : "bg-slate-300",
            disabled && "opacity-50 cursor-not-allowed",
            s.track
          )}
        >
          <span
            className={cn(
              "inline-block rounded-full bg-white shadow-md",
              "transform transition duration-200 ease-in-out",
              checked ? s.translate : "translate-x-0",
              s.thumb
            )}
          />
        </Switch>
      </div>
    </Switch.Group>
  );
};