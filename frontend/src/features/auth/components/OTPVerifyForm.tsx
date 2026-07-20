"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClockIcon,
  ArrowPathIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { otpCodeSchema, type OTPCodeFormData } from "../validations/auth.schema";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface OTPVerifyFormProps {
  maskedPhone: string;
  countdown: number;
  canResend: boolean;
  isVerifyLoading: boolean;
  isResendLoading: boolean;
  formatCountdown: (s: number) => string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
}

const OTP_LENGTH = 6;

export const OTPVerifyForm = ({
  maskedPhone,
  countdown,
  canResend,
  isVerifyLoading,
  isResendLoading,
  formatCountdown,
  onVerify,
  onResend,
  onBack,
}: OTPVerifyFormProps) => {
  // ─── OTP Inputs state ─────────────────────────────────
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const autoSubmitted = useRef(false);

  const { handleSubmit } = useForm<OTPCodeFormData>({
    resolver: zodResolver(otpCodeSchema),
  });

  // focus اولین input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // بررسی کامل بودن کد
  useEffect(() => {
    const code = otp.join("");
    const complete = code.length === OTP_LENGTH && /^[0-9]+$/.test(code);
    setIsComplete(complete);

    // auto-submit
    if (complete && !autoSubmitted.current) {
      autoSubmitted.current = true;
      onVerify(code);
    }
  }, [otp, onVerify]);

  const handleInput = useCallback(
    (index: number, value: string) => {
      // فقط عدد قبول می‌کنیم
      const digit = value.replace(/[^0-9]/g, "").slice(-1);

      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      // move focus forward
      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        const newOtp = [...otp];
        if (otp[index]) {
          // پاک کردن خانه فعلی
          newOtp[index] = "";
          setOtp(newOtp);
        } else if (index > 0) {
          // رفتن به خانه قبلی
          newOtp[index - 1] = "";
          setOtp(newOtp);
          inputRefs.current[index - 1]?.focus();
        }
        autoSubmitted.current = false;
      }

      if (e.key === "ArrowLeft" && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
      if (e.key === "ArrowRight" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  // paste کد کامل
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, OTP_LENGTH);

    if (pasted.length > 0) {
      const newOtp = Array(OTP_LENGTH).fill("");
      pasted.split("").forEach((char, i) => {
        newOtp[i] = char;
      });
      setOtp(newOtp);
      autoSubmitted.current = false;

      // focus آخرین خانه پر شده
      const lastIndex = Math.min(pasted.length - 1, OTP_LENGTH - 1);
      inputRefs.current[lastIndex]?.focus();
    }
  }, []);

  const handleManualSubmit = handleSubmit(async () => {
    const code = otp.join("");
    await onVerify(code);
  });

  const handleResend = async () => {
    setOtp(Array(OTP_LENGTH).fill(""));
    autoSubmitted.current = false;
    setIsComplete(false);
    inputRefs.current[0]?.focus();
    await onResend();
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-8 border border-slate-100">
      {/* Header */}
      <div className="text-center mb-8">
        <div
          className="inline-flex p-4 rounded-2xl mb-4"
          style={{ backgroundColor: "#eef3fa" }}
        >
          <CheckCircleIcon
            className="h-8 w-8"
            style={{ color: "#1b3a6b" }}
          />
        </div>

        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: "#1b3a6b" }}
        >
          تایید شماره موبایل
        </h2>

        <p className="text-sm text-slate-500 leading-relaxed">
          کد ۶ رقمی ارسال شده به
          <span
            className="font-bold mx-1 tracking-wider"
            style={{ color: "#1b3a6b", direction: "ltr", display: "inline-block" }}
          >
            {maskedPhone}
          </span>
          را وارد کنید
        </p>
      </div>

      {/* OTP Inputs */}
      <div
        className="flex items-center justify-center gap-2 mb-8 flex-row-reverse"
        onPaste={handlePaste}
      >
        {Array.from({ length: OTP_LENGTH }).map((_, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otp[index]}
            onChange={(e) => handleInput(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={(e) => e.target.select()}
            disabled={isVerifyLoading}
            className={cn(
              "w-11 h-14 text-center text-xl font-bold rounded-xl border-2",
              "transition-all duration-150 outline-none",
              "disabled:opacity-50",
            )}
            style={{
              borderColor: otp[index]
                ? "#1b3a6b"
                : isComplete
                ? "#1a7a4a"
                : "#e2e8f0",
              backgroundColor: otp[index] ? "#eef3fa" : "#f8fafc",
              color: "#1b3a6b",
            }}
            aria-label={`رقم ${index + 1} از ${OTP_LENGTH}`}
          />
        ))}
      </div>

      {/* Countdown */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {!canResend ? (
          <div
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-full"
            style={{ backgroundColor: "#f4f6f9", color: "#64748b" }}
          >
            <ClockIcon className="h-4 w-4" style={{ color: "#1b3a6b" }} />
            <span>ارسال مجدد تا</span>
            <span
              className="font-bold tabular-nums"
              style={{ color: "#1b3a6b", direction: "ltr" }}
            >
              {formatCountdown(countdown)}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResendLoading}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-all duration-200"
            style={{
              color: "#1b3a6b",
              backgroundColor: isResendLoading ? "#f4f6f9" : "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#eef3fa";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <ArrowPathIcon
              className={cn("h-4 w-4", isResendLoading && "animate-spin")}
            />
            {isResendLoading ? "در حال ارسال..." : "ارسال مجدد کد"}
          </button>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="button"
        fullWidth
        size="lg"
        isLoading={isVerifyLoading}
        disabled={!isComplete || isVerifyLoading}
        onClick={handleManualSubmit}
        style={
          isComplete
            ? { backgroundColor: "#1b3a6b" }
            : { backgroundColor: "#94a3b8" }
        }
      >
        {isVerifyLoading ? "در حال تایید..." : "تایید و ورود"}
      </Button>

      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        disabled={isVerifyLoading}
        className="flex items-center justify-center gap-1 w-full mt-4 text-sm transition-colors py-2 rounded-lg"
        style={{ color: "#64748b" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#1b3a6b"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; }}
      >
        <ChevronRightIcon className="h-4 w-4" />
        تغییر شماره موبایل
      </button>
    </div>
  );
};