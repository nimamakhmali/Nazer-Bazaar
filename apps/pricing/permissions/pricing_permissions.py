"""
Pricing Permissions
"""
from rest_framework.permissions import BasePermission
from apps.common.choices import UserRole


class CanSetOfficialPrice(BasePermission):
    """
    دسترسی به ثبت قیمت مصوب.
    فقط رئیس اتحادیه و ادمین.
    """
    message = 'فقط رئیس اتحادیه یا ادمین می‌تواند قیمت مصوب ثبت کند'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.ADMIN,
                UserRole.UNION_MANAGER,
            ]
        )


class CanSetStorePrice(BasePermission):
    """
    دسترسی به ثبت قیمت فروشگاه.
    صاحب فروشگاه، رئیس اتحادیه، ادمین.
    """
    message = 'شما دسترسی به ثبت قیمت فروشگاه را ندارید'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.ADMIN,
                UserRole.UNION_MANAGER,
                UserRole.STORE_OWNER,
            ]
        )


class CanViewPrices(BasePermission):
    """همه می‌توانند قیمت‌ها را ببینند"""

    def has_permission(self, request, view):
        return True


class CanViewPriceHistory(BasePermission):
    """دسترسی به تاریخچه قیمت"""
    message = 'برای مشاهده تاریخچه قیمت باید وارد سیستم شوید'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.ADMIN,
                UserRole.PROVINCE_MANAGER,
                UserRole.CHAMBER_MANAGER,
                UserRole.UNION_MANAGER,
                UserRole.INSPECTOR,
            ]
        )