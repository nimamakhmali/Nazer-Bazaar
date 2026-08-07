"use client";

import {
  ExclamationTriangleIcon,
  TrashIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { cn } from "@/lib/cn";

type ConfirmVariant = "danger" | "warning" | "info" | "success";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  // هر دو نام را پشتیبانی می‌کنیم
  confirmText?: string;
  cancelText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const variantConfig: Record<
  ConfirmVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    buttonVariant: "danger" | "secondary" | "primary";
  }
> = {
  danger: {
    icon: TrashIcon,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    buttonVariant: "danger",
  },
  warning: {
    icon: ExclamationTriangleIcon,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    buttonVariant: "secondary",
  },
  info: {
    icon: ExclamationTriangleIcon,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    buttonVariant: "primary",
  },
  success: {
    icon: CheckCircleIcon,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    buttonVariant: "primary",
  },
};

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) => {
  const config = variantConfig[variant] ?? variantConfig.danger;
  const { icon: Icon, iconBg, iconColor, buttonVariant } = config;

  const confirmBtn = confirmText ?? confirmLabel ?? "تایید";
  const cancelBtn  = cancelText  ?? cancelLabel  ?? "انصراف";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className={cn("p-4 rounded-full", iconBg)}>
          <Icon className={cn("h-8 w-8", iconColor)} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 w-full pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelBtn}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmBtn}
          </Button>
        </div>
      </div>
    </Modal>
  );
};