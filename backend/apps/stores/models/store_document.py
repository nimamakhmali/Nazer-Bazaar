"""
مدل مدارک فروشگاه (StoreDocument)

هر فروشگاه می‌تواند چندین مدرک داشته باشد:
    - تصویر پروانه کسب
    - تصویر کارت ملی صاحب فروشگاه
    - تصویر فروشگاه
    - سایر مدارک
"""
from django.db import models
from apps.common.base import BaseModel


class DocumentType(models.TextChoices):
    """انواع مدارک فروشگاه"""
    BUSINESS_LICENSE = 'business_license', 'پروانه کسب'
    NATIONAL_ID = 'national_id', 'کارت ملی'
    STORE_IMAGE = 'store_image', 'تصویر فروشگاه'
    HEALTH_CERTIFICATE = 'health_certificate', 'گواهی بهداشت'
    OTHER = 'other', 'سایر'


class StoreDocument(BaseModel):
    """
    مدارک و اسناد فروشگاه.

    این مدل برای نگهداری تمام مدارک مورد نیاز فروشگاه استفاده می‌شود.
    مدارک توسط صاحب فروشگاه آپلود و توسط مدیر اتاق اصناف تایید می‌شوند.
    """
    store = models.ForeignKey(
        'Store',
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name='فروشگاه'
    )
    document_type = models.CharField(
        max_length=30,
        choices=DocumentType.choices,
        verbose_name='نوع مدرک'
    )
    title = models.CharField(
        max_length=200,
        verbose_name='عنوان مدرک'
    )
    file = models.FileField(
        upload_to='stores/documents/%Y/%m/',
        verbose_name='فایل مدرک'
    )
    description = models.TextField(
        blank=True,
        verbose_name='توضیحات'
    )
    is_verified = models.BooleanField(
        default=False,
        verbose_name='تایید شده',
        db_index=True
    )
    verified_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_documents',
        verbose_name='تایید شده توسط'
    )
    verified_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='تاریخ تایید'
    )
    expire_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='تاریخ انقضا',
        help_text='برای مدارکی که انقضا دارند مثل گواهی بهداشت'
    )

    class Meta:
        db_table = 'stores_document'
        verbose_name = 'مدرک فروشگاه'
        verbose_name_plural = 'مدارک فروشگاه'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.store.name} - {self.get_document_type_display()}'

    @property
    def is_expired(self) -> bool:
        """آیا مدرک منقضی شده؟"""
        if not self.expire_date:
            return False
        from django.utils import timezone
        return self.expire_date < timezone.now().date()

    def verify(self, verified_by) -> None:
        """تایید مدرک"""
        from django.utils import timezone
        self.is_verified = True
        self.verified_by = verified_by
        self.verified_at = timezone.now()
        self.save(update_fields=[
            'is_verified',
            'verified_by',
            'verified_at',
            'updated_at'
        ])