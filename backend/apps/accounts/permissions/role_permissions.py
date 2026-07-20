"""
Permission های اختصاصی accounts
"""
from rest_framework.permissions import BasePermission
from apps.common.choices import UserRole


class IsSelfOrAdmin(BasePermission):
    """
    کاربر می‌تواند فقط به اطلاعات خودش دسترسی داشته باشد.
    ادمین به همه دسترسی دارد.
    """
    message = 'شما فقط می‌توانید به اطلاعات خودتان دسترسی داشته باشید'

    def has_object_permission(self, request, view, obj):
        return (
            request.user.is_authenticated
            and (
                request.user.id == obj.id
                or request.user.role == UserRole.ADMIN
            )
        )


class IsOrganizationUser(BasePermission):
    """
    کاربر باید بخشی از ساختار سازمانی باشد.
    """
    message = 'این بخش فقط برای کاربران سازمانی قابل دسترس است'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_organization_user
        )