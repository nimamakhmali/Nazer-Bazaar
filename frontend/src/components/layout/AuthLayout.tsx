import { ShieldCheckIcon } from "@heroicons/react/24/outline";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="min-h-screen flex" style={{ direction: "rtl" }}>
    {/* Left panel - decorative (فقط دسکتاپ) */}
    <div
      className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f2347 0%, #1b3a6b 50%, #2e6db4 100%)",
      }}
    >
      {/* Background circles */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
        style={{
          backgroundColor: "#ffffff",
          transform: "translate(50%, -50%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10"
        style={{
          backgroundColor: "#ffffff",
          transform: "translate(-50%, 50%)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full opacity-20"
        style={{
          backgroundColor: "#c49a2e",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center text-white max-w-md">
        {/* Logo */}
        <div
          className="inline-flex p-5 rounded-2xl mb-8"
          style={{
            backgroundColor: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
          }}
        >
          <ShieldCheckIcon
            className="h-16 w-16"
            style={{ color: "#c49a2e" }}
          />
        </div>

        <h1 className="text-4xl font-bold mb-4 leading-tight text-white">
          سامانه پایش قیمت کالا
        </h1>

        <p
          className="text-lg leading-relaxed mb-10"
          style={{ color: "#93c5fd" }}
        >
          سامانه نظارت هوشمند بر قیمت‌گذاری<br />
          کالاهای اتحادیه‌های صنفی کشور
        </p>

        {/* Features */}
        <div className="space-y-4 text-right">
          {[
            { text: "نظارت لحظه‌ای بر قیمت‌های فروشگاه‌ها", color: "#4ade80" },
            { text: "ثبت و پیگیری آسان شکایات",              color: "#4ade80" },
            { text: "شفافیت در قیمت‌گذاری برای مردم",        color: "#4ade80" },
            { text: "گزارش‌گیری جامع برای مدیران",           color: "#4ade80" },
          ].map((feature) => (
            <div key={feature.text} className="flex items-center gap-3">
              <div
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: feature.color }}
              />
              <p className="text-sm" style={{ color: "#e0e7ff" }}>
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Version */}
      <p
        className="absolute bottom-6 text-xs"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        نسخه ۱.۰.۰ | وزارت صنعت، معدن و تجارت
      </p>
    </div>

    {/* Right panel - form */}
    <div
      className="flex-1 flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: "#f4f6f9" }}
    >
      {/* Mobile logo */}
      <div className="lg:hidden mb-8 text-center">
        <div
          className="inline-flex p-4 rounded-2xl mb-4"
          style={{ backgroundColor: "#1b3a6b" }}
        >
          <ShieldCheckIcon
            className="h-10 w-10"
            style={{ color: "#c49a2e" }}
          />
        </div>
        <h1
          className="text-xl font-bold"
          style={{ color: "#1b3a6b" }}
        >
          سامانه پایش قیمت کالا
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          نظارت بر قیمت‌گذاری اتحادیه‌های صنفی
        </p>
      </div>

      {/* Form container */}
      <div className="w-full max-w-md">
        {children}
      </div>

      <p className="mt-8 text-xs text-center" style={{ color: "#94a3b8" }}>
        سامانه پایش قیمت کالا — کلیه حقوق محفوظ است
      </p>
    </div>
  </div>
);