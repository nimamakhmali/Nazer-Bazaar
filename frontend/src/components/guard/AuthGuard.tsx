"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store";
import { useMe } from "@/features/auth/hooks/useMe";
import { PageLoader } from "@/components/ui/Spinner";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const router      = useRouter();
  const pathname    = usePathname();
  const { isAuthenticated, isLoading, isInitialized } = useAuthStore();

  // فقط یک بار fetch می‌کند
  useMe();

  useEffect(() => {
    // صبر می‌کنیم تا initialize شود
    if (!isInitialized) return;
    // اگر لاگین نیست به صفحه لاگین می‌رود
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isInitialized]); // pathname را حذف کردیم تا loop نشود

  if (!isInitialized || isLoading) {
    return <PageLoader label="در حال بارگذاری..." />;
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
};