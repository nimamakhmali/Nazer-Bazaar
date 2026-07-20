"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { useAuthStore } from "@/store";
import { authService } from "../services/auth.service";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";

interface LogoutButtonProps {
  variant?: "button" | "menu-item";
  className?: string;
}

export const LogoutButton = ({
  variant = "button",
  className,
}: LogoutButtonProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch {
      // حتی اگر خطا داشت logout می‌کنیم
    } finally {
      logout();
      router.replace("/login");
    }
  };

  if (variant === "menu-item") {
    return (
      <>
        <button
          onClick={() => setShowConfirm(true)}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg",
            "text-red-600 hover:bg-red-50 transition-colors",
            className
          )}
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          خروج از سامانه
        </button>

        <ConfirmDialog
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleLogout}
          title="خروج از سامانه"
          message="آیا می‌خواهید از سامانه خارج شوید؟"
          confirmLabel="بله، خارج می‌شوم"
          cancelLabel="انصراف"
          variant="warning"
          isLoading={isLoading}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="danger"
        onClick={() => setShowConfirm(true)}
        leftIcon={<ArrowRightOnRectangleIcon className="h-4 w-4" />}
        className={className}
      >
        خروج
      </Button>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleLogout}
        title="خروج از سامانه"
        message="آیا می‌خواهید از سامانه خارج شوید؟"
        confirmLabel="بله، خارج می‌شوم"
        cancelLabel="انصراف"
        variant="warning"
        isLoading={isLoading}
      />
    </>
  );
};