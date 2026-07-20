"""
اعتبارسنجی کد ملی ایرانی
"""

from django.core.exceptions import ValidationError


def validate_iranian_national_id(value: str) -> None:
    """
    اعتبارسنجی کد ملی ایرانی با الگوریتم رسمی.
    
    Args:
        value: کد ملی
        
    Raises:
        ValidationError: اگر کد ملی معتبر نباشد
    """
    if not value:
        raise ValidationError('کد ملی نمی‌تواند خالی باشد')

    code = str(value).strip().zfill(10)

    # باید ۱۰ رقم باشد
    if len(code) != 10 or not code.isdigit():
        raise ValidationError('کد ملی باید ۱۰ رقم باشد')

    # کدهای تکراری معتبر نیستند (0000000000, 1111111111, ...)
    if len(set(code)) == 1:
        raise ValidationError('کد ملی وارد شده معتبر نیست')

    # الگوریتم اعتبارسنجی کد ملی
    total = sum(int(code[i]) * (10 - i) for i in range(9))
    remainder = total % 11
    check_digit = int(code[9])

    if remainder < 2:
        if check_digit != remainder:
            raise ValidationError('کد ملی وارد شده معتبر نیست')
    else:
        if check_digit != (11 - remainder):
            raise ValidationError('کد ملی وارد شده معتبر نیست')