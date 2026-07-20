import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "ورود به سامانه",
  description: "ورود کاربران سازمانی به سامانه پایش قیمت کالا",
};

export default function LoginPage() {
  return <LoginForm />;
}