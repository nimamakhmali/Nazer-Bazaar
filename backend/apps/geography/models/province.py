
from django.db import models
from apps.common.base import BaseModel


class Province(BaseModel):

    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='نام استان'
    )
    code = models.CharField(
        max_length=10,
        unique=True,
        verbose_name='کد استان',
        help_text='کد یکتای استان - مثال: 01 برای مرکزی'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        db_index=True
    )

    class Meta:
        db_table = 'geography_province'
        verbose_name = 'استان'
        verbose_name_plural = 'استان‌ها'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name

    @property
    def cities_count(self) -> int:
        """تعداد شهرهای فعال استان"""
        return self.cities.filter(is_active=True).count()