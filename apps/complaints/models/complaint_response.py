from django.db import models
from apps.common.base import BaseModel


class ComplaintResponse(BaseModel):
    """
    پاسخ‌ها و یادداشت‌های ثبت‌شده برای یک شکایت.
    می‌تواند توسط مشتری، صاحب فروشگاه یا مسئول رسیدگی ثبت شود.
    """
    complaint = models.ForeignKey(
        'Complaint',
        on_delete=models.CASCADE,
        related_name='responses',
        verbose_name='شکایت'
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='complaint_responses',
        verbose_name='پاسخ‌دهنده'
    )
    response_text = models.TextField(verbose_name='متن پاسخ')
    is_internal_note = models.BooleanField(
        default=False,
        verbose_name='یادداشت داخلی',
        help_text='اگر تیک بخورد، فقط برای مدیران قابل مشاهده است'
    )

    class Meta:
        db_table = 'complaints_response'
        verbose_name = 'پاسخ شکایت'
        verbose_name_plural = 'پاسخ‌های شکایات'
        ordering = ['created_at']

    def __str__(self) -> str:
        return f"پاسخ توسط {self.user.get_full_name()} برای شکایت {self.complaint.id}"