"""
ابزارهای مربوط به تاریخ و زمان (شمسی/میلادی)
"""
from django.utils import timezone
import jdatetime
from datetime import date, datetime
from typing import Optional


def get_today_jalali() -> str:
    """تاریخ امروز شمسی"""
    return jdatetime.date.today().strftime('%Y/%m/%d')


def get_now_jalali() -> str:
    """تاریخ و زمان الان شمسی"""
    return jdatetime.datetime.now().strftime('%Y/%m/%d %H:%M')


def gregorian_to_jalali(date_obj: Optional[date]) -> Optional[str]:
    """تبدیل تاریخ میلادی به شمسی"""
    if not date_obj:
        return None
    j_date = jdatetime.date.fromgregorian(date=date_obj)
    return j_date.strftime('%Y/%m/%d')


def jalali_to_gregorian(jalali_str: str) -> Optional[date]:
    """
    تبدیل تاریخ شمسی به میلادی.
    
    Args:
        jalali_str: تاریخ شمسی به فرمت YYYY/MM/DD
        
    Returns:
        تاریخ میلادی یا None در صورت خطا
    """
    try:
        parts = jalali_str.replace('-', '/').split('/')
        j_date = jdatetime.date(int(parts[0]), int(parts[1]), int(parts[2]))
        return j_date.togregorian()
    except (ValueError, IndexError, AttributeError):
        return None


def is_today(date_obj: date) -> bool:
    """بررسی اینکه آیا تاریخ داده‌شده امروز است"""
    return date_obj == timezone.now().date()