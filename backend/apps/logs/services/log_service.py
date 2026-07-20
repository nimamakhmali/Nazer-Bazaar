from django.contrib.contenttypes.models import ContentType
from apps.common.base import BaseService
from ..models import ActivityLog

class LogService(BaseService):
    
    def create_log(
        self,
        actor,
        verb: str,
        action_object=None,
        ip_address: str = None,
        data: dict = None
    ):
        """
        یک لاگ فعالیت جدید ایجاد می‌کند.
        این متد باید از درون سایر سرویس‌ها صدا زده شود.
        """
        if action_object:
            content_type = ContentType.objects.get_for_model(action_object)
            object_id = action_object.pk
        else:
            content_type = None
            object_id = None
        
        ActivityLog.objects.create(
            actor=actor,
            verb=verb,
            content_type=content_type,
            object_id=object_id,
            ip_address=ip_address,
            data=data or {}
        )