"""
Base Permissions - سطوح دسترسی پایه سیستم
"""
from rest_framework.permissions import BasePermission
from apps.common.choices import UserRole


class IsAdminUser(BasePermission):
    """فقط ادمین کل"""
    message = 'این عملیات فقط برای ادمین سیستم مجاز است'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsProvinceManager(BasePermission):
    """ناظر استانداری"""
    message = 'این عملیات فقط برای ناظر استانداری مجاز است'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.ADMIN,
                UserRole.PROVINCE_MANAGER
            ]
        )


class IsChamberManager(BasePermission):
    """مدیر اتاق اصناف"""
    message = 'این عملیات فقط برای مدیر اتاق اصناف مجاز است'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.ADMIN,
                UserRole.PROVINCE_MANAGER,
                UserRole.CHAMBER_MANAGER
            ]
        )


class IsUnionManager(BasePermission):
    """رئیس اتحادیه"""
    message = 'این عملیات فقط برای رئیس اتحادیه مجاز است'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.ADMIN,
                UserRole.PROVINCE_MANAGER,
                UserRole.CHAMBER_MANAGER,
                UserRole.UNION_MANAGER
            ]
        )


class IsStoreOwner(BasePermission):
    """صاحب فروشگاه"""
    message = 'این عملیات فقط برای صاحب فروشگاه مجاز است'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.ADMIN,
                UserRole.STORE_OWNER
            ]
        )


class IsCustomer(BasePermission):
    """شهروند عادی"""
    message = 'این عملیات فقط برای کاربران عادی مجاز است'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == UserRole.CUSTOMER
        )


class IsAdminOrReadOnly(BasePermission):
    """ادمین می‌تواند تغییر دهد، بقیه فقط می‌توانند بخوانند"""

    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return (
            request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )