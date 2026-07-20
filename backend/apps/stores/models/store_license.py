"""
مدل پروانه کسب (StoreLicense)

اطلاعات دقیق پروانه کسب فروشگاه.
این اطلاعات جدا از مدرک فایل پروانه نگهداری می‌شود
تا جستجو و گزارش‌گیری راحت‌تر باشد.
"""
from django.db import models
from apps.common.base import BaseModel


class StoreLicense(BaseModel):
    """
    پروانه کسب فروشگاه.

    رابطه OneToOne با Store:
        هر فروشگاه یک پروانه کسب دارد.
        اطلاعات پروانه جداگانه نگهداری می‌شود.
    """
    store = models.OneToOneField(
        'Store',
        on_delete=models.CASCADE,
        related_name='license',
        verbose_name='فروشگاه'
    )
    license_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='شماره پروانه'
    )
    issue_date = models.DateField(
        verbose_name='تاریخ صدور'
    )
    expire_date = models.DateField(
        verbose_name='تاریخ انقضا'
    )
    issuing_authority = models.CharField(
        max_length=200,
        verbose_name='مرجع صادرکننده',
        help_text='مثال: اتاق اصناف شهر تهران'
    )
    business_type = models.CharField(
        max_length=200,
        verbose_name='نوع کسب‌وکار',
        help_text='مثال: مرغ‌فروشی، خواربارفروشی'
    )
    is_valid = models.BooleanField(
        default=True,
        verbose_name='معتبر',
        db_index=True
    )

    class Meta:
        db_table = 'stores_license'
        verbose_name = 'پروانه کسب'
        verbose_name_plural = 'پروانه‌های کسب'
        ordering = ['-issue_date']

    def __str__(self) -> str:
        return f'{self.store.name} - {self.license_number}'

    @property
    def is_expired(self) -> bool:
        """آیا پروانه منقضی شده؟"""
        from django.utils import timezone
        return self.expire_date < timezone.now().date()

    @property
    def days_until_expiry(self) -> int:
        """تعداد روزهای باقی‌مانده تا انقضا"""
        from django.utils import timezone
        delta = self.expire_date - timezone.now().date()
        return delta.days

    @property
    def needs_renewal(self) -> bool:
        """آیا پروانه نیاز به تمدید دارد؟ (کمتر از 30 روز)"""
        return self.days_until_expiry <= 30