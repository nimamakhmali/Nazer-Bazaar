"use client";

import { useState, useEffect } from "react";
import { WifiIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

export function OfflineBanner() {
  const [isOnline,  setIsOnline]  = useState(true);
  const [showBack,  setShowBack]  = useState(false);
  const [visible,   setVisible]   = useState(false);

  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  setShowBack(true); };
    const goOffline = () => { setIsOnline(false); setShowBack(false); setVisible(true); };

    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Hide "back online" banner after 3s
  useEffect(() => {
    if (showBack) {
      setVisible(true);
      const t = setTimeout(() => { setVisible(false); setShowBack(false); }, 3000);
      return () => clearTimeout(t);
    }
  }, [showBack]);

  if (!visible) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2",
      "px-4 py-3 text-sm font-semibold transition-all duration-300",
      isOnline
        ? "bg-green-600 text-white"
        : "bg-red-600 text-white"
    )}>
      {isOnline ? (
        <>
          <WifiIcon className="h-4 w-4" />
          اتصال اینترنت برقرار شد
        </>
      ) : (
        <>
          <ExclamationTriangleIcon className="h-4 w-4" />
          اتصال اینترنت قطع است. برخی امکانات در دسترس نیستند.
        </>
      )}
    </div>
  );
}