"""
View Mixins - قابلیت‌های مشترک View ها
"""
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.shortcuts import redirect
from apps.common.choices import UserRole


class RoleRequiredMixin(LoginRequiredMixin):
    """
    بررسی نقش کاربر قبل از دسترسی به View.
    
    نحوه استفاده:
        class UnionManagerView(RoleRequiredMixin, View):
            required_roles = [UserRole.UNION_MANAGER, UserRole.ADMIN]
    """
    required_roles: list = []

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()

        if (
            self.required_roles
            and request.user.role not in self.required_roles
        ):
            messages.error(
                request,
                'شما دسترسی لازم برای این بخش را ندارید'
            )
            return redirect('dashboard:home')

        return super().dispatch(request, *args, **kwargs)


class SuccessMessageMixin:
    """اضافه کردن پیام موفقیت به View"""
    success_message: str = 'عملیات با موفقیت انجام شد'

    def form_valid(self, form):
        messages.success(self.request, self.success_message)
        return super().form_valid(form)