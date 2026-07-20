import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers"; // 1. این را اضافه کنید
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "سامانه پایش قیمت کالا",
    template: "%s | سامانه پایش قیمت کالا",
  },
  description: "سامانه نظارت بر قیمت کالاهای اتحادیه‌های صنفی",
  keywords: ["قیمت کالا", "اتحادیه", "نظارت", "شکایت"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {/* 2. تمام children را داخل Providers قرار دهید */}
        <Providers>
          {children}
        </Providers>
        
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: "Vazirmatn, Tahoma, sans-serif",
              direction: "rtl",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
            },
            success: {
              style: {
                backgroundColor: "#f0fdf4",
                color: "#166534",
                border: "1px solid #bbf7d0",
              },
            },
            error: {
              style: {
                backgroundColor: "#fef2f2",
                color: "#991b1b",
                border: "1px solid #fecaca",
              },
            },
          }}
        />
      </body>
    </html>
  );
}