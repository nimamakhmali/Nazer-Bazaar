"use client";

import { useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

type AlertVariant = "success" | "error" | "warning" | "info";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  icon?: boolean;
}

const config: Record<AlertVariant, {
  wrapper: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}> = {
  success: {
    wrapper: "bg-green-50 border-green-200 text-green-900",
    icon: CheckCircleIcon,
    iconClass: "text-green-600",
  },
  error: {
    wrapper: "bg-red-50 border-red-200 text-red-900",
    icon: XCircleIcon,
    iconClass: "text-red-600",
  },
  warning: {
    wrapper: "bg-amber-50 border-amber-200 text-amber-900",
    icon: ExclamationTriangleIcon,
    iconClass: "text-amber-600",
  },
  info: {
    wrapper: "bg-blue-50 border-blue-200 text-blue-900",
    icon: InformationCircleIcon,
    iconClass: "text-blue-600",
  },
};

export const Alert = ({
  variant = "info",
  title,
  message,
  dismissible = false,
  onDismiss,
  className,
  icon = true,
}: AlertProps) => {
  const [visible, setVisible] = useState(true);
  const { wrapper, icon: Icon, iconClass } = config[variant];

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 p-4 rounded-xl border text-sm",
        wrapper,
        className
      )}
    >
      {icon && (
        <Icon
          className={cn("h-5 w-5 flex-shrink-0 mt-0.5", iconClass)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-semibold mb-0.5">{title}</p>
        )}
        <p className="leading-relaxed">{message}</p>
      </div>

      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity"
          aria-label="بستن پیام"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};