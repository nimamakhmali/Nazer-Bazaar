"""
Admin پنل برای مدیریت کاربران
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from apps.accounts.models import User, Role, Permission, VerifyCode


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        'phone_number',
        'full_name',
        'role_badge',
        'is_active',
        'is_phone_verified',
        'date_joined',
    ]
    list_filter = [
        'role',
        'is_active',
        'is_phone_verified',
        'is_staff',
    ]
    search_fields = [
        'phone_number',
        'first_name',
        'last_name',
        'national_code',
    ]
    readonly_fields = [
        'date_joined',
        'last_login_at',
        'created_at',
        'updated_at',
    ]
    ordering = ['-date_joined']

    fieldsets = (
        ('اطلاعات ورود', {
            'fields': ('phone_number', 'password')
        }),
        ('اطلاعات شخصی', {
            'fields': (
                'first_name',
                'last_name',
                'email',
                'national_code',
                'avatar',
            )
        }),
        ('نقش و دسترسی', {
            'fields': (
                'role',
                'is_active',
                'is_staff',
                'is_superuser',
                'is_phone_verified',
                'groups',
                'user_permissions',
            )
        }),
        ('تاریخ‌ها', {
            'fields': (
                'date_joined',
                'last_login_at',
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',)
        }),
    )

    add_fieldsets = (
        ('ایجاد کاربر جدید', {
            'classes': ('wide',),
            'fields': (
                'phone_number',
                'role',
                'password1',
                'password2',
                'first_name',
                'last_name',
                'is_active',
            ),
        }),
    )

    def role_badge(self, obj: User) -> str:
        colors = {
            'admin': '#dc3545',
            'province_manager': '#6f42c1',
            'chamber_manager': '#0d6efd',
            'union_manager': '#198754',
            'store_owner': '#fd7e14',
            'inspector': '#20c997',
            'customer': '#6c757d',
        }
        color = colors.get(obj.role, '#6c757d')
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;'
            'border-radius:4px;font-size:11px">{}</span>',
            color,
            obj.get_role_display()
        )
    role_badge.short_description = 'نقش'


@admin.register(VerifyCode)
class VerifyCodeAdmin(admin.ModelAdmin):
    list_display = [
        'phone_number',
        'code',
        'is_used',
        'is_expired',
        'attempts',
        'created_at',
    ]
    list_filter = ['is_used']
    search_fields = ['phone_number']
    readonly_fields = ['created_at', 'updated_at', 'expires_at']

    def is_expired(self, obj: VerifyCode) -> bool:
        return obj.is_expired
    is_expired.boolean = True
    is_expired.short_description = 'منقضی شده'


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    filter_horizontal = ['permissions', 'users']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['name', 'codename', 'module']
    list_filter = ['module']
    search_fields = ['name', 'codename']