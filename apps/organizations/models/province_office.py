"""
مدل دفتر استانداری (ProvinceOffice)

هر استان یک دفتر استانداری دارد که مسئول نظارت بر
اتاق‌های اصناف شهرهای آن استان است.

سلسله‌مراتب:
    ProvinceOffice (استانداری)
        └── Chamber (اتاق اصناف شهر)
                └── Union (اتحادیه)
                        └── Store (فروشگاه)
"""
from django.db import models
from django.conf import settings
from apps.common.base import BaseModel


class ProvinceOffice(BaseModel):
    """
    دفتر نمایندگی استانداری.

    روابط:
        province: هر استانداری به یک استان تعلق دارد (OneToOne)
        manager:  مدیر استانداری یک کاربر با نقش province_manager است
    """
    province = models.OneToOneField(
        'geography.Province',
        on_delete=models.PROTECT,
        related_name='office',
        verbose_name='استان'
    )
    manager = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_province_office',
        verbose_name='مدیر استانداری',
        limit_choices_to={'role': 'province_manager'}
    )
    name = models.CharField(
        max_length=200,
        verbose_name='نام دفتر استانداری',
        help_text='مثال: استانداری استان تهران'
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
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        db_index=True
    )

    class Meta:
        db_table = 'organizations_province_office'
        verbose_name = 'دفتر استانداری'
        verbose_name_plural = 'دفاتر استانداری'
        ordering = ['province__name']

    def __str__(self) -> str:
        return self.name

    @property
    def province_name(self) -> str:
        return self.province.name

    @property
    def chambers_count(self) -> int:
        """تعداد اتاق‌های اصناف تحت نظر"""
        return self.province.cities.filter(
            chamber__isnull=False,
            chamber__is_active=True
        ).count()

    @property
    def manager_name(self) -> str:
        """نام مدیر استانداری"""
        if self.manager:
            return self.manager.full_name
        return 'تعیین نشده'