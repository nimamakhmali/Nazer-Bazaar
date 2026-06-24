"""
Signals مربوط به products
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.products.models import Product

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Product)
def product_post_save(
    sender,
    instance: Product,
    created: bool,
    **kwargs
):
    if created:
        logger.info(
            f'New product created: {instance.name} '
            f'in category: {instance.category.name}'
        )