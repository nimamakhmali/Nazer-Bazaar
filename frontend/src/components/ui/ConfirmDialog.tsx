"use client";

import { ExclamationTriangleIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { cn } from "@/lib/cn";

type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const variantConfig: Record<ConfirmVariant, {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  buttonVariant: "danger" | "secondary" | "primary";
}> = {
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
};

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "تایید",
  cancelLabel = "انصراف",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) => {
  const { icon: Icon, iconBg, iconColor, buttonVariant } = variantConfig[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showClose={false}
      closeOnBackdrop={!isLoading}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className={cn("p-4 rounded-full", iconBg)}>
          <Icon className={cn("h-8 w-8", iconColor)} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
};