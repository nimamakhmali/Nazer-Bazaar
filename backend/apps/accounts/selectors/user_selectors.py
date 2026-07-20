"""
User Selectors - تمام کوئری‌های مربوط به کاربران
"""
from typing import Optional
from django.db.models import QuerySet, Q
from apps.common.base import BaseSelector
from apps.common.choices import UserRole
from apps.accounts.models import User, VerifyCode


class UserSelector(BaseSelector):

    @staticmethod
    def get_by_id(user_id: int) -> Optional[User]:
        """دریافت کاربر با ID"""
        return UserSelector.get_or_none(User, id=user_id, is_active=True)

    @staticmethod
    def get_by_phone(phone_number: str) -> Optional[User]:
        """دریافت کاربر با شماره موبایل"""
        from apps.common.validators import normalize_mobile
        normalized = normalize_mobile(phone_number)
        return UserSelector.get_or_none(
            User,
            phone_number=normalized,
            is_active=True
        )

    @staticmethod
    def get_by_national_code(national_code: str) -> Optional[User]:
        """دریافت کاربر با کد ملی"""
        return UserSelector.get_or_none(
            User,
            national_code=national_code
        )

    @staticmethod
    def get_by_role(role: str) -> QuerySet:
        """دریافت همه کاربران با نقش مشخص"""
        return User.objects.filter(
            role=role,
            is_active=True
        ).order_by('-date_joined')

    @staticmethod
    def get_province_managers() -> QuerySet:
        """تمام ناظران استانداری"""
        return UserSelector.get_by_role(UserRole.PROVINCE_MANAGER)

    @staticmethod
    def get_chamber_managers() -> QuerySet:
        """تمام مدیران اتاق اصناف"""
        return UserSelector.get_by_role(UserRole.CHAMBER_MANAGER)

    @staticmethod
    def get_union_managers() -> QuerySet:
        """تمام روسای اتحادیه"""
        return UserSelector.get_by_role(UserRole.UNION_MANAGER)

    @staticmethod
    def get_store_owners() -> QuerySet:
        """تمام صاحبان فروشگاه"""
        return UserSelector.get_by_role(UserRole.STORE_OWNER)

    @staticmethod
    def get_all_active() -> QuerySet:
        """تمام کاربران فعال"""
        return User.objects.filter(
            is_active=True
        ).order_by('-date_joined')

    @staticmethod
    def search(query: str) -> QuerySet:
        """
        جستجو در کاربران.
        بر اساس نام، موبایل یا کد ملی
        """
        return User.objects.filter(
            is_active=True
        ).filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(phone_number__icontains=query) |
            Q(national_code__icontains=query)
        ).order_by('-date_joined')

    @staticmethod
    def phone_exists(
        phone_number: str,
        exclude_id: int = None
    ) -> bool:
        """بررسی وجود شماره موبایل"""
        from apps.common.validators import normalize_mobile
        normalized = normalize_mobile(phone_number)
        qs = User.objects.filter(phone_number=normalized)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    @staticmethod
    def national_code_exists(
        national_code: str,
        exclude_id: int = None
    ) -> bool:
        """بررسی وجود کد ملی"""
        qs = User.objects.filter(national_code=national_code)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()


class VerifyCodeSelector(BaseSelector):

    @staticmethod
    def get_latest_valid(phone_number: str) -> Optional[VerifyCode]:
        """
        آخرین کد OTP معتبر برای یک شماره موبایل.
        معتبر = استفاده نشده و منقضی نشده
        """
        from django.utils import timezone
        return VerifyCode.objects.filter(
            phone_number=phone_number,
            is_used=False,
            expires_at__gt=timezone.now()
        ).order_by('-created_at').first()

    @staticmethod
    def get_attempts_count(
        phone_number: str,
        minutes: int = 60
    ) -> int:
        """
        تعداد درخواست OTP در بازه زمانی مشخص.
        برای جلوگیری از abuse استفاده می‌شود.
        """
        from django.utils import timezone
        from datetime import timedelta
        since = timezone.now() - timedelta(minutes=minutes)
        return VerifyCode.objects.filter(
            phone_number=phone_number,
            created_at__gte=since
        ).count()