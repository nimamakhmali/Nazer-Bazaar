import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Complaint

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Complaint)
def complaint_post_save(sender, instance: Complaint, created: bool, **kwargs):
    if created:
        logger.info(f"New complaint created with UUID: {instance.uuid}")