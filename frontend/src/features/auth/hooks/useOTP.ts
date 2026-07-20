"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store";
import { authService } from "../services/auth.service";
import { parseApiError } from "@/utils/error.utils";
import type { AuthStep } from "../types/auth.types";

const OTP_COUNTDOWN = 120;

export const useOTP = () => {
  const router    = useRouter();
  const { setAuth } = useAuthStore();

  const [step,             setStep]             = useState<AuthStep>("phone");
  const [phoneNumber,      setPhoneNumber]      = useState("");
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [isVerifyLoading,  setIsVerifyLoading]  = useState(false);
  const [countdown,        setCountdown]        = useState(0);
  const [canResend,        setCanResend]        = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(OTP_COUNTDOWN);
    setCanResend(false);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatCountdown = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, []);

  const getMaskedPhone = useCallback((phone: string): string => {
    if (phone.length !== 11) return phone;
    return `${phone.slice(0, 2)}**${phone.slice(4)}`;
  }, []);

  const requestOTP = async (phone: string) => {
    setIsRequestLoading(true);
    try {
      await authService.requestOTP({ phone_number: phone });
      setPhoneNumber(phone);
      setStep("code");
      startCountdown();
      toast.success("کد تایید ارسال شد");
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setIsRequestLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!canResend) return;
    setIsRequestLoading(true);
    try {
      await authService.requestOTP({ phone_number: phoneNumber });
      startCountdown();
      toast.success("کد جدید ارسال شد");
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setIsRequestLoading(false);
    }
  };

  const verifyOTP = async (code: string) => {
    setIsVerifyLoading(true);
    try {
      const response = await authService.verifyOTP({
        phone_number: phoneNumber,
        code,
      });

      // ✅ Backend: { success, message, data: { access, refresh, user, is_new_user? } }
      const { user, access, refresh, is_new_user } = response.data.data;

      setAuth(user, access, refresh);

      toast.success(`خوش آمدید${user.full_name ? `، ${user.full_name}` : ""}!`);

      if (is_new_user || !user.first_name) {
        router.replace("/profile?onboarding=true");
      } else {
        router.replace("/customer/overview");
      }

    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setIsVerifyLoading(false);
    }
  };

  const goBack = () => {
    setStep("phone");
    setCountdown(0);
    setCanResend(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return {
    step,
    phoneNumber,
    countdown,
    canResend,
    isRequestLoading,
    isVerifyLoading,
    formatCountdown,
    getMaskedPhone,
    requestOTP,
    resendOTP,
    verifyOTP,
    goBack,
  };
};