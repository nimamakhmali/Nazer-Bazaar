"""
مدل شکایت (Complaint)

هسته اصلی اپلیکیشن شکایات.
یک شهروند (Customer) می‌تواند علیه یک فروشگاه (Store) به خاطر
یک محصول (Product) و قیمت گزارش‌شده (price_reported) شکایت ثبت کند.
"""
import uuid
from django.db import models
from django.conf import settings
from apps.common.base import BaseModel
from apps.common.choices import ComplaintStatus
from apps.common.utils import get_upload_path

from apps.common.utils import get_upload_path


def complaint_upload_path(instance, filename):
    return get_upload_path(instance, filename, "complaints")

def complaint_upload_path(instance, filename):
    return get_upload_path(instance, filename, "complaints")


class Complaint(BaseModel):
    """
    شکایت ثبت‌شده توسط مشتری.

    روابط:
        customer:       شهروندی که شکایت را ثبت کرده
        store:          فروشگاهی که از آن شکایت شده
        product:        محصول مورد شکایت
        assigned_to:    کاربر مسئول رسیدگی (بازرس، مدیر)
        attachments:    فایل‌های پیوست (عکس فاکتور و...)
        responses:      پاسخ‌های ثبت‌شده برای این شکایت
        inspection:     بازرسی انجام‌شده در پی این شکایت
    """
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name='شناسه عمومی',
        help_text='برای رهگیری عمومی شکایت توسط مشتری'
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='complaints',
        verbose_name='مشتری (شاکی)',
        limit_choices_to={'role': 'customer'}
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

    # قیمت گزارش‌شده توسط مشتری
    price_reported = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        verbose_name='قیمت پرداخت‌شده (ریال)'
    )

    # مدرک قیمت (عکس فاکتور، اسکرین‌شات و ...)
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
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_complaints',
        verbose_name='ارجاع داده شده به'
    )
    resolution_note = models.TextField(
        blank=True,
        verbose_name='یادداشت نهایی (نتیجه)',
        help_text='نتیجه نهایی بررسی شکایت توسط مسئول'
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
        ]

    def __str__(self) -> str:
        return f"شکایت از {self.store.name} در مورد {self.product.name}"

    @property
    def is_closed(self) -> bool:
        """آیا شکایت مختومه شده است؟"""
        return self.status in [ComplaintStatus.CLOSED, ComplaintStatus.REJECTED]

    @property
    def is_pending(self) -> bool:
        """آیا شکایت در انتظار بررسی اولیه است؟"""
        return self.status == ComplaintStatus.SUBMITTED

    def change_status(self, new_status: str, user):
        """تغییر وضعیت شکایت"""
        if new_status not in ComplaintStatus.values:
            raise ValueError("وضعیت نامعتبر است")
        self.status = new_status
        # TODO: Log this change in a history model if needed
        self.save(update_fields=['status', 'updated_at'])