import type { Metadata } from "next";
import { OTPPageClient } from "./OTPPageClient";

export const metadata: Metadata = {
  title: "ورود با کد یکبارمصرف",
  description: "ورود شهروندان به سامانه پایش قیمت کالا",
};

export default function OTPPage() {
  return <OTPPageClient />;
}