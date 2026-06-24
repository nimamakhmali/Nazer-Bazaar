"""
Store Permissions
"""
from rest_framework.permissions import BasePermission
from apps.common.choices import UserRole


class CanManageStore(BasePermission):
    """
    دسترسی به مدیریت فروشگاه.
    ادمین، استانداری، اتاق اصناف، اتحادیه، صاحب فروشگاه
    """
    message = 'شما دسترسی لازم برای مدیریت فروشگاه را ندارید'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.ADMIN,
                UserRole.PROVINCE_MANAGER,
                UserRole.CHAMBER_MANAGER,
                UserRole.UNION_MANAGER,
                UserRole.STORE_OWNER,
            ]
        )


class CanApproveStore(BasePermission):
    """
    دسترسی به تایید/رد/تعلیق فروشگاه.
    فقط ادمین و مدیران سازمانی (نه صاحب فروشگاه)
    """
    message = 'شما دسترسی لازم برای تایید فروشگاه را ندارید'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.ADMIN,
                UserRole.PROVINCE_MANAGER,
                UserRole.CHAMBER_MANAGER,
                UserRole.UNION_MANAGER,
            ]
        )


class CanViewStoreDetails(BasePermission):
    """
    دسترسی به مشاهده جزئیات فروشگاه.
    همه کاربران احراز هویت شده
    """
    message = 'برای مشاهده جزئیات فروشگاه باید وارد سیستم شوید'

    def has_permission(self, request, view):
        return request.user.is_authenticated