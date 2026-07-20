"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store";
import type { Role } from "@/types/common.types";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  /** redirect به جای نمایش پیام خطا */
  redirectTo?: string;
  /** نمایش 403 page به جای redirect */
  showForbidden?: boolean;
}

const ForbiddenPage = () => (
  <div className="min-h-[500px] flex flex-col items-center justify-center gap-6 text-center px-4">
    <div
      className="p-6 rounded-full"
      style={{ backgroundColor: "#fef2f2" }}
    >
      <ShieldExclamationIcon
        className="h-16 w-16"
        style={{ color: "#c0392b" }}
      />
    </div>

    <div>
      <h2
        className="text-2xl font-bold mb-3"
        style={{ color: "#1b3a6b" }}
      >
        دسترسی ندارید
      </h2>
      <p className="text-slate-500 max-w-sm leading-relaxed">
        شما مجاز به مشاهده این صفحه نیستید.
        اگر فکر می‌کنید این اشتباه است با مدیر سامانه تماس بگیرید.
      </p>
    </div>

    <div className="flex gap-3">
      <Link href="/dashboard">
        <Button variant="primary">بازگشت به داشبورد</Button>
      </Link>
      <Link href="/">
        <Button variant="outline">صفحه اصلی</Button>
      </Link>
    </div>
  </div>
);

export const RoleGuard = ({
  allowedRoles,
  children,
  redirectTo,
  showForbidden = true,
}: RoleGuardProps) => {
  const router = useRouter();
  const { user, hasRole } = useAuthStore();
  const allowed = hasRole(allowedRoles);

  useEffect(() => {
    if (user && !allowed && redirectTo) {
      router.replace(redirectTo);
    }
  }, [user, allowed, redirectTo, router]);

  if (!user) return null;
  if (!allowed) {
    if (redirectTo) return null;
    if (showForbidden) return <ForbiddenPage />;
    return null;
  }

  return <>{children}</>;
};