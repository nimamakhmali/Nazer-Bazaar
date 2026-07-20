"""
مدل محصول (Product)

محصولات عمومی هستند و به اتحادیه خاصی تعلق ندارند.
هر اتحادیه می‌تواند برای محصولاتی که در حوزه کاری‌شان است
قیمت مصوب روزانه ثبت کند.

مثال محصولات:
    - مرغ گرم (واحد: کیلوگرم)
    - تخم‌مرغ (واحد: عدد)
    - برنج ایرانی (واحد: کیلوگرم)
    - روغن نباتی (واحد: لیتر)

نکته مهم:
    محصول = یک کالای کلی در سیستم
    OfficialPrice = قیمت مصوب این کالا توسط یک اتحادیه در یک روز
    StorePrice = قیمت این کالا در یک فروشگاه خاص
"""
from django.db import models
from apps.common.base import BaseModel


class Product(BaseModel):
    """
    محصول/کالا در سیستم.

    روابط:
        category:       دسته‌بندی محصول
        unit:           واحد اندازه‌گیری
        official_prices: قیمت‌های مصوب (در app pricing)
        store_prices:   قیمت‌های فروشگاه‌ها (در app pricing)
    """
    category = models.ForeignKey(
        'ProductCategory',
        on_delete=models.PROTECT,
        related_name='products',
        verbose_name='دسته‌بندی'
    )
    unit = models.ForeignKey(
        'ProductUnit',
        on_delete=models.PROTECT,
        related_name='products',
        verbose_name='واحد اندازه‌گیری'
    )
    name = models.CharField(
        max_length=200,
        verbose_name='نام محصول'
    )
    slug = models.SlugField(
        max_length=200,
        unique=True,
        allow_unicode=True,
        verbose_name='نامک'
    )
    barcode = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        verbose_name='بارکد',
        help_text='بارکد استاندارد محصول'
    )
    description = models.TextField(
        blank=True,
        verbose_name='توضیحات'
    )
    image = models.ImageField(
        upload_to='products/images/%Y/%m/',
        null=True,
        blank=True,
        verbose_name='تصویر محصول'
    )

    # ─── اطلاعات تکمیلی ─────────────────────────────────────────────────────
    brand = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='برند/نام تجاری'
    )
    origin = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='کشور/منشأ تولید',
        help_text='مثال: ایران، ترکیه'
    )
    specifications = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='مشخصات فنی',
        help_text='مشخصات اضافه به صورت JSON'
    )

    # ─── ترتیب نمایش ────────────────────────────────────────────────────────
    order = models.PositiveSmallIntegerField(
        default=0,
        verbose_name='ترتیب نمایش'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        db_index=True
    )
    is_featured = models.BooleanField(
        default=False,
        verbose_name='ویژه',
        help_text='نمایش در صفحه اصلی'
    )

    class Meta:
        db_table = 'products_product'
        verbose_name = 'محصول'
        verbose_name_plural = 'محصولات'
        ordering = ['category', 'order', 'name']
        indexes = [
            models.Index(
                fields=['category', 'is_active'],
                name='idx_product_category_active'
            ),
            models.Index(
                fields=['is_active', 'is_featured'],
                name='idx_product_active_featured'
            ),
        ]

    def __str__(self) -> str:
        return f'{self.name} ({self.unit.symbol})'

    @property
    def category_name(self) -> str:
        return self.category.name

    @property
    def unit_name(self) -> str:
        return self.unit.name

    @property
    def unit_symbol(self) -> str:
        return self.unit.symbol

    @property
    def full_name(self) -> str:
        """نام کامل با واحد"""
        return f'{self.name} - هر {self.unit.name}'

    def get_latest_official_price(self, union_id: int = None):
        """
        آخرین قیمت مصوب این محصول.
        اگر union_id داده شود، قیمت آن اتحادیه را برمی‌گرداند.
        """
        from django.utils import timezone
        from apps.pricing.models import OfficialPrice
        qs = OfficialPrice.objects.filter(
            product=self,
            effective_date__lte=timezone.now().date(),
            is_active=True
        )
        if union_id:
            qs = qs.filter(union_id=union_id)
        return qs.order_by('-effective_date').first()