"""
Signals مربوط به organizations
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.organizations.models import ProvinceOffice, Chamber, Union

logger = logging.getLogger(__name__)


@receiver(post_save, sender=ProvinceOffice)
def province_office_post_save(
    sender,
    instance: ProvinceOffice,
    created: bool,
    **kwargs
):
    if created:
        logger.info(
            f'ProvinceOffice created: {instance.name} '
            f'for province: {instance.province_name}'
        )


@receiver(post_save, sender=Chamber)
def chamber_post_save(
    sender,
    instance: Chamber,
    created: bool,
    **kwargs
):
    if created:
        logger.info(
            f'Chamber created: {instance.name} '
            f'in city: {instance.city_name}'
        )


@receiver(post_save, sender=Union)
def union_post_save(
    sender,
    instance: Union,
    created: bool,
    **kwargs
):
    if created:
        logger.info(
            f'Union created: {instance.name} '
            f'in chamber: {instance.chamber.name}'
        )