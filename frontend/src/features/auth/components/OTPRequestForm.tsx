"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { PhoneIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { otpPhoneSchema, type OTPPhoneFormData } from "../validations/auth.schema";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface OTPRequestFormProps {
  onSubmit: (phone: string) => Promise<void>;
  isLoading: boolean;
}

export const OTPRequestForm = ({ onSubmit, isLoading }: OTPRequestFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OTPPhoneFormData>({
    resolver: zodResolver(otpPhoneSchema),
    defaultValues: { phone_number: "" },
  });

  const handleFormSubmit = async (data: OTPPhoneFormData) => {
    await onSubmit(data.phone_number);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-8 border border-slate-100">
      {/* Header */}
      <div className="text-center mb-8">
        {/* Icon */}
        <div
          className="inline-flex p-4 rounded-2xl mb-4"
          style={{ backgroundColor: "#eef3fa" }}
        >
          <DevicePhoneMobileIcon
            className="h-8 w-8"
            style={{ color: "#1b3a6b" }}
          />
        </div>

        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: "#1b3a6b" }}
        >
          ورود با کد یکبارمصرف
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          برای ثبت شکایت یا مشاهده قیمت‌ها<br />
          شماره موبایل خود را وارد کنید
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="space-y-5"
        noValidate
      >
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
          hint="کد تایید به این شماره ارسال خواهد شد"
          dir="ltr"
        />

        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          size="lg"
        >
          {isLoading ? "در حال ارسال..." : "ارسال کد تایید"}
        </Button>
      </form>

      {/* Back to login */}
      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm font-medium transition-colors"
          style={{ color: "#1b3a6b" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#0f2347";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#1b3a6b";
          }}
        >
          ← بازگشت به صفحه ورود
        </Link>
      </div>

      {/* Info */}
      <div
        className="mt-6 p-4 rounded-xl text-xs text-center leading-relaxed"
        style={{
          backgroundColor: "#f4f6f9",
          color: "#64748b",
        }}
      >
        کد تایید پیامک می‌شود و تا ۲ دقیقه اعتبار دارد
      </div>
    </div>
  );
};