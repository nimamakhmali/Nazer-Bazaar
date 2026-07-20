"""
مدل دسته‌بندی محصول (ProductCategory)

دسته‌بندی‌ها به صورت درختی (سلسله‌مراتبی) هستند.
هر دسته می‌تواند زیردسته داشته باشد.

مثال:
    مواد غذایی
        ├── گوشت
        │   ├── گوشت قرمز
        │   └── گوشت مرغ
        └── لبنیات
            ├── شیر
            └── پنیر
"""
from django.db import models
from apps.common.base import BaseModel


class ProductCategory(BaseModel):
    """
    دسته‌بندی محصولات با ساختار درختی.

    روابط:
        parent:   دسته والد (اختیاری - برای دسته‌بندی ریشه null است)
        children: زیردسته‌ها
        products: محصولات این دسته
    """
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='دسته والد'
    )
    name = models.CharField(
        max_length=200,
        verbose_name='نام دسته‌بندی'
    )
    slug = models.SlugField(
        max_length=200,
        unique=True,
        allow_unicode=True,
        verbose_name='نامک',
        help_text='برای استفاده در URL'
    )
    description = models.TextField(
        blank=True,
        verbose_name='توضیحات'
    )
    icon = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='آیکون',
        help_text='نام کلاس آیکون - مثال: fa-shopping-cart'
    )
    image = models.ImageField(
        upload_to='products/categories/%Y/%m/',
        null=True,
        blank=True,
        verbose_name='تصویر دسته‌بندی'
    )
    order = models.PositiveSmallIntegerField(
        default=0,
        verbose_name='ترتیب نمایش'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        db_index=True
    )

    class Meta:
        db_table = 'products_category'
        verbose_name = 'دسته‌بندی محصول'
        verbose_name_plural = 'دسته‌بندی‌های محصول'
        ordering = ['order', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['parent', 'name'],
                name='unique_category_name_per_parent'
            )
        ]

    def __str__(self) -> str:
        if self.parent:
            return f'{self.parent.name} > {self.name}'
        return self.name

    @property
    def is_root(self) -> bool:
        """آیا دسته ریشه است؟ (دسته والد ندارد)"""
        return self.parent is None

    @property
    def level(self) -> int:
        """سطح دسته در درخت"""
        if self.parent is None:
            return 0
        return self.parent.level + 1

    @property
    def full_path(self) -> str:
        """مسیر کامل دسته‌بندی"""
        if self.parent is None:
            return self.name
        return f'{self.parent.full_path} > {self.name}'

    @property
    def products_count(self) -> int:
        """تعداد محصولات این دسته"""
        return self.products.filter(is_active=True).count()

    @property
    def children_count(self) -> int:
        """تعداد زیردسته‌ها"""
        return self.children.filter(is_active=True).count()

    def get_ancestors(self) -> list:
        """دریافت تمام دسته‌های والد به ترتیب"""
        ancestors = []
        current = self.parent
        while current is not None:
            ancestors.insert(0, current)
            current = current.parent
        return ancestors

    def get_descendants(self) -> list:
        """دریافت تمام زیردسته‌ها به صورت بازگشتی"""
        descendants = []
        for child in self.children.filter(is_active=True):
            descendants.append(child)
            descendants.extend(child.get_descendants())
        return descendants