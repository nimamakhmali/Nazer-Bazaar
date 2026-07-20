"""
Auth Service - منطق احراز هویت

مسئولیت‌ها:
1. ورود با OTP (شماره موبایل + کد تایید)
2. ثبت‌نام کاربر جدید
3. خروج از سیستم
4. رفرش توکن
"""
import logging
from typing import Tuple
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.base import BaseService
from apps.common.choices import UserRole
from apps.common.exceptions import AuthenticationError
from apps.common.validators import normalize_mobile

from apps.accounts.models import User
from apps.accounts.selectors import UserSelector
from apps.accounts.services.otp_service import OTPService

logger = logging.getLogger(__name__)


class AuthService(BaseService):

    def __init__(self):
        self.otp_service = OTPService()

    def request_otp(
        self,
        *,
        phone_number: str,
        ip_address: str = None
    ) -> dict:
        """
        مرحله اول ورود: درخواست کد OTP.

        اگر کاربر وجود نداشته باشد، به صورت خودکار
        یک حساب Customer ایجاد می‌شود.

        Returns:
            dict: اطلاعات مربوط به کد ارسال‌شده
        """
        phone_number = normalize_mobile(phone_number)

        # اگر کاربر وجود نداشت، ثبت‌نام خودکار
        user, created = User.objects.get_or_create(
            phone_number=phone_number,
            defaults={
                'role': UserRole.CUSTOMER,
                'is_active': True,
            }
        )

        if not user.is_active:
            raise AuthenticationError(
                'حساب کاربری شما غیرفعال شده است. '
                'با پشتیبانی تماس بگیرید.'
            )

        verify_code = self.otp_service.send_otp(
            phone_number=phone_number,
            ip_address=ip_address
        )

        return {
            'phone_number': phone_number,
            'expires_in': verify_code.remaining_seconds,
            'is_new_user': created,
        }

    def verify_otp_and_login(
        self,
        *,
        phone_number: str,
        code: str
    ) -> Tuple[User, dict]:
        """
        مرحله دوم ورود: اعتبارسنجی OTP و صدور توکن.

        Returns:
            Tuple[User, dict]: کاربر و توکن‌های JWT
        """
        phone_number = normalize_mobile(phone_number)

        # اعتبارسنجی OTP
        self.otp_service.verify_otp(
            phone_number=phone_number,
            code=code
        )

        # دریافت کاربر
        user = UserSelector.get_by_phone(phone_number)
        if not user:
            raise AuthenticationError('کاربری با این شماره یافت نشد')

        if not user.is_active:
            raise AuthenticationError('حساب کاربری غیرفعال است')

        # تایید موبایل (اگر اولین بار است)
        if not user.is_phone_verified:
            user.verify_phone()

        # به‌روزرسانی آخرین ورود
        user.update_last_login()

        # تولید توکن JWT
        tokens = self._generate_tokens(user)

        self.log_info(
            f'User logged in: {phone_number}',
            user_id=user.id,
            role=user.role
        )

        return user, tokens

    def login_with_password(
        self,
        *,
        phone_number: str,
        password: str
    ) -> Tuple[User, dict]:
        """
        ورود با رمز عبور (برای ادمین و کاربران سازمانی).

        Returns:
            Tuple[User, dict]: کاربر و توکن‌های JWT
        """
        phone_number = normalize_mobile(phone_number)

        user = User.objects.filter(
            phone_number=phone_number
        ).first()

        if not user or not user.check_password(password):
            raise AuthenticationError(
                'شماره موبایل یا رمز عبور اشتباه است'
            )

        if not user.is_active:
            raise AuthenticationError('حساب کاربری غیرفعال است')

        user.update_last_login()
        tokens = self._generate_tokens(user)

        self.log_info(
            f'User logged in with password: {phone_number}',
            user_id=user.id
        )

        return user, tokens

    def logout(self, *, refresh_token: str) -> None:
        """
        خروج از سیستم با blacklist کردن refresh token.
        """
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception as e:
            logger.warning(f'Logout error: {str(e)}')

    def refresh_access_token(
                             self,
                             *,
                             refresh_token: str
                                                ) -> dict:
        """
        تمدید access token با refresh token.
        """
        try:
            token = RefreshToken(refresh_token)
            return {
                'access': str(token.access_token),
            }
        except Exception:
            raise AuthenticationError('توکن نامعتبر یا منقضی شده است')

    @staticmethod
    def _generate_tokens(user: User) -> dict:
        """تولید JWT tokens برای کاربر"""
        refresh = RefreshToken.for_user(user)

        # اضافه کردن claim های سفارشی
        refresh['role'] = user.role
        refresh['phone'] = user.phone_number
        refresh['full_name'] = user.full_name

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }