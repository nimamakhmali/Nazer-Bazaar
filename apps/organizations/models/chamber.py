"""
مدل اتاق اصناف (Chamber)

هر شهر یک اتاق اصناف دارد که مسئول مدیریت
اتحادیه‌های صنفی آن شهر است.

وظایف اتاق اصناف:
    - مدیریت اتحادیه‌های شهر
    - نظارت بر قیمت‌گذاری
    - رسیدگی به شکایات
"""
from django.db import models
from django.conf import settings
from apps.common.base import BaseModel

class Chamber(BaseModel):
    """
    اتاق اصناف شهر.

    روابط:
        city:    هر اتاق اصناف به یک شهر تعلق دارد (OneToOne)
        manager: مدیر اتاق اصناف با نقش chamber_manager
    """
    city = models.OneToOneField(
        'geography.City',
        on_delete=models.PROTECT,
        related_name='chamber',
        verbose_name='شهر'
    )
    manager = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_chamber',
        verbose_name='مدیر اتاق اصناف',
        limit_choices_to={'role': 'chamber_manager'}
    )
    name = models.CharField(
        max_length=200,
        verbose_name='نام اتاق اصناف',
        help_text='مثال: اتاق اصناف شهر تهران'
    )
    address = models.TextField(
        blank=True,
        verbose_name='آدرس'
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='تلفن'
    )
    email = models.EmailField(
        blank=True,
        verbose_name='ایمیل'
    )
    established_year = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name='سال تأسیس'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        db_index=True
    )

    class Meta:
        db_table = 'organizations_chamber'
        verbose_name = 'اتاق اصناف'
        verbose_name_plural = 'اتاق‌های اصناف'
        ordering = ['city__province__name', 'city__name']

    def __str__(self) -> str:
        return self.name

    @property
    def city_name(self) -> str:
        return self.city.name

    @property
    def province_name(self) -> str:
        return self.city.province.name

    @property
    def unions_count(self) -> int:
        """تعداد اتحادیه‌های فعال"""
        return self.unions.filter(is_active=True).count()

    @property
    def manager_name(self) -> str:
        if self.manager:
            return self.manager.full_name
        return 'تعیین نشده'