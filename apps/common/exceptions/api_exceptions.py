
import logging
from typing import Any
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from .base_exceptions import (
    PriceMonitorBaseException,
    BusinessRuleViolation,
    AuthenticationError,
    ResourceNotFoundError,
    PriceValidationError,
)



logger = logging.getLogger(__name__)


def custom_exception_handler(exc: Exception, context: Any) -> Response:
    """
    Exception handler سفارشی برای DRF.
    
    فرمت پاسخ خطا:
    {
        "success": false,
        "error": {
            "code": "price_validation_error",
            "message": "قیمت وارد شده در محدوده مجاز نیست",
            "details": {}
        }
    }
    """
    # ابتدا handler پیش‌فرض DRF را صدا می‌زنیم
    response = exception_handler(exc, context)

    # خطاهای سفارشی پروژه
    if isinstance(exc, PriceValidationError):
        return Response(
            _build_error_response(exc.code, exc.message),
            status=status.HTTP_422_UNPROCESSABLE_ENTITY
        )

    if isinstance(exc, BusinessRuleViolation):
        return Response(
            _build_error_response(exc.code, exc.message),
            status=status.HTTP_400_BAD_REQUEST
        )

    if isinstance(exc, AuthenticationError):
        return Response(
            _build_error_response(exc.code, exc.message),
            status=status.HTTP_401_UNAUTHORIZED
        )

    if isinstance(exc, ResourceNotFoundError):
        return Response(
            _build_error_response(exc.code, exc.message),
            status=status.HTTP_404_NOT_FOUND
        )

    if isinstance(exc, PriceMonitorBaseException):
        return Response(
            _build_error_response(exc.code, exc.message),
            status=status.HTTP_400_BAD_REQUEST
        )

    # خطاهای DRF استاندارد را هم به همین فرمت تبدیل می‌کنیم
    if response is not None:
        return Response(
            _build_error_response(
                code='api_error',
                message=_extract_drf_error_message(response.data),
                details=response.data
            ),
            status=response.status_code
        )

    # خطاهای پیش‌بینی‌نشده
    logger.exception('Unhandled exception occurred', exc_info=exc)
    return Response(
        _build_error_response(
            code='server_error',
            message='خطای داخلی سرور رخ داده است'
        ),
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )



def _build_error_response(
    code: str,
    message: str,
    details: Any = None
) -> dict:
    """ساختار یکسان پاسخ خطا"""
    response = {
        'success': False,
        'error': {
            'code': code,
            'message': message,
        }
    }
    if details:
        response['error']['details'] = details
    return response


def _extract_drf_error_message(data: Any) -> str:
    """استخراج پیام خطا از response DRF"""
    if isinstance(data, dict):
        for key in ['detail', 'non_field_errors', 'message']:
            if key in data:
                value = data[key]
                if hasattr(value, '__iter__') and not isinstance(value, str):
                    return str(value[0])
                return str(value)
        first_value = next(iter(data.values()), None)
        if first_value:
            if hasattr(first_value, '__iter__') and not isinstance(
                first_value, str
            ):
                return str(first_value[0])
            return str(first_value)
    if isinstance(data, list) and data:
        return str(data[0])
    return 'خطایی رخ داده است'