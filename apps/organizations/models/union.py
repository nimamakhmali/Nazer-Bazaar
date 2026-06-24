"""
مدل اتحادیه صنفی (Union)

هر اتحادیه یک صنف خاص را در یک شهر نمایندگی می‌کند.
مثال: اتحادیه مرغ‌فروشان تهران، اتحادیه خواربارفروشان اصفهان

وظایف اتحادیه:
    - ثبت قیمت مصوب روزانه محصولات
    - مدیریت فروشگاه‌های عضو
    - نظارت بر قیمت‌گذاری فروشگاه‌ها
"""
from django.db import models
from django.conf import settings
from apps.common.base import BaseModel


class Union(BaseModel):
    """
    اتحادیه صنفی.

    روابط:
        chamber:    هر اتحادیه به یک اتاق اصناف تعلق دارد (ForeignKey)
        manager:    رئیس اتحادیه با نقش union_manager
        stores:     فروشگاه‌های عضو (در app stores تعریف می‌شود)
        prices:     قیمت‌های مصوب (در app pricing تعریف می‌شود)
    """
    chamber = models.ForeignKey(
        Chamber,
        on_delete=models.PROTECT,
        related_name='unions',
        verbose_name='اتاق اصناف'
    )
    manager = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_union',
        verbose_name='رئیس اتحادیه',
        limit_choices_to={'role': 'union_manager'}
    )
    name = models.CharField(
        max_length=200,
        verbose_name='نام اتحادیه',
        help_text='مثال: اتحادیه مرغ‌فروشان'
    )
    description = models.TextField(
        blank=True,
        verbose_name='توضیحات'
    )
    license_number = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        verbose_name='شماره پروانه'
    )
    established_year = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name='سال تأسیس'
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='تلفن'
    )
    address = models.TextField(
        blank=True,
        verbose_name='آدرس'
    )
    logo = models.ImageField(
        upload_to='unions/logos/%Y/%m/',
        null=True,
        blank=True,
        verbose_name='لوگو'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        db_index=True
    )

    class Meta:
        db_table = 'organizations_union'
        verbose_name = 'اتحادیه'
        verbose_name_plural = 'اتحادیه‌ها'
        ordering = ['chamber__city__name', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['chamber', 'name'],
                name='unique_union_per_chamber'
            )
        ]

    def __str__(self) -> str:
        return f'{self.name} - {self.chamber.city_name}'

    @property
    def city_name(self) -> str:
        return self.chamber.city_name

    @property
    def province_name(self) -> str:
        return self.chamber.province_name

    @property
    def manager_name(self) -> str:
        if self.manager:
            return self.manager.full_name
        return 'تعیین نشده'

    @property
    def stores_count(self) -> int:
        """تعداد فروشگاه‌های فعال عضو"""
        return self.stores.filter(is_active=True).count()

    @property
    def full_path(self) -> str:
        """مسیر کامل سازمانی"""
        return (
            f'{self.province_name} > '
            f'{self.city_name} > '
            f'{self.name}'
        )