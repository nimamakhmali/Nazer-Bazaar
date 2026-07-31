"""
مدل شکایت (Complaint)
"""
import uuid
import random
from django.db import models
from django.conf import settings
from apps.common.base import BaseModel
from apps.common.choices import ComplaintStatus
from apps.common.utils import get_upload_path


def complaint_upload_path(instance, filename):
    return get_upload_path(instance, filename, "complaints")


class Complaint(BaseModel):
    """شکایت ثبت‌شده توسط مشتری"""
    
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='شناسه عمومی',
    )
    
    tracking_code = models.CharField(
        max_length=8,
        unique=True,
        editable=False,
        verbose_name='کد رهگیری عددی',
    )
    
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='complaints',
        verbose_name='مشتری (شاکی)',
    )
    store = models.ForeignKey(
        'stores.Store',
        on_delete=models.PROTECT,
        related_name='complaints',
        verbose_name='فروشگاه'
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='complaints',
        verbose_name='محصول'
    )

    # ─── اطلاعات شکایت ──────────────────────────────────────────────────────
    title = models.CharField(max_length=255, verbose_name='عنوان شکایت')
    description = models.TextField(verbose_name='شرح شکایت')
    price_reported = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        verbose_name='قیمت پرداخت‌شده (ریال)'
    )
    price_proof = models.FileField(
        upload_to=complaint_upload_path,
        null=True,
        blank=True,
        verbose_name='مدرک قیمت'
    )

    # ─── وضعیت و گردش‌کار ────────────────────────────────────────────────────
    status = models.CharField(
        max_length=20,
        choices=ComplaintStatus.choices,
        default=ComplaintStatus.SUBMITTED,
        verbose_name='وضعیت',
        db_index=True
    )
    
    # ✅ NEW: فیلدهای ارجاع
    assigned_union_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='union_assigned_complaints',
        verbose_name='رئیس اتحادیه محول شده',
        help_text='شکایت اول به رئیس اتحادیه ارجاع می‌شود'
    )
    
    assigned_chamber_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chamber_assigned_complaints',
        verbose_name='مدیر اتاق اصناف محول شده',
        help_text='اگر ۴۸ ساعت گذشت، به مدیر اتاق اصناف ارجاع می‌شود'
    )
    
    assigned_province_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='province_assigned_complaints',
        verbose_name='ناظر استانداری محول شده',
        help_text='اگر ۹۶ ساعت گذشت، به ناظر استانداری ارجاع می‌شود'
    )
    
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_complaints',
        verbose_name='محول شده به (فعلی)',
    )
    
    # ✅ NEW: سطح تشدید
    escalation_level = models.IntegerField(
        default=1,
        verbose_name='سطح ارجاع',
        help_text='۱=اتحادیه، ۲=اتاق اصناف، ۳=استانداری'
    )
    
    escalated_at_48h = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='زمان ارجاع ۴۸ ساعته',
    )
    
    escalated_at_96h = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='زمان ارجاع ۹۶ ساعته',
    )
    
    resolution_note = models.TextField(
        blank=True,
        verbose_name='یادداشت نهایی (نتیجه)',
    )

    class Meta:
        db_table = 'complaints_complaint'
        verbose_name = 'شکایت'
        verbose_name_plural = 'شکایات'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['store', 'status']),
            models.Index(fields=['customer', 'created_at']),
            models.Index(fields=['tracking_code']),
            models.Index(fields=['escalation_level', 'created_at']),  # ✅ NEW
        ]

    def __str__(self) -> str:
        return f"شکایت #{self.tracking_code} - {self.store.name}"

    def save(self, *args, **kwargs):
        # تولید کد رهگیری عددی یکتا
        if not self.tracking_code:
            self.tracking_code = self._generate_tracking_code()
        super().save(*args, **kwargs)

    def _generate_tracking_code(self) -> str:
        """تولید کد ۸ رقمی یکتا"""
        while True:
            code = str(random.randint(10000000, 99999999))
            if not Complaint.objects.filter(tracking_code=code).exists():
                return code

    @property
    def is_closed(self) -> bool:
        return self.status in [ComplaintStatus.CLOSED, ComplaintStatus.REJECTED]

    @property
    def is_pending(self) -> bool:
        return self.status == ComplaintStatus.SUBMITTED
    
    @property
    def hours_since_created(self) -> int:
        """تعداد ساعت‌های گذشته از ثبت شکایت"""
        from django.utils import timezone
        delta = timezone.now() - self.created_at
        return int(delta.total_seconds() / 3600)
    
    @property
    def is_overdue_48h(self) -> bool:
        """آیا ۴۸ ساعت گذشته؟"""
        return self.hours_since_created >= 48 and self.escalation_level == 1
    
    @property
    def is_overdue_96h(self) -> bool:
        """آیا ۹۶ ساعت (۴ روز) گذشته؟"""
        return self.hours_since_created >= 96 and self.escalation_level == 2

    def change_status(self, new_status: str, user):
        """تغییر وضعیت شکایت"""
        if new_status not in ComplaintStatus.values:
            raise ValueError("وضعیت نامعتبر است")
        self.status = new_status
        self.save(update_fields=['status', 'updated_at'])