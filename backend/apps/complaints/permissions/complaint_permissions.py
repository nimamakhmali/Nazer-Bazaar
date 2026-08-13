from rest_framework.permissions import BasePermission
from apps.common.choices import UserRole


class IsComplaintOwnerOrManager(BasePermission):
    """
    دسترسی به شکایت اگر:
    - کاربر شاکی باشد
    - کاربر صاحب فروشگاه مربوطه باشد
    - کاربر مدیر اتحادیه، اتاق اصناف، استانداری یا ادمین باشد
    """
    message = "شما دسترسی به این شکایت را ندارید."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user.is_authenticated:
            return False

        # مالک شکایت
        if obj.customer_id == user.id:
            return True

        # ادمین
        if user.is_admin:
            return True

        # صاحب فروشگاه
        if user.is_store_owner and obj.store.owner_id == user.id:
            return True

        # مدیر اتحادیه
        if user.is_union_manager:
            from apps.organizations.selectors import UnionSelector
            user_union = UnionSelector.get_by_manager(user.id)
            if user_union and user_union.id == obj.store.union_id:
                return True

        # مدیر اتاق اصناف
        if user.role == UserRole.CHAMBER_MANAGER:
            from apps.organizations.models import Chamber
            chamber = Chamber.objects.filter(manager=user).first()
            if chamber and chamber.id == obj.store.union.chamber_id:
                return True

        # ناظر استانداری
        if user.role == UserRole.PROVINCE_MANAGER:
            from apps.organizations.models import ProvinceOffice
            province_office = ProvinceOffice.objects.filter(manager=user).first()
            if province_office and province_office.province_id == obj.store.union.chamber.city.province_id:
                return True

        # بازرس محول‌شده
        if user.role == UserRole.INSPECTOR and obj.assigned_to_id == user.id:
            return True

        return False


# ✅ NEW: دسترسی تغییر وضعیت شکایت
class CanChangeComplaintStatus(BasePermission):
    """
    فقط مدیران مربوطه (رئیس اتحادیه، مدیر اتاق اصناف، ناظر استانداری،
    بازرس محول‌شده و ادمین) می‌توانند وضعیت شکایت را تغییر دهند.
    مشتری و صاحب فروشگاه اجازه‌ی تغییر وضعیت را ندارند.
    """
    message = "شما اجازه‌ی تغییر وضعیت این شکایت را ندارید."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user.is_authenticated:
            return False

        if user.is_admin:
            return True

        if user.role == UserRole.UNION_MANAGER:
            from apps.organizations.models import Union
            union = Union.objects.filter(manager=user, is_active=True).first()
            if union and union.id == obj.store.union_id:
                return True

        if user.role == UserRole.CHAMBER_MANAGER:
            from apps.organizations.models import Chamber
            chamber = Chamber.objects.filter(manager=user).first()
            if chamber and chamber.id == obj.store.union.chamber_id:
                return True

        if user.role == UserRole.PROVINCE_MANAGER:
            from apps.organizations.models import ProvinceOffice
            province_office = ProvinceOffice.objects.filter(manager=user).first()
            if province_office and province_office.province_id == obj.store.union.chamber.city.province_id:
                return True

        if user.role == UserRole.INSPECTOR and obj.assigned_to_id == user.id:
            return True

        return False