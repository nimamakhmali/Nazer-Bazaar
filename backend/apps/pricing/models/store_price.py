"""
مدل قیمت فروشگاه (StorePrice)

قیمتی که هر فروشگاه برای محصولات خود ثبت می‌کند.
این قیمت باید در محدوده 80% تا 100% قیمت مصوب اتحادیه باشد.

قوانین کسب‌وکار:
    1. فروشگاه باید active و تایید شده باشد
    2. قیمت باید >= 80% قیمت مصوب باشد
    3. قیمت باید <= 100% قیمت مصوب باشد
    4. برای هر محصول در هر روز فقط یک قیمت ثبت می‌شود
    5. اگر فروشگاه قیمت مصوب ندارد، نمی‌تواند قیمت ثبت کند
"""
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from apps.common.base import BaseModel


class StorePrice(BaseModel):
    """
    قیمت محصول در یک فروشگاه خاص.

    روابط:
        store:          فروشگاه ثبت‌کننده قیمت
        product:        محصول مورد نظر
        official_price: قیمت مصوب مرجع این قیمت
        created_by:     کاربری که قیمت را ثبت کرده
    """
    store = models.ForeignKey(
        'stores.Store',
        on_delete=models.CASCADE,
        related_name='prices',
        verbose_name='فروشگاه'
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='store_prices',
        verbose_name='محصول'
    )
    official_price = models.ForeignKey(
        'OfficialPrice',
        on_delete=models.PROTECT,
        related_name='store_prices',
        verbose_name='قیمت مصوب مرجع'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_store_prices',
        verbose_name='ثبت شده توسط'
    )

    # ─── قیمت ───────────────────────────────────────────────────────────────
    price = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        verbose_name='قیمت فروشگاه (ریال)',
        validators=[MinValueValidator(Decimal('1'))]
    )

    # ─── قیمت مصوب در زمان ثبت (برای تاریخچه) ──────────────────────────────
    official_price_amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        verbose_name='قیمت مصوب در زمان ثبت (ریال)',
        help_text='نسخه کپی قیمت مصوب برای حفظ تاریخچه'
    )
    min_allowed_price_amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        verbose_name='حداقل قیمت مجاز در زمان ثبت (ریال)'
    )

    # ─── تاریخ ──────────────────────────────────────────────────────────────
    price_date = models.DateField(
        verbose_name='تاریخ قیمت',
        db_index=True,
        help_text='تاریخی که این قیمت برای آن ثبت شده'
    )

    # ─── توضیحات ────────────────────────────────────────────────────────────
    description = models.TextField(
        blank=True,
        verbose_name='توضیحات'
    )

    # ─── وضعیت ──────────────────────────────────────────────────────────────
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        db_index=True
    )

    class Meta:
        db_table = 'pricing_store_price'
        verbose_name = 'قیمت فروشگاه'
        verbose_name_plural = 'قیمت‌های فروشگاه'
        ordering = ['-price_date', 'store__name']
        constraints = [
            models.UniqueConstraint(
                fields=['store', 'product', 'price_date'],
                name='unique_store_price_per_day'
            )
        ]
        indexes = [
            models.Index(
                fields=['store', 'product', 'price_date'],
                name='idx_store_price_lookup'
            ),
            models.Index(
                fields=['price_date', 'is_active'],
                name='idx_store_price_date_active'
            ),
            models.Index(
                fields=['product', 'price_date'],
                name='idx_store_price_product_date'
            ),
            models.Index(
                fields=['store', 'price_date'],
                name='idx_store_price_store_date'
            ),
        ]

    def __str__(self) -> str:
        price_str = f'{self.price:,} ریال' if self.price is not None else '—'
        return (
            f'{self.store.name} | '
            f'{self.product.name} | '
            f'{self.price_date} | '
            f'{price_str}'
        )

    # ─── Properties ─────────────────────────────────────────────────────────
    @property
    def discount_percent(self) -> Decimal:
        """
        درصد تخفیف نسبت به قیمت مصوب.
        مثال: اگر قیمت مصوب 100 و قیمت فروشگاه 85 باشد → 15%
        """
        if self.official_price_amount is None or self.official_price_amount == 0:
            return Decimal('0')
        if self.price is None:
            return Decimal('0')
        discount = (
            (self.official_price_amount - self.price)
            / self.official_price_amount
            * 100
        )
        return discount.quantize(Decimal('0.01'))

    @property
    def price_ratio(self) -> Decimal:
        """
        نسبت قیمت فروشگاه به قیمت مصوب.
        مثال: 0.85 یعنی 85% قیمت مصوب
        """
        if self.official_price_amount is None or self.official_price_amount == 0:
            return Decimal('0')
        if self.price is None:
            return Decimal('0')
        ratio = self.price / self.official_price_amount
        return ratio.quantize(Decimal('0.0001'))

    @property
    def is_compliant(self) -> bool:
        """
        آیا قیمت فروشگاه در محدوده مجاز است؟
        بین 80% تا 100% قیمت مصوب
        """
        from apps.common.constants import is_price_valid
        if self.price is None or self.official_price_amount is None:
            return False
        return is_price_valid(self.price, self.official_price_amount)

    @property
    def is_overpriced(self) -> bool:
        """آیا قیمت فروشگاه بالاتر از قیمت مصوب است؟"""
        if self.price is None or self.official_price_amount is None:
            return False
        return self.price > self.official_price_amount

    @property
    def is_today(self) -> bool:
        """آیا این قیمت برای امروز است؟"""
        from django.utils import timezone
        return self.price_date == timezone.now().date()

    @property
    def price_formatted(self) -> str:
        if self.price is None:
            return '—'
        return f'{self.price:,} ریال'

    @property
    def official_price_formatted(self) -> str:
        if self.official_price_amount is None:
            return '—'
        return f'{self.official_price_amount:,} ریال'

    @property
    def violation_amount(self) -> Decimal:
        """
        مبلغ تخلف (اگر قیمت بالاتر از مصوب باشد).
        برای ثبت در شکایات استفاده می‌شود.
        """
        if self.is_overpriced:
            return self.price - self.official_price_amount
        return Decimal('0')