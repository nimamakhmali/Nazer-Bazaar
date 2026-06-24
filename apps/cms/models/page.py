from django.db import models
from apps.common.base import BaseModel

class Page(BaseModel):
    """صفحات استاتیک سایت (درباره ما، تماس با ما و ...)"""
    title = models.CharField(max_length=200, verbose_name='عنوان صفحه')
    slug = models.SlugField(max_length=200, unique=True, allow_unicode=True, verbose_name='نامک')
    content = models.TextField(verbose_name='محتوا')
    is_published = models.BooleanField(default=True, verbose_name='منتشر شده')

    class Meta:
        db_table = 'cms_page'
        verbose_name = 'صفحه'
        verbose_name_plural = 'صفحات'
        ordering = ['title']

    def __str__(self):
        return self.title