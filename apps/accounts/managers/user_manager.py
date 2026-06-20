"""
User Manager سفارشی

چون از AbstractBaseUser استفاده می‌کنیم،
باید Manager سفارشی برای ایجاد کاربر بنویسیم.
فیلد اصلی احراز هویت: phone_number (به جای username)
"""
from django.contrib.auth.base_user import BaseUserManager
from apps.common.validators import normalize_mobile


class UserManager(BaseUserManager):

    def create_user(
        self,
        phone_number: str,
        password: str = None,
        **extra_fields
    ):
        """
        ایجاد کاربر عادی.

        Args:
            phone_number: شماره موبایل (فیلد اصلی)
            password: رمز عبور (اختیاری - برای کاربران OTP محور)
            **extra_fields: سایر فیلدهای مدل User
        """
        if not phone_number:
            raise ValueError('شماره موبایل الزامی است')

        phone_number = normalize_mobile(phone_number)

        user = self.model(
            phone_number=phone_number,
            **extra_fields
        )

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        phone_number: str,
        password: str,
        **extra_fields
    ):
        """
        ایجاد superuser برای دسترسی به Django Admin.
        """
        from apps.common.choices import UserRole

        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', UserRole.ADMIN)

        if not extra_fields.get('is_staff'):
            raise ValueError('Superuser باید is_staff=True داشته باشد')
        if not extra_fields.get('is_superuser'):
            raise ValueError('Superuser باید is_superuser=True داشته باشد')

        return self.create_user(phone_number, password, **extra_fields)

    def get_by_phone(self, phone_number: str):
        """
        دریافت کاربر با شماره موبایل.
        شماره را normalize می‌کند تا فرمت‌های مختلف پشتیبانی شوند.
        """
        normalized = normalize_mobile(phone_number)
        try:
            return self.get(phone_number=normalized)
        except self.model.DoesNotExist:
            return None