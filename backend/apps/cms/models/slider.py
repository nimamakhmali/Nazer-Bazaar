from django.db import models
from apps.common.base import BaseModel

class Slider(BaseModel):
    """اسلایدر صفحه اصلی"""
    title = models.CharField(max_length=200, verbose_name='عنوان')
    subtitle = models.CharField(max_length=200, blank=True, verbose_name='زیرنویس')
    image = models.ImageField(upload_to='cms/sliders/%Y/%m/', verbose_name='تصویر اسلاید')
    link = models.URLField(blank=True, verbose_name='لینک')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='ترتیب نمایش')
    is_active = models.BooleanField(default=True, verbose_name='فعال', db_index=True)

    class Meta:
        db_table = 'cms_slider'
        verbose_name = 'اسلاید'
        verbose_name_plural = 'اسلایدرها'
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title