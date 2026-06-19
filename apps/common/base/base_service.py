import logging
from typing import Any
from django.db import transaction


logger = logging.getLogger(__name__)


class BaseService:
        

    @staticmethod
    def transaction():
        return transaction.atomic()

    @staticmethod
    def log_info(message: str, **kwargs: Any) -> None:
        logger.info(message, extra=kwargs)
        

    @staticmethod
    def log_error(message: str, **kwargs: Any) -> None:
        """ثبت لاگ سطح ERROR"""
        logger.error(message, extra=kwargs)

    @staticmethod
    def log_warning(message: str, **kwargs: Any) -> None:
        """ثبت لاگ سطح WARNING"""
        logger.warning(message, extra=kwargs)
        