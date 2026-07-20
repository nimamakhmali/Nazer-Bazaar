"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheckIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

const NAV_LINKS = [
  { href: "/",               label: "صفحه اصلی"     },
  { href: "/prices",         label: "قیمت‌های امروز" },
  { href: "/stores",         label: "فروشگاه‌ها"      },
  { href: "/complaints/new", label: "ثبت شکایت"      },
  { href: "/blogs",          label: "اخبار"           },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 shadow-header border-b border-primary-800"
        style={{ backgroundColor: "#0F2347" }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            >
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#C49A2E" }}
              >
                <ShieldCheckIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-black text-sm text-white leading-tight">
                  سامانه ناظر ۷۲۴
                </p>
                <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.5)" }}>
                  نظارت بر قیمت کالا
                </p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color        = "#fff";
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color           = "rgba(255,255,255,0.8)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link href="/login">
                <span
                  className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm
                             font-bold text-white cursor-pointer transition-all"
                  style={{ backgroundColor: "#C49A2E" }}
                >
                  ورود به سیستم
                </span>
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden p-2 rounded-lg text-white/80 hover:text-white
                           hover:bg-white/10 transition-colors"
              >
                {mobileOpen
                  ? <XMarkIcon   className="h-5 w-5" />
                  : <Bars3Icon   className="h-5 w-5" />
                }
              </button>
            </div>
          </div>

          {/* Mobile Nav */}
          {mobileOpen && (
            <div className="md:hidden py-3 border-t border-white/10 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 rounded-lg text-sm font-medium
                             text-white/80 hover:text-white hover:bg-white/10
                             transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <span
                  className="block px-4 py-2.5 rounded-lg text-sm font-bold
                             text-white text-center mt-2"
                  style={{ backgroundColor: "#C49A2E" }}
                >
                  ورود به سیستم
                </span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ── */}
      <footer
        className="py-8 text-center"
        style={{ backgroundColor: "#0F2347" }}
      >
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          سامانه هوشمند ناظر ۷۲۴ — نظارت بر قیمت کالاهای اتحادیه‌های صنفی
        </p>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
          نسخه ۱.۰ · Blueup Team
        </p>
      </footer>
    </div>
  );
}