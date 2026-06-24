"""
Signals مربوط به stores
"""
import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from apps.stores.models import Store
from apps.common.choices import StoreStatus

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Store)
def store_post_save(
    sender,
    instance: Store,
    created: bool,
    **kwargs
):
    """
    بعد از ذخیره فروشگاه:
    1. اگر تازه ایجاد شد، لاگ بزن
    2. اگر وضعیت تغییر کرد، اطلاع‌رسانی کن
    """
    if created:
        logger.info(
            f'New store registered: {instance.name} '
            f'in union: {instance.union.name}'
        )


@receiver(pre_save, sender=Store)
def store_pre_save(
    sender,
    instance: Store,
    **kwargs
):
    """
    قبل از ذخیره فروشگاه:
    تشخیص تغییر وضعیت برای اطلاع‌رسانی
    """
    if instance.pk:
        try:
            old_instance = Store.objects.get(pk=instance.pk)
            if old_instance.status != instance.status:
                logger.info(
                    f'Store status changed: {instance.name} '
                    f'{old_instance.status} → {instance.status}'
                )
        except Store.DoesNotExist:
            pass