"""
Product Permissions
"""
from rest_framework.permissions import BasePermission
from apps.common.choices import UserRole


class CanManageProduct(BasePermission):
    """فقط ادمین می‌تواند محصول مدیریت کند"""
    message = 'فقط ادمین سیستم می‌تواند محصولات را مدیریت کند'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class CanImportProducts(BasePermission):
    """دسترسی به import محصولات"""
    message = 'فقط ادمین می‌تواند محصولات را import کند'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )