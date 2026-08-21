"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  PhoneIcon,
  LockClosedIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { loginSchema, type LoginFormData } from "../validations/auth.schema";
import { useLogin } from "../hooks/useLogin";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";

export const LoginForm = () => {
  const { login, isLoading } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone_number: "",
      password:     "",
      remember_me:  false,
    },
  });

  const onSubmit: SubmitHandler<LoginFormData> = (data) => login(data);

  return (
    <div className="bg-white rounded-2xl shadow-card p-8 border border-slate-100">
      {/* Header */}
      <div className="text-center mb-8">
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: "#1b3a6b" }}
        >
          ورود به سامانه
        </h2>
        <p className="text-sm text-slate-500">
          برای مدیران، بازرسان و صاحبان فروشگاه
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Phone */}
        <Input
          {...register("phone_number")}
          label="شماره موبایل"
          type="tel"
          placeholder="09123456789"
          error={errors.phone_number?.message}
          required
          autoComplete="tel"
          inputMode="numeric"
          rightIcon={<PhoneIcon className="h-4 w-4" />}
          dir="ltr"
        />

        {/* Password */}
        <Input
          {...register("password")}
          label="رمز عبور"
          type="password"
          placeholder="رمز عبور خود را وارد کنید"
          error={errors.password?.message}
          required
          autoComplete="current-password"
          rightIcon={<LockClosedIcon className="h-4 w-4" />}
        />

        {/* Remember me */}
        <div className="flex items-center justify-between">
          <Checkbox
            {...register("remember_me")}
            label="مرا به خاطر بسپار"
            description="تا ۳۰ روز وارد نشوید"
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          size="lg"
          leftIcon={!isLoading && <ArrowRightOnRectangleIcon className="h-5 w-5" />}
        >
          {isLoading ? "در حال ورود..." : "ورود به سامانه"}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-slate-400">یا</span>
        </div>
      </div>

      {/* OTP Link */}
      <Link
        href="/otp"
        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-200"
        style={{
          borderColor: "#1b3a6b",
          color: "#1b3a6b",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#1b3a6b";
          e.currentTarget.style.color = "#ffffff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#1b3a6b";
        }}
      >
        <PhoneIcon className="h-4 w-4" />
        ورود با کد یکبارمصرف (شهروندان)
      </Link>

      {/* Help text */}
      <p className="text-center text-xs text-slate-400 mt-6">
        در صورت فراموشی رمز عبور با مدیر سامانه تماس بگیرید
      </p>
    </div>
  );
};