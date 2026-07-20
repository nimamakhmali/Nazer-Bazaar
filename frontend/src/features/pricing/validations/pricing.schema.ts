import { z } from "zod";

export const officialPriceSchema = z.object({
  union_id: z.number({ required_error: "اتحادیه الزامی است" }),
  product_id: z.number({ required_error: "محصول الزامی است" }),
  price: z
    .number({ required_error: "قیمت الزامی است" })
    .positive("قیمت باید مثبت باشد"),
  effective_date: z.string().optional(),
  expire_date: z.string().optional(),
  description: z.string().optional(),
});

export const storePriceSchema = z.object({
  store_id: z.number({ required_error: "فروشگاه الزامی است" }),
  product_id: z.number({ required_error: "محصول الزامی است" }),
  price: z
    .number({ required_error: "قیمت الزامی است" })
    .positive("قیمت باید مثبت باشد"),
  description: z.string().optional(),
});

export type OfficialPriceFormData = z.infer<typeof officialPriceSchema>;
export type StorePriceFormData = z.infer<typeof storePriceSchema>;
