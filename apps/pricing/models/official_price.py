"""
مدل قیمت مصوب اتحادیه (OfficialPrice)

این مدل مهم‌ترین موجودیت سیستم است.
هر روز صبح رئیس اتحادیه قیمت مصوب محصولات را از اتاق اصناف
دریافت کرده و در سیستم ثبت می‌کند.

قوانین کسب‌وکار:
    1. هر اتحادیه برای هر محصول، در هر روز فقط یک قیمت مصوب دارد
    2. قیمت مصوب توسط رئیس اتحادیه یا ادمین ثبت می‌شود
    3. فروشگاه‌ها باید قیمت خود را بین 80% تا 100% این قیمت تعیین کنند
    4. قیمت مصوب پس از ثبت قابل حذف نیست (فقط غیرفعال می‌شود)
    5. تاریخچه تمام تغییرات در PriceHistory نگهداری می‌شود
"""
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from apps.common.base import BaseModel


class OfficialPrice(BaseModel):
    """
    قیمت مصوب روزانه اتحادیه برای یک محصول.

    روابط:
        union:      اتحادیه ثبت‌کننده قیمت
        product:    محصول مورد نظر
        created_by: رئیس اتحادیه یا ادمین که قیمت را ثبت کرده

    Constraint:
        هر اتحادیه در هر روز برای هر محصول فقط یک قیمت مصوب دارد
        (union + product + effective_date باید یکتا باشد)
    """
    union = models.ForeignKey(
        'organizations.Union',
        on_delete=models.PROTECT,
        related_name='official_prices',
        verbose_name='اتحادیه'
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='official_prices',
        verbose_name='محصول'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_official_prices',
        verbose_name='ثبت شده توسط'
    )

    # ─── قیمت‌ها ────────────────────────────────────────────────────────────
    price = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        verbose_name='قیمت مصوب (ریال)',
        validators=[MinValueValidator(Decimal('1'))]
    )

    # ─── تاریخ اعتبار ────────────────────────────────────────────────────────
    effective_date = models.DateField(
        verbose_name='تاریخ اعتبار',
        db_index=True,
        help_text='تاریخی که این قیمت از آن معتبر است'
    )
    expire_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='تاریخ انقضا',
        help_text='تاریخی که این قیمت منقضی می‌شود (معمولاً فردا)'
    )

    # ─── توضیحات ────────────────────────────────────────────────────────────
    description = models.TextField(
        blank=True,
        verbose_name='توضیحات',
        help_text='توضیحات تکمیلی در مورد این قیمت'
    )

    # ─── وضعیت ──────────────────────────────────────────────────────────────
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        db_index=True
    )

    class Meta:
        db_table = 'pricing_official_price'
        verbose_name = 'قیمت مصوب'
        verbose_name_plural = 'قیمت‌های مصوب'
        ordering = ['-effective_date', 'product__name']
        constraints = [
            models.UniqueConstraint(
                fields=['union', 'product', 'effective_date'],
                name='unique_official_price_per_day'
            )
        ]
        indexes = [
            models.Index(
                fields=['union', 'product', 'effective_date'],
                name='idx_official_price_lookup'
            ),
            models.Index(
                fields=['effective_date', 'is_active'],
                name='idx_official_price_date_active'
            ),
            models.Index(
                fields=['product', 'effective_date'],
                name='idx_off_price_prod_dt'
            ),
        ]

    def __str__(self) -> str:
        return (
            f'{self.product.name} | '
            f'{self.union.name} | '
            f'{self.effective_date} | '
            f'{self.price:,} ریال'
        )

    # ─── Properties ─────────────────────────────────────────────────────────
    @property
    def min_allowed_price(self) -> Decimal:
        """
        حداقل قیمت مجاز برای فروشگاه‌ها.
        80% قیمت مصوب
        """
        from apps.common.constants import PRICE_MIN_RATIO
        return (self.price * PRICE_MIN_RATIO).quantize(Decimal('1'))

    @property
    def max_allowed_price(self) -> Decimal:
        """
        حداکثر قیمت مجاز برای فروشگاه‌ها.
        100% قیمت مصوب
        """
        return self.price

    @property
    def is_today(self) -> bool:
        """آیا این قیمت برای امروز است؟"""
        from django.utils import timezone
        return self.effective_date == timezone.now().date()

    @property
    def is_expired(self) -> bool:
        """آیا این قیمت منقضی شده؟"""
        from django.utils import timezone
        if self.expire_date:
            return timezone.now().date() > self.expire_date
        return False

    @property
    def price_formatted(self) -> str:
        """قیمت فرمت‌بندی شده با جداکننده"""
        return f'{self.price:,} ریال'

    @property
    def min_price_formatted(self) -> str:
        return f'{self.min_allowed_price:,} ریال'

    # ─── Methods ────────────────────────────────────────────────────────────
    def deactivate(self) -> None:
        """غیرفعال کردن قیمت مصوب"""
        self.is_active = False
        self.save(update_fields=['is_active', 'updated_at'])

    def validate_store_price(self, store_price: Decimal) -> bool:
        """
        بررسی اینکه آیا قیمت فروشگاه در محدوده مجاز است.

        Args:
            store_price: قیمت پیشنهادی فروشگاه

        Returns:
            True اگر قیمت در محدوده مجاز باشد
        """
        from apps.common.constants import is_price_valid
        return is_price_valid(store_price, self.price)