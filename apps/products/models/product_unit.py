"""
مدل واحد اندازه‌گیری محصول (ProductUnit)

واحدهای اندازه‌گیری برای محصولات مختلف.
این مدل به ادمین اجازه می‌دهد واحدهای دلخواه اضافه کند.

مثال:
    کیلوگرم، گرم، عدد، بسته، لیتر، متر
"""
from django.db import models
from apps.common.base import BaseModel


class ProductUnit(BaseModel):
    """
    واحد اندازه‌گیری محصول.

    این مدل به صورت مستقل است و توسط ادمین مدیریت می‌شود.
    هر محصول یک واحد اندازه‌گیری دارد.
    """
    name = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='نام واحد',
        help_text='مثال: کیلوگرم'
    )
    symbol = models.CharField(
        max_length=10,
        unique=True,
        verbose_name='نماد',
        help_text='مثال: kg'
    )
    description = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='توضیحات'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        db_index=True
    )

    class Meta:
        db_table = 'products_unit'
        verbose_name = 'واحد اندازه‌گیری'
        verbose_name_plural = 'واحدهای اندازه‌گیری'
        ordering = ['name']

    def __str__(self) -> str:
        return f'{self.name} ({self.symbol})'