from django.db import models
from apps.common.base import BaseModel

class Gallery(BaseModel):
    """گالری تصاویر"""
    title = models.CharField(max_length=200, verbose_name='عنوان تصویر')
    image = models.ImageField(upload_to='cms/gallery/%Y/%m/', verbose_name='تصویر')
    description = models.TextField(blank=True, verbose_name='توضیحات')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='ترتیب نمایش')
    is_active = models.BooleanField(default=True, verbose_name='فعال', db_index=True)

    class Meta:
        db_table = 'cms_gallery'
        verbose_name = 'تصویر گالری'
        verbose_name_plural = 'گالری تصاویر'
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title