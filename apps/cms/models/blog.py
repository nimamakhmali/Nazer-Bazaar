from django.db import models
from django.conf import settings
from apps.common.base import BaseModel

class BlogCategory(BaseModel):
    """دسته‌بندی مطالب وبلاگ"""
    name = models.CharField(max_length=100, unique=True, verbose_name='نام دسته‌بندی')
    slug = models.SlugField(max_length=100, unique=True, allow_unicode=True)
    is_active = models.BooleanField(default=True, verbose_name='فعال')

    class Meta:
        db_table = 'cms_blog_category'
        verbose_name = 'دسته‌بندی وبلاگ'
        verbose_name_plural = 'دسته‌بندی‌های وبلاگ'

    def __str__(self):
        return self.name

class Blog(BaseModel):
    """مطالب وبلاگ"""
    title = models.CharField(max_length=255, verbose_name='عنوان مطلب')
    slug = models.SlugField(max_length=255, unique=True, allow_unicode=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='blog_posts', verbose_name='نویسنده')
    category = models.ForeignKey(BlogCategory, on_delete=models.PROTECT, related_name='blogs', verbose_name='دسته‌بندی')
    summary = models.TextField(verbose_name='خلاصه مطلب')
    content = models.TextField(verbose_name='محتوای کامل')
    image = models.ImageField(upload_to='cms/blog/%Y/%m/', verbose_name='تصویر شاخص')
    is_published = models.BooleanField(default=False, verbose_name='منتشر شده')
    published_at = models.DateTimeField(null=True, blank=True, verbose_name='تاریخ انتشار')

    class Meta:
        db_table = 'cms_blog'
        verbose_name = 'مطلب وبلاگ'
        verbose_name_plural = 'مطالب وبلاگ'
        ordering = ['-published_at', '-created_at']

    def __str__(self):
        return self.title