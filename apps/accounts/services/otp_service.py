"""
OTP Service - مدیریت کدهای تایید یک‌بار مصرف

مسئولیت‌ها:
1. ارسال کد OTP به موبایل
2. اعتبارسنجی کد OTP
3. کنترل تعداد درخواست‌ها
"""
import logging
from apps.common.base import BaseService
from apps.common.constants import OTP_MAX_ATTEMPTS
from apps.common.exceptions import (
    OTPExpiredError,
    OTPInvalidError,
    MaxOTPAttemptsExceeded,
)
from apps.accounts.models import VerifyCode
from apps.accounts.selectors import VerifyCodeSelector

logger = logging.getLogger(__name__)

# حداکثر تعداد ارسال OTP در ساعت
MAX_OTP_REQUESTS_PER_HOUR = 5


class OTPService(BaseService):

    def send_otp(
        self,
        *,
        phone_number: str,
        ip_address: str = None
    ) -> VerifyCode:
        """
        ارسال کد OTP به شماره موبایل.

        Args:
            phone_number: شماره موبایل
            ip_address: آدرس IP درخواست‌کننده

        Returns:
            VerifyCode: رکورد کد ایجاد‌شده

        Raises:
            MaxOTPAttemptsExceeded: اگر تعداد درخواست‌ها بیش از حد باشد
        """
        from apps.common.validators import normalize_mobile
        phone_number = normalize_mobile(phone_number)

        # بررسی تعداد درخواست‌ها در ساعت گذشته
        attempts = VerifyCodeSelector.get_attempts_count(
            phone_number,
            minutes=60
        )
        if attempts >= MAX_OTP_REQUESTS_PER_HOUR:
            raise MaxOTPAttemptsExceeded(
                'تعداد درخواست کد تایید بیش از حد مجاز است. '
                'لطفاً یک ساعت دیگر تلاش کنید.'
            )

        with self.transaction():
            verify_code = VerifyCode.create_for_phone(
                phone_number=phone_number,
                ip_address=ip_address
            )

        # ارسال SMS
        self._send_sms(
            phone_number=phone_number,
            code=verify_code.code
        )

        self.log_info(
            f'OTP sent to {phone_number}',
            phone=phone_number,
            ip=ip_address
        )

        return verify_code

    def verify_otp(
        self,
        *,
        phone_number: str,
        code: str
    ) -> bool:
        """
        اعتبارسنجی کد OTP.

        Args:
            phone_number: شماره موبایل
            code: کد وارد شده توسط کاربر

        Returns:
            True اگر کد معتبر باشد

        Raises:
            OTPExpiredError: اگر کد منقضی شده باشد
            OTPInvalidError: اگر کد اشتباه باشد
            MaxOTPAttemptsExceeded: اگر تعداد تلاش‌ها بیش از حد باشد
        """
        from apps.common.validators import normalize_mobile
        phone_number = normalize_mobile(phone_number)

        verify_code = VerifyCodeSelector.get_latest_valid(phone_number)

        if not verify_code:
            raise OTPExpiredError()

        # بررسی تعداد تلاش‌های ناموفق
        if verify_code.attempts >= OTP_MAX_ATTEMPTS:
            raise MaxOTPAttemptsExceeded(
                'تعداد تلاش‌های ناموفق بیش از حد مجاز است. '
                'لطفاً کد جدید دریافت کنید.'
            )

        # بررسی انقضا
        if verify_code.is_expired:
            raise OTPExpiredError()

        # بررسی صحت کد
        if verify_code.code != code:
            verify_code.increment_attempts()
            raise OTPInvalidError()

        # کد معتبر است
        with self.transaction():
            verify_code.mark_as_used()

        return True

    @staticmethod
    def _send_sms(phone_number: str, code: str) -> None:
        """
        ارسال SMS از طریق سرویس پیامک.
        در محیط توسعه فقط لاگ می‌زند.
        """
        from django.conf import settings

        message = f'کد تایید سامانه پایش قیمت: {code}'

        if settings.DEBUG:
            logger.info(
                f'[DEV] SMS to {phone_number}: {message}'
            )
            return

        try:
            from kavenegar import KavenegarAPI, APIException, HTTPException
            api = KavenegarAPI(settings.KAVENEGAR_API_KEY)
            api.sms_send({
                'sender': settings.KAVENEGAR_SENDER,
                'receptor': phone_number,
                'message': message,
            })
        except Exception as e:
            logger.error(
                f'SMS sending failed for {phone_number}: {str(e)}'
            )