from django.db import models
from apps.common.base import BaseModel
from apps.common.utils import get_upload_path

from apps.common.utils import get_upload_path


def complaint_attachment_upload_path(instance, filename):
    return get_upload_path(
        instance,
        filename,
        "complaints/attachments",
    )


def complaint_attachment_upload_path(instance, filename):
    return get_upload_path(instance, filename, "complaints/attachments")


class ComplaintAttachment(BaseModel):
    """
    فایل‌های پیوست شکایت.
    مشتری یا مسئول بررسی می‌توانند فایل پیوست کنند.
    """
    complaint = models.ForeignKey(
        'Complaint',
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name='شکایت'
    )
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='complaint_attachments',
        verbose_name='آپلود شده توسط'
    )
    file = models.FileField(
        upload_to=models.FileField(upload_to=complaint_attachment_upload_path,),
        verbose_name='فایل پیوست'
    )
    description = models.CharField(max_length=255, blank=True, verbose_name='توضیحات')

    class Meta:
        db_table = 'complaints_attachment'
        verbose_name = 'پیوست شکایت'
        verbose_name_plural = 'پیوست‌های شکایات'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"پیوست برای شکایت {self.complaint.id}"