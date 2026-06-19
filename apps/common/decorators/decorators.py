"""
Decorators مشترک پروژه
"""
import functools
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)


def cache_result(key: str, timeout: int = 300):
    """
    Cache کردن نتیجه یک تابع.
    
    نحوه استفاده:
        @cache_result(key='provinces:all', timeout=3600)
        def get_all_provinces():
            return Province.objects.all()
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            cached = cache.get(key)
            if cached is not None:
                return cached
            result = func(*args, **kwargs)
            cache.set(key, result, timeout)
            return result
        return wrapper
    return decorator


def log_action(action_name: str):
    """
    ثبت لاگ برای یک عملیات.
    
    نحوه استفاده:
        @log_action('create_official_price')
        def create_official_price(self, data):
            ...
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            logger.info(f'Action started: {action_name}')
            try:
                result = func(*args, **kwargs)
                logger.info(f'Action completed: {action_name}')
                return result
            except Exception as e:
                logger.error(
                    f'Action failed: {action_name} - Error: {str(e)}'
                )
                raise
        return wrapper
    return decorator