"use client";

import { useOTP } from "@/features/auth/hooks/useOTP";
import { OTPRequestForm } from "@/features/auth/components/OTPRequestForm";
import { OTPVerifyForm } from "@/features/auth/components/OTPVerifyForm";

export const OTPPageClient = () => {
  const {
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
  } = useOTP();

  if (step === "phone") {
    return (
      <OTPRequestForm
        onSubmit={requestOTP}
        isLoading={isRequestLoading}
      />
    );
  }

  return (
    <OTPVerifyForm
      maskedPhone={getMaskedPhone(phoneNumber)}
      countdown={countdown}
      canResend={canResend}
      isVerifyLoading={isVerifyLoading}
      isResendLoading={isRequestLoading}
      formatCountdown={formatCountdown}
      onVerify={verifyOTP}
      onResend={resendOTP}
      onBack={goBack}
    />
  );
};