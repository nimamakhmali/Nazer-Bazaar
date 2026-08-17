import { z } from "zod";

export const complaintSchema = z.object({
  store: z.number({ error: "انتخاب فروشگاه الزامی است" }),
  product: z.number({ error: "انتخاب محصول الزامی است" }),
  title: z.string().min(5, "عنوان حداقل ۵ کاراکتر").max(200),
  description: z.string().min(20, "شرح شکایت حداقل ۲۰ کاراکتر"),
  price_reported: z
    .number({ error: "قیمت پرداختی الزامی است" })
    .positive("قیمت باید مثبت باشد"),
});

export type ComplaintFormData = z.infer<typeof complaintSchema>;
