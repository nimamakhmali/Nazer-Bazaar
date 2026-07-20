"""
ثابت‌های مربوط به قیمت‌گذاری

این مهم‌ترین قانون کسب‌وکار سیستم است:
فروشگاه باید قیمت محصول را بین 80% تا 100% قیمت مصوب اتحادیه ثبت کند.
"""
from decimal import Decimal


# ─── قوانین قیمت‌گذاری ──────────────────────────────────────────────────────

# حداقل نسبت قیمت فروشگاه به قیمت مصوب (80%)
PRICE_MIN_RATIO = Decimal('0.80')

# حداکثر نسبت قیمت فروشگاه به قیمت مصوب (100%)
PRICE_MAX_RATIO = Decimal('1.00')

# حداکثر درصد تخفیف مجاز (20%)
MAX_DISCOUNT_PERCENT = Decimal('20.00')


def calculate_min_allowed_price(official_price: Decimal) -> Decimal:
    """
    حداقل قیمت مجاز فروشگاه را محاسبه می‌کند.
    
    Args:
        official_price: قیمت مصوب اتحادیه
        
    Returns:
        حداقل قیمتی که فروشگاه مجاز است محصول را بفروشد
        
    Example:
        >>> calculate_min_allowed_price(Decimal('100000'))
        Decimal('80000.00')
    """
    return (official_price * PRICE_MIN_RATIO).quantize(Decimal('0.01'))


def calculate_max_allowed_price(official_price: Decimal) -> Decimal:
    """
    حداکثر قیمت مجاز فروشگاه را محاسبه می‌کند.
    
    Args:
        official_price: قیمت مصوب اتحادیه
        
    Returns:
        حداکثر قیمتی که فروشگاه مجاز است محصول را بفروشد
        
    Example:
        >>> calculate_max_allowed_price(Decimal('100000'))
        Decimal('100000.00')
    """
    return (official_price * PRICE_MAX_RATIO).quantize(Decimal('0.01'))


def is_price_valid(
                    store_price: Decimal,
                    official_price: Decimal
                    ) -> bool:
    """
    بررسی می‌کند که آیا قیمت فروشگاه در محدوده مجاز است.
    
    Args:
        store_price: قیمت ثبت‌شده توسط فروشگاه
        official_price: قیمت مصوب اتحادیه
        
    Returns:
        True اگر قیمت در محدوده مجاز باشد
    """
    min_price = calculate_min_allowed_price(official_price)
    max_price = calculate_max_allowed_price(official_price)
    return min_price <= store_price <= max_price