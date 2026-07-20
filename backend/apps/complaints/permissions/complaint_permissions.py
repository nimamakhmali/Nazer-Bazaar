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
        
        # TODO: Add checks for Chamber and Province managers
        
        return False