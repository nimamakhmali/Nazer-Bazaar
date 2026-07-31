import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Complaint

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Complaint)
def complaint_post_save(sender, instance: Complaint, created: bool, **kwargs):
    """
    بعد از ثبت شکایت:
    1. به رئیس اتحادیه ارجاع شود
    2. نوتیفیکیشن ارسال شود
    3. Task ۴۸ ساعته شروع شود
    """
    if created:
        logger.info(f"New complaint created: {instance.tracking_code}")
        
        # ✅ Auto-assign به رئیس اتحادیه
        try:
            union_manager = instance.store.union.manager
            if union_manager:
                instance.assigned_union_manager = union_manager
                instance.assigned_to = union_manager
                instance.escalation_level = 1
                instance.status = 'reviewing'  # تغییر وضعیت به "در بررسی"
                instance.save(update_fields=[
                    'assigned_union_manager',
                    'assigned_to',
                    'escalation_level',
                    'status',
                    'updated_at'
                ])
                
                # ارسال نوتیفیکیشن به رئیس اتحادیه
                from apps.notifications.services import NotificationService
                NotificationService().notify_user(
                    user=union_manager,
                    title="شکایت جدید",
                    message=f"شکایت جدیدی از فروشگاه {instance.store.name} ثبت شد. کد: {instance.tracking_code}",
                    by_sms=True
                )
                
                # ✅ شروع Task بررسی ۴۸ ساعته
                from .tasks import check_complaint_escalation
                check_complaint_escalation.apply_async(
                    args=[instance.id],
                    countdown=48 * 3600  # ۴۸ ساعت بعد
                )
                
                logger.info(f"Complaint {instance.tracking_code} assigned to union manager {union_manager.id}")
        except Exception as e:
            logger.error(f"Failed to auto-assign complaint {instance.id}: {str(e)}")