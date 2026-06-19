"""
اعتبارسنجی شماره موبایل ایرانی
"""

import re
from django.core.exceptions import ValidationError


IRAN_MOBILE_REGEX = re.compile(r'^(\+98|0098|98|0)9[0-9]{9}$')


def validate_iranian_mobile(value: str) -> None:
    """
    اعتبارسنجی شماره موبایل ایرانی.
    
    فرمت‌های قابل قبول:
        09123456789
        9123456789
        +989123456789
        00989123456789
        
    Raises:
        ValidationError: اگر شماره معتبر نباشد
    """
    if not value:
        raise ValidationError('شماره موبایل نمی‌تواند خالی باشد')

    cleaned = str(value).strip().replace(' ', '').replace('-', '')

    if not IRAN_MOBILE_REGEX.match(cleaned):
        raise ValidationError(
            'شماره موبایل وارد شده معتبر نیست. '
            'مثال: 09123456789'
        )


def normalize_mobile(value: str) -> str:
    """
    شماره موبایل را به فرمت استاندارد 09xxxxxxxxx تبدیل می‌کند.
    
    Args:
        value: شماره موبایل در هر فرمتی
        
    Returns:
        شماره موبایل در فرمت 09xxxxxxxxx
    """
    cleaned = str(value).strip().replace(' ', '').replace('-', '')

    if cleaned.startswith('+98'):
        return '0' + cleaned[3:]
    if cleaned.startswith('0098'):
        return '0' + cleaned[4:]
    if cleaned.startswith('98') and len(cleaned) == 12:
        return '0' + cleaned[2:]
    if cleaned.startswith('9') and len(cleaned) == 10:
        return '0' + cleaned

    return cleaned