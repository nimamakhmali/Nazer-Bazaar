from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class ActivityLog(models.Model):
    """مدل ثبت فعالیت‌های کاربران"""
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='activity_logs',
        verbose_name='انجام‌دهنده'
    )
    verb = models.CharField(max_length=255, verbose_name='عمل انجام شده')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='آدرس IP')
    
    # Generic relation to the object that was acted upon
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    action_object = GenericForeignKey('content_type', 'object_id')
    
    data = models.JSONField(default=dict, blank=True, verbose_name='داده‌های اضافی')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='زمان')

    class Meta:
        db_table = 'logs_activity'
        verbose_name = 'لاگ فعالیت'
        verbose_name_plural = 'لاگ‌های فعالیت'
        ordering = ('-created_at',)

    def __str__(self):
        if self.action_object:
            return f'{self.actor} {self.verb} {self.action_object}'
        return f'{self.actor} {self.verb}'