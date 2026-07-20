"""
ابزارهای مربوط به رشته
"""
import re


def normalize_persian_text(text: str) -> str:
    """
    نرمال‌سازی متن فارسی.
    - تبدیل ی عربی به ی فارسی
    - تبدیل ک عربی به ک فارسی
    - حذف فاصله‌های اضافی
    """
    if not text:
        return text

    text = text.replace('ي', 'ی').replace('ك', 'ک')
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def mask_mobile(mobile: str) -> str:
    """
    مخفی کردن بخشی از شماره موبایل.
    
    Example:
        09123456789 → 0912***6789
    """
    if not mobile or len(mobile) < 7:
        return mobile
    return mobile[:4] + '***' + mobile[7:]


def mask_national_id(national_id: str) -> str:
    """
    مخفی کردن بخشی از کد ملی.
    
    Example:
        1234567890 → 123***890
    """
    if not mobile or len(national_id) < 7:
        return national_id
    return national_id[:3] + '***' + national_id[7:]