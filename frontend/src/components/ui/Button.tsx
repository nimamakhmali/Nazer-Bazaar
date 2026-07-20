"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "link";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: [
    "bg-primary-600 text-white border border-transparent",
    "hover:bg-primary-700 active:bg-primary-800",
    "focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
    "shadow-sm hover:shadow",
  ].join(" "),

  secondary: [
    "bg-secondary-600 text-white border border-transparent",
    "hover:bg-secondary-700 active:bg-secondary-800",
    "focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2",
    "shadow-sm hover:shadow",
  ].join(" "),

  outline: [
    "bg-transparent text-primary-600 border-2 border-primary-600",
    "hover:bg-primary-50 active:bg-primary-100",
    "focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
  ].join(" "),

  ghost: [
    "bg-transparent text-primary-600 border border-transparent",
    "hover:bg-primary-50 active:bg-primary-100",
    "focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
  ].join(" "),

  danger: [
    "bg-red-600 text-white border border-transparent",
    "hover:bg-red-700 active:bg-red-800",
    "focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2",
    "shadow-sm hover:shadow",
  ].join(" "),

  success: [
    "bg-success-DEFAULT text-white border border-transparent",
    "hover:bg-green-700 active:bg-green-800",
    "focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2",
    "shadow-sm",
  ].join(" "),

  link: [
    "bg-transparent text-primary-600 border border-transparent underline-offset-4",
    "hover:underline",
    "p-0 h-auto font-normal",
  ].join(" "),
};

const sizes: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs gap-1 rounded-md",
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

const LoadingSpinner = () => (
  <svg
    className="animate-spin h-4 w-4 flex-shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12" cy="12" r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium",
          "transition-all duration-200 outline-none",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          variant !== "link" && sizes[size],
          variants[variant],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          leftIcon && (
            <span className="flex-shrink-0" aria-hidden="true">
              {leftIcon}
            </span>
          )
        )}

        {children && (
          <span className={cn(isLoading && "opacity-70")}>
            {children}
          </span>
        )}

        {!isLoading && rightIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";