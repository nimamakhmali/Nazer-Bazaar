import logging
from celery import shared_task

logger = logging.getLogger(__name__)

@shared_task(name='complaints.notify_new_complaint')
def notify_new_complaint(complaint_id: int):
    from .models import Complaint
    complaint = Complaint.objects.select_related('store__union__manager').get(id=complaint_id)
    union_manager = complaint.store.union.manager
    if union_manager and union_manager.phone_number:
        message = f"شکایت جدیدی برای فروشگاه {complaint.store.name} در اتحادیه شما ثبت شد. UUID: {complaint.uuid}"
        logger.info(f"SMS to {union_manager.phone_number}: {message}")
        # Call SMS service here
    return f"Notification sent for complaint {complaint_id}"

@shared_task(name='complaints.send_complaint_status_update')
def send_complaint_status_update(complaint_id: int):
    from .models import Complaint
    complaint = Complaint.objects.select_related('customer').get(id=complaint_id)
    customer = complaint.customer
    if customer and customer.phone_number:
        message = f"وضعیت شکایت شما با کد رهگیری {complaint.uuid} به '{complaint.get_status_display()}' تغییر کرد."
        logger.info(f"SMS to {customer.phone_number}: {message}")
        # Call SMS service here
    return f"Status update sent for complaint {complaint_id}"