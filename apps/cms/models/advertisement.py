from django.db import models
from apps.common.base import BaseModel

class AdPosition(models.TextChoices):
    HEADER = 'header', 'هدر سایت'
    SIDEBAR = 'sidebar', 'سایدبار'
    FOOTER = 'footer', 'فوتر'
    POPUP = 'popup', 'پاپ‌آپ'

class Advertisement(BaseModel):
    """تبلیغات بنری"""
    title = models.CharField(max_length=200, verbose_name='عنوان تبلیغ')
    image = models.ImageField(upload_to='cms/ads/%Y/%m/', verbose_name='تصویر تبلیغ')
    link = models.URLField(verbose_name='لینک مقصد')
    position = models.CharField(max_length=20, choices=AdPosition.choices, verbose_name='محل نمایش')
    is_active = models.BooleanField(default=True, verbose_name='فعال', db_index=True)
    start_date = models.DateTimeField(null=True, blank=True, verbose_name='تاریخ شروع')
    end_date = models.DateTimeField(null=True, blank=True, verbose_name='تاریخ پایان')

    class Meta:
        db_table = 'cms_advertisement'
        verbose_name = 'تبلیغ'
        verbose_name_plural = 'تبلیغات'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_position_display()})"