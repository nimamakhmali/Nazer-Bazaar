
import Link from "next/link";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";

export default function HomePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8"
      style={{ backgroundColor: "#ebeef4" }}
    >
      {/* Logo */}
      <div className="text-center">
        <div
          className="inline-flex p-5 rounded-2xl mb-6"
          style={{ backgroundColor: "#123368" }}
        >
          <ShieldCheckIcon className="h-14 w-14" style={{ color: "#ddb559" }} />
        </div>
        <h1
          className="text-4xl font-bold mb-3"
          style={{ color: "#10336b" }}
        >
          سامانه هوشمند ناظر 724 
        </h1>
        <p className="text-lg text-slate-500">
          سامانه نظارت بر قیمت کالاهای اتحادیه‌های صنفی
        </p>
      </div>

      {/* Status */}
      <div className="card p-6 max-w-md w-full mx-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-sm font-medium text-green-700">
          
          </span>
        </div>
        <p className="text-sm text-slate-600 mb-4">
         
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="btn-primary text-sm"
          >
            ورود به سامانه
          </Link>
          <Link
            href="/prices"
            className="btn-outline text-sm"
          >
            قیمت‌های امروز
          </Link>
        </div>
      </div>

      {/* Tech stack */}
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span>*Blueup* Team Developer</span>
        <span>نسخه 1.0</span>
      </div>
    </div>
  );
}
