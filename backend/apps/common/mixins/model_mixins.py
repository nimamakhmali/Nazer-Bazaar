"""
Model Mixins - قابلیت‌های قابل اضافه کردن به مدل‌ها
"""
from django.db import models
from django.utils import timezone


class TimeStampMixin(models.Model):
    """اضافه کردن فیلدهای زمانی به مدل"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteMixin(models.Model):
    """اضافه کردن قابلیت حذف منطقی به مدل"""
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def soft_delete(self) -> None:
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])


class OrderableMixin(models.Model):
    """اضافه کردن قابلیت مرتب‌سازی دستی به مدل (مثل Slider)"""
    order = models.PositiveIntegerField(
        default=0,
        verbose_name='ترتیب نمایش'
    )

    class Meta:
        abstract = True
        ordering = ['order']
        
        