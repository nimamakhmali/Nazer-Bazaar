"use client";

import { useRef, type ChangeEvent } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffect, useState } from "react";

interface SearchBarProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
  isLoading?: boolean;
  className?: string;
}

export const SearchBar = ({
  value: externalValue = "",
  onChange,
  placeholder = "جستجو...",
  debounce = 400,
  isLoading = false,
  className,
}: SearchBarProps) => {
  const [internalValue, setInternalValue] = useState(externalValue);
  const debouncedValue = useDebounce(internalValue, debounce);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue]);

  useEffect(() => {
    setInternalValue(externalValue);
  }, [externalValue]);

  const handleClear = () => {
    setInternalValue("");
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        {isLoading ? (
          <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-primary-500 animate-spin" />
        ) : (
          <MagnifyingGlassIcon className="h-4 w-4" />
        )}
      </div>

      <input
        ref={inputRef}
        type="search"
        value={internalValue}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setInternalValue(e.target.value)
        }
        placeholder={placeholder}
        className={cn(
          "w-full h-10 pl-9 pr-10 rounded-lg border border-slate-300 bg-white text-sm",
          "placeholder:text-slate-400 text-slate-800",
          "focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500",
          "transition-all duration-200"
        )}
      />

      {internalValue && (
        <button
          onClick={handleClear}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="پاک کردن جستجو"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};