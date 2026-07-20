import { z } from "zod";

export const storeRegisterSchema = z.object({
  union_id: z.number({ required_error: "اتحادیه الزامی است" }),
  name: z.string().min(2, "نام فروشگاه حداقل ۲ کاراکتر").max(100),
  license_number: z.string().min(3, "شماره پروانه الزامی است"),
  address: z.string().min(10, "آدرس حداقل ۱۰ کاراکتر"),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  postal_code: z.string().optional(),
  description: z.string().optional(),
});

export type StoreRegisterFormData = z.infer<typeof storeRegisterSchema>;
