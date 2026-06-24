"""
Permissions اختصاصی organizations
"""
from rest_framework.permissions import BasePermission
from apps.common.choices import UserRole


class CanManageProvinceOffice(BasePermission):
    """دسترسی به مدیریت دفتر استانداری"""
    message = 'شما دسترسی به مدیریت دفتر استانداری را ندارید'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.ADMIN,
                UserRole.PROVINCE_MANAGER,
            ]
        )


class CanManageChamber(BasePermission):
    """دسترسی به مدیریت اتاق اصناف"""
    message = 'شما دسترسی به مدیریت اتاق اصناف را ندارید'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.ADMIN,
                UserRole.PROVINCE_MANAGER,
                UserRole.CHAMBER_MANAGER,
            ]
        )


class CanManageUnion(BasePermission):
    """دسترسی به مدیریت اتحادیه"""
    message = 'شما دسترسی به مدیریت اتحادیه را ندارید'

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


class CanViewOrganization(BasePermission):
    """دسترسی به مشاهده سازمان‌ها"""
    message = 'شما دسترسی به مشاهده این بخش را ندارید'

    def has_permission(self, request, view):
        return request.user.is_authenticated