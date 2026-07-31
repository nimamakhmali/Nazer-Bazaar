import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name='complaints.notify_new_complaint')
def notify_new_complaint(complaint_id: int):
    """اعلان شکایت جدید (deprecated - حالا از signal استفاده می‌کنیم)"""
    pass


@shared_task(name='complaints.send_complaint_status_update')
def send_complaint_status_update(complaint_id: int):
    """اعلان تغییر وضعیت شکایت"""
    from .models import Complaint
    try:
        complaint = Complaint.objects.select_related('customer').get(id=complaint_id)
        customer = complaint.customer
        if customer and customer.phone_number:
            message = f"وضعیت شکایت {complaint.tracking_code} به '{complaint.get_status_display()}' تغییر کرد."
            logger.info(f"SMS to {customer.phone_number}: {message}")
            # TODO: Call SMS service
    except Complaint.DoesNotExist:
        logger.error(f"Complaint {complaint_id} not found")


@shared_task(name='complaints.check_complaint_escalation')
def check_complaint_escalation(complaint_id: int):
    """
    بررسی شکایت برای ارجاع به سطح بالاتر
    - بعد از ۴۸ ساعت: ارجاع به مدیر اتاق اصناف
    - بعد از ۹۶ ساعت: ارجاع به ناظر استانداری
    """
    from .models import Complaint
    from apps.notifications.services import NotificationService
    
    try:
        complaint = Complaint.objects.select_related(
            'store__union__chamber__manager',
            'store__union__chamber__city__province__provinceoffice__manager',
            'assigned_union_manager'
        ).get(id=complaint_id)
        
        # اگر شکایت بسته شده، کاری نکن
        if complaint.is_closed:
            logger.info(f"Complaint {complaint.tracking_code} is closed, skipping escalation")
            return
        
        hours = complaint.hours_since_created
        notification_service = NotificationService()
        
        # ✅ Escalation Level 1 → 2 (۴۸ ساعت)
        if hours >= 48 and complaint.escalation_level == 1:
            chamber_manager = complaint.store.union.chamber.manager
            if chamber_manager:
                complaint.assigned_chamber_manager = chamber_manager
                complaint.assigned_to = chamber_manager
                complaint.escalation_level = 2
                complaint.escalated_at_48h = timezone.now()
                complaint.save(update_fields=[
                    'assigned_chamber_manager',
                    'assigned_to',
                    'escalation_level',
                    'escalated_at_48h',
                    'updated_at'
                ])
                
                # نوتیفیکیشن به مدیر اتاق اصناف
                notification_service.notify_user(
                    user=chamber_manager,
                    title="شکایت ارجاعی (۴۸ ساعته)",
                    message=f"شکایت {complaint.tracking_code} از طرف اتحادیه پیگیری نشد. لطفاً رسیدگی کنید.",
                    by_sms=True
                )
                
                # نوتیفیکیشن به رئیس اتحادیه
                if complaint.assigned_union_manager:
                    notification_service.notify_user(
                        user=complaint.assigned_union_manager,
                        title="هشدار تاخیر",
                        message=f"شکایت {complaint.tracking_code} به دلیل عدم پیگیری ۴۸ ساعته، به مدیر اتاق اصناف ارجاع شد.",
                        by_sms=False
                    )
                
                # Schedule ۴۸ ساعت بعدی
                check_complaint_escalation.apply_async(
                    args=[complaint_id],
                    countdown=48 * 3600
                )
                
                logger.info(f"Complaint {complaint.tracking_code} escalated to chamber (level 2)")
        
        # ✅ Escalation Level 2 → 3 (۹۶ ساعت)
        elif hours >= 96 and complaint.escalation_level == 2:
            try:
                province_manager = complaint.store.union.chamber.city.province.provinceoffice.manager
                if province_manager:
                    complaint.assigned_province_manager = province_manager
                    complaint.assigned_to = province_manager
                    complaint.escalation_level = 3
                    complaint.escalated_at_96h = timezone.now()
                    complaint.save(update_fields=[
                        'assigned_province_manager',
                        'assigned_to',
                        'escalation_level',
                        'escalated_at_96h',
                        'updated_at'
                    ])
                    
                    # نوتیفیکیشن به ناظر استانداری
                    notification_service.notify_user(
                        user=province_manager,
                        title="شکایت ارجاعی (۹۶ ساعته)",
                        message=f"شکایت {complaint.tracking_code} پس از ۴ روز هنوز رسیدگی نشده. نیاز به پیگیری فوری.",
                        by_sms=True
                    )
                    
                    # نوتیفیکیشن به مدیران قبلی
                    if complaint.assigned_chamber_manager:
                        notification_service.notify_user(
                            user=complaint.assigned_chamber_manager,
                            title="هشدار تاخیر شدید",
                            message=f"شکایت {complaint.tracking_code} به استانداری ارجاع شد.",
                            by_sms=False
                        )
                    
                    logger.info(f"Complaint {complaint.tracking_code} escalated to province (level 3)")
            except AttributeError as e:
                logger.error(f"Failed to get province manager: {str(e)}")
        
    except Complaint.DoesNotExist:
        logger.error(f"Complaint {complaint_id} not found for escalation check")
    except Exception as e:
        logger.error(f"Error in escalation check for complaint {complaint_id}: {str(e)}", exc_info=True)