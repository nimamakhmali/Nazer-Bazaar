
import logging
from typing import Any, Optional
from django.db.models import QuerySet

logger = logging.getLogger(__name__)


class BaseSelector:


    @staticmethod
    def get_or_none(model_class, **kwargs: Any) -> Optional[Any]:

        try:
            return model_class.objects.get(**kwargs)
        except model_class.DoesNotExist:
            return None
        except model_class.MultipleObjectsReturned:
            logger.warning(
                f'Multiple objects returned for {model_class.__name__} '
                f'with filters: {kwargs}'
            )
            return model_class.objects.filter(**kwargs).first()

    @staticmethod
    def get_active(model_class) -> QuerySet:
        """تمام رکوردهای فعال را برمی‌گرداند"""
        return model_class.objects.filter(is_active=True)

    @staticmethod
    def get_all(model_class) -> QuerySet:
        """تمام رکوردها را برمی‌گرداند"""
        return model_class.objects.all()