"""
Signals مربوط به accounts

سیگنال‌ها برای عملیاتی که باید بعد از رویدادهای خاص انجام شوند.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.accounts.models import User

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def user_post_save(sender, instance: User, created: bool, **kwargs):
    """
    بعد از ایجاد کاربر جدید:
    1. لاگ ثبت می‌کنیم
    """
    if created:
        logger.info(
            f'New user created: {instance.phone_number} '
            f'with role: {instance.role}'
        )