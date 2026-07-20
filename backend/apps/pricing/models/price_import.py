"""
مدل ورود انبوه قیمت (PriceImport)

رئیس اتحادیه می‌تواند قیمت‌های مصوب را از طریق
فایل Excel به صورت انبوه وارد سیستم کند.
"""
from django.db import models
from django.conf import settings
from apps.common.base import BaseModel
from apps.common.choices import PriceImportStatus


class PriceImport(BaseModel):
    """
    لاگ هر بار import قیمت از Excel.
    """
    union = models.ForeignKey(
        'organizations.Union',
        on_delete=models.CASCADE,
        related_name='price_imports',
        verbose_name='اتحادیه'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='price_imports',
        verbose_name='آپلود شده توسط'
    )
    file = models.FileField(
        upload_to='pricing/imports/%Y/%m/',
        verbose_name='فایل Excel'
    )
    effective_date = models.DateField(
        verbose_name='تاریخ اعتبار قیمت‌ها',
        help_text='تاریخی که قیمت‌های این فایل از آن معتبر هستند'
    )
    status = models.CharField(
        max_length=20,
        choices=PriceImportStatus.choices,
        default=PriceImportStatus.PENDING,
        verbose_name='وضعیت',
        db_index=True
    )

    # ─── نتیجه پردازش ────────────────────────────────────────────────────────
    total_rows = models.PositiveIntegerField(
        default=0,
        verbose_name='تعداد کل ردیف‌ها'
    )
    success_count = models.PositiveIntegerField(
        default=0,
        verbose_name='تعداد موفق'
    )
    error_count = models.PositiveIntegerField(
        default=0,
        verbose_name='تعداد خطا'
    )
    error_details = models.JSONField(
        default=list,
        blank=True,
        verbose_name='جزئیات خطاها'
    )
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='زمان پردازش'
    )

    class Meta:
        db_table = 'pricing_price_import'
        verbose_name = 'ورود قیمت'
        verbose_name_plural = 'ورودهای قیمت'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return (
            f'{self.union.name} | '
            f'{self.effective_date} | '
            f'{self.get_status_display()}'
        )

    @property
    def success_rate(self) -> float:
        """درصد موفقیت"""
        if self.total_rows == 0:
            return 0.0
        return round(self.success_count / self.total_rows * 100, 2)