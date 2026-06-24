from django.db import models
from django.conf import settings
from apps.common.base import BaseModel

class Notification(BaseModel):
    """اعلان‌های درون‌برنامه‌ای برای کاربران"""
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255, verbose_name='عنوان')
    message = models.TextField(verbose_name='متن پیام')
    is_read = models.BooleanField(default=False, db_index=True, verbose_name='خوانده شده')
    read_at = models.DateTimeField(null=True, blank=True, verbose_name='زمان خواندن')
    link = models.URLField(blank=True, null=True, verbose_name='لینک مرتبط')

    class Meta:
        db_table = 'notifications_notification'
        verbose_name = 'اعلان'
        verbose_name_plural = 'اعلان‌ها'
        ordering = ('-created_at',)

    def __str__(self):
        return self.title