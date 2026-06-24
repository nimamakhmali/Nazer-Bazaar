from apps.common.base import BaseService
from ..models import Notification
from ..tasks import send_sms_task

class NotificationService(BaseService):
    
    def create_panel_notification(self, recipient, title, message, link=None):
        """ایجاد اعلان در پنل کاربری"""
        Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            link=link
        )

    def send_sms(self, phone_number: str, message: str):
        """ارسال SMS از طریق Celery task"""
        send_sms_task.delay(phone_number, message)

    def notify_user(self, user, title, message, by_sms=False):
        """
        ارسال اعلان به کاربر از طریق پنل و (اختیاری) SMS
        """
        self.create_panel_notification(user, title, message)
        if by_sms and user.phone_number:
            self.send_sms(user.phone_number, message)