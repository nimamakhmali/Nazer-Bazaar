"""
مدل تاریخچه قیمت (PriceHistory)

هر بار که قیمت مصوب یا قیمت فروشگاه تغییر می‌کند،
یک رکورد در این جدول ثبت می‌شود.

این مدل برای:
    - گزارش‌گیری از روند تغییر قیمت‌ها
    - حسابرسی و بررسی تخلفات
    - نمودارهای قیمت
"""
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.common.base import BaseModel


class PriceChangeType(models.TextChoices):
    """نوع تغییر قیمت"""
    OFFICIAL_PRICE_CREATED = 'official_created', 'ثبت قیمت مصوب جدید'
    OFFICIAL_PRICE_UPDATED = 'official_updated', 'ویرایش قیمت مصوب'
    OFFICIAL_PRICE_DEACTIVATED = 'official_deactivated', 'غیرفعال قیمت مصوب'
    STORE_PRICE_CREATED = 'store_created', 'ثبت قیمت فروشگاه'
    STORE_PRICE_UPDATED = 'store_updated', 'ویرایش قیمت فروشگاه'
    STORE_PRICE_DEACTIVATED = 'store_deactivated', 'غیرفعال قیمت فروشگاه'


class PriceHistory(BaseModel):
    """
    تاریخچه کامل تغییرات قیمت.

    این مدل read-only است و فقط به عنوان لاگ استفاده می‌شود.
    هیچ‌گاه حذف یا ویرایش نمی‌شود.
    """
    change_type = models.CharField(
        max_length=30,
        choices=PriceChangeType.choices,
        verbose_name='نوع تغییر',
        db_index=True
    )

    # ─── مرجع به قیمت‌ها (nullable چون ممکن است حذف شوند) ─────────────────
    official_price = models.ForeignKey(
        'OfficialPrice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='history',
        verbose_name='قیمت مصوب'
    )
    store_price = models.ForeignKey(
        'StorePrice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='history',
        verbose_name='قیمت فروشگاه'
    )

    # ─── اطلاعات snapshot (برای حفظ تاریخچه) ──────────────────────────────
    union_id = models.IntegerField(verbose_name='شناسه اتحادیه')
    union_name = models.CharField(max_length=200, verbose_name='نام اتحادیه')
    product_id = models.IntegerField(verbose_name='شناسه محصول')
    product_name = models.CharField(max_length=200, verbose_name='نام محصول')
    store_id = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='شناسه فروشگاه'
    )
    store_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='نام فروشگاه'
    )

    # ─── مقادیر قیمت ────────────────────────────────────────────────────────
    old_price = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        null=True,
        blank=True,
        verbose_name='قیمت قبلی (ریال)'
    )
    new_price = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        verbose_name='قیمت جدید (ریال)'
    )
    price_date = models.DateField(verbose_name='تاریخ قیمت')

    # ─── اطلاعات کاربر ──────────────────────────────────────────────────────
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='price_history',
        verbose_name='تغییر داده توسط'
    )
    changed_by_name = models.CharField(
        max_length=200,
        verbose_name='نام تغییردهنده'
    )
    changed_by_role = models.CharField(
        max_length=30,
        verbose_name='نقش تغییردهنده'
    )

    # ─── توضیحات ────────────────────────────────────────────────────────────
    note = models.TextField(
        blank=True,
        verbose_name='یادداشت'
    )

    class Meta:
        db_table = 'pricing_price_history'
        verbose_name = 'تاریخچه قیمت'
        verbose_name_plural = 'تاریخچه قیمت‌ها'
        ordering = ['-created_at']
        indexes = [
            models.Index(
                fields=['product_id', 'price_date'],
                name='idx_history_product_date'
            ),
            models.Index(
                fields=['union_id', 'price_date'],
                name='idx_history_union_date'
            ),
            models.Index(
                fields=['store_id', 'price_date'],
                name='idx_history_store_date'
            ),
            models.Index(
                fields=['change_type', 'created_at'],
                name='idx_history_type_date'
            ),
        ]

    def __str__(self) -> str:
        return (
            f'{self.get_change_type_display()} | '
            f'{self.product_name} | '
            f'{self.price_date}'
        )

    @property
    def price_change_amount(self) -> Decimal:
        """مقدار تغییر قیمت"""
        if self.old_price is None:
            return self.new_price
        return self.new_price - self.old_price

    @property
    def price_change_percent(self) -> Decimal:
        """درصد تغییر قیمت"""
        if not self.old_price or self.old_price == 0:
            return Decimal('0')
        change = (
            (self.new_price - self.old_price)
            / self.old_price
            * 100
        )
        return change.quantize(Decimal('0.01'))