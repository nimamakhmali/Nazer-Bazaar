"""
Signals مربوط به pricing
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='pricing.OfficialPrice')
def official_price_post_save(sender, instance, created, **kwargs):
    """ثبت تاریخچه بعد از ذخیره قیمت مصوب"""
    from apps.pricing.models import PriceHistory, PriceChangeType

    if created:
        PriceHistory.objects.create(
            change_type=PriceChangeType.OFFICIAL_PRICE_CREATED,
            official_price=instance,
            union_id=instance.union_id,
            union_name=instance.union.name,
            product_id=instance.product_id,
            product_name=instance.product.name,
            new_price=instance.price,
            price_date=instance.effective_date,
            changed_by=instance.created_by,
            changed_by_name=instance.created_by.full_name,
            changed_by_role=instance.created_by.role,
        )
        logger.info(
            f'OfficialPrice created: {instance.product.name} '
            f'for {instance.union.name} on {instance.effective_date} '
            f'price={instance.price}'
        )


@receiver(post_save, sender='pricing.StorePrice')
def store_price_post_save(sender, instance, created, **kwargs):
    """ثبت تاریخچه بعد از ذخیره قیمت فروشگاه"""
    from apps.pricing.models import PriceHistory, PriceChangeType

    if created:
        PriceHistory.objects.create(
            change_type=PriceChangeType.STORE_PRICE_CREATED,
            store_price=instance,
            union_id=instance.store.union_id,
            union_name=instance.store.union.name,
            product_id=instance.product_id,
            product_name=instance.product.name,
            store_id=instance.store_id,
            store_name=instance.store.name,
            new_price=instance.price,
            price_date=instance.price_date,
            changed_by=instance.created_by,
            changed_by_name=instance.created_by.full_name,
            changed_by_role=instance.created_by.role,
        )

        if instance.is_overpriced:
            logger.warning(
                f'OVERPRICED: {instance.store.name} set price '
                f'{instance.price} for {instance.product.name} '
                f'but official price is {instance.official_price_amount}'
            )