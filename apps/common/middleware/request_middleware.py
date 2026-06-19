"""
Middleware های مشترک پروژه
"""
import time
import logging

logger = logging.getLogger(__name__)


class RequestTimingMiddleware:
    """
    ثبت زمان پردازش هر request.
    در production برای شناسایی کندی‌ها مفید است.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time

        # اگر request بیش از 2 ثانیه طول کشید، هشدار بده
        if duration > 2.0:
            logger.warning(
                f'Slow request: {request.method} {request.path} '
                f'took {duration:.2f}s'
            )

        response['X-Request-Duration'] = f'{duration:.3f}s'
        return response