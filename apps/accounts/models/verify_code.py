"""
مدل کد تایید OTP

هر بار که کاربر درخواست کد OTP می‌کند،
یک رکورد جدید در این جدول ایجاد می‌شود.
"""
import random
import string
from django.db import models
from django.utils import timezone
from apps.common.base import BaseModel
from apps.common.constants import OTP_EXPIRE_SECONDS, OTP_LENGTH


class VerifyCode(BaseModel):
    """
    کدهای تایید یک‌بار مصرف (OTP).

    چرخه حیات:
        1. کاربر شماره موبایل وارد می‌کند
        2. یک VerifyCode ایجاد می‌شود و کد به موبایل ارسال می‌شود
        3. کاربر کد را وارد می‌کند
        4. سیستم کد را بررسی می‌کند (is_expired, is_used)
        5. در صورت صحت، is_used=True می‌شود و کاربر وارد سیستم می‌شود
    """
    phone_number = models.CharField(
        max_length=15,
        verbose_name='شماره موبایل',
        db_index=True
    )
    code = models.CharField(
        max_length=10,
        verbose_name='کد تایید'
    )
    is_used = models.BooleanField(
        default=False,
        verbose_name='استفاده شده'
    )
    expires_at = models.DateTimeField(
        verbose_name='زمان انقضا'
    )
    attempts = models.PositiveSmallIntegerField(
        default=0,
        verbose_name='تعداد تلاش‌های ناموفق'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='آدرس IP'
    )

    class Meta:
        db_table = 'accounts_verify_code'
        verbose_name = 'کد تایید'
        verbose_name_plural = 'کدهای تایید'
        ordering = ['-created_at']
        indexes = [
            models.Index(
                fields=['phone_number', 'is_used'],
                name='idx_verify_phone_used'
            ),
        ]

    def __str__(self) -> str:
        return f'{self.phone_number} - {self.code}'

    # ─── Class Methods ───────────────────────────────────────────────────────
    @classmethod
    def generate_code(cls) -> str:
        """تولید کد OTP تصادفی عددی"""
        return ''.join(
            random.choices(string.digits, k=OTP_LENGTH)
        )

    @classmethod
    def create_for_phone(
        cls,
        phone_number: str,
        ip_address: str = None
    ) -> 'VerifyCode':
        """
        ایجاد کد OTP جدید برای شماره موبایل.
        کدهای قبلی این شماره را غیرفعال می‌کند.
        """
        # غیرفعال کردن کدهای قبلی
        cls.objects.filter(
            phone_number=phone_number,
            is_used=False
        ).update(is_used=True)

        # ایجاد کد جدید
        code = cls.generate_code()
        expires_at = timezone.now() + timezone.timedelta(
            seconds=OTP_EXPIRE_SECONDS
        )

        return cls.objects.create(
            phone_number=phone_number,
            code=code,
            expires_at=expires_at,
            ip_address=ip_address
        )

    # ─── Properties ─────────────────────────────────────────────────────────
    @property
    def is_expired(self) -> bool:
        """آیا کد منقضی شده است؟"""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self) -> bool:
        """آیا کد هنوز قابل استفاده است؟"""
        return not self.is_used and not self.is_expired

    @property
    def remaining_seconds(self) -> int:
        """ثانیه‌های باقی‌مانده تا انقضا"""
        if self.is_expired:
            return 0
        delta = self.expires_at - timezone.now()
        return max(0, int(delta.total_seconds()))

    # ─── Methods ────────────────────────────────────────────────────────────
    def mark_as_used(self) -> None:
        """علامت‌گذاری کد به عنوان استفاده‌شده"""
        self.is_used = True
        self.save(update_fields=['is_used', 'updated_at'])

    def increment_attempts(self) -> None:
        """افزایش تعداد تلاش‌های ناموفق"""
        self.attempts += 1
        self.save(update_fields=['attempts', 'updated_at'])