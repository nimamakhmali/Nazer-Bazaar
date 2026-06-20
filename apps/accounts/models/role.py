"""
مدل‌های Role و Permission

این سیستم علاوه بر role ساده در مدل User،
یک سیستم Permission دانه‌ریز نیز دارد که به ادمین اجازه می‌دهد
دسترسی‌های خاص را به کاربران بدهد.
"""
from django.db import models
from apps.common.base import BaseModel


class Permission(BaseModel):
    """
    دسترسی‌های دانه‌ریز سیستم.

    مثال:
        name: 'ثبت قیمت مصوب'
        codename: 'pricing.add_official_price'
        module: 'pricing'
    """
    name = models.CharField(
        max_length=200,
        verbose_name='نام دسترسی'
    )
    codename = models.CharField(
        max_length=200,
        unique=True,
        verbose_name='کد دسترسی',
        help_text='مثال: pricing.add_official_price'
    )
    module = models.CharField(
        max_length=100,
        verbose_name='ماژول',
        help_text='مثال: pricing, complaints, stores',
        db_index=True
    )
    description = models.TextField(
        blank=True,
        verbose_name='توضیحات'
    )

    class Meta:
        db_table = 'accounts_permission'
        verbose_name = 'دسترسی'
        verbose_name_plural = 'دسترسی‌ها'
        ordering = ['module', 'name']

    def __str__(self) -> str:
        return f'{self.module} | {self.name}'


class Role(BaseModel):
    """
    نقش‌های سفارشی با دسترسی‌های قابل تنظیم.

    این مدل برای ادمین‌هایی است که می‌خواهند
    دسترسی‌های خاص به کاربران بدهند.
    (مکمل فیلد role در مدل User است)
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='نام نقش'
    )
    description = models.TextField(
        blank=True,
        verbose_name='توضیحات'
    )
    permissions = models.ManyToManyField(
        Permission,
        blank=True,
        related_name='roles',
        verbose_name='دسترسی‌ها'
    )
    users = models.ManyToManyField(
        'User',
        blank=True,
        related_name='custom_roles',
        verbose_name='کاربران'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال'
    )

    class Meta:
        db_table = 'accounts_role'
        verbose_name = 'نقش'
        verbose_name_plural = 'نقش‌ها'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name

    def get_permissions_list(self) -> list:
        """لیست کدهای دسترسی این نقش"""
        return list(
            self.permissions.values_list('codename', flat=True)
        )