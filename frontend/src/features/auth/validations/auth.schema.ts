import { z } from "zod";

// شماره موبایل ایرانی
const phoneRegex = /^09[0-9]{9}$/;

export const loginSchema = z.object({
  phone_number: z
    .string({ error: "شماره موبایل الزامی است" })
    .min(1, "شماره موبایل الزامی است")
    .regex(phoneRegex, "شماره موبایل معتبر نیست (مثال: 09123456789)"),
  password: z
    .string({ error: "رمز عبور الزامی است" })
    .min(1, "رمز عبور الزامی است")
    .min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
  remember_me: z.boolean().optional().default(false),
});

export const otpPhoneSchema = z.object({
  phone_number: z
    .string({ error: "شماره موبایل الزامی است" })
    .min(1, "شماره موبایل الزامی است")
    .regex(phoneRegex, "شماره موبایل معتبر نیست (مثال: 09123456789)"),
});

export const otpCodeSchema = z.object({
  code: z
    .string({ error: "کد تایید الزامی است" })
    .min(4, "کد تایید باید ۴ تا ۶ رقم باشد")
    .max(6, "کد تایید باید ۴ تا ۶ رقم باشد")
    .regex(/^[0-9]+$/, "کد تایید باید فقط عدد باشد"),
});

export type LoginFormData    = z.infer<typeof loginSchema>;
export type OTPPhoneFormData = z.infer<typeof otpPhoneSchema>;
export type OTPCodeFormData  = z.infer<typeof otpCodeSchema>;