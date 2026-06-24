from django.contrib import admin
from apps.organizations.models import ProvinceOffice


@admin.register(ProvinceOffice)
class ProvinceOfficeAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'province',
        'manager',
        'phone',
        'is_active',
        'created_at',
    ]
    list_filter = ['is_active', 'province']
    search_fields = [
        'name',
        'province__name',
        'manager__first_name',
        'manager__last_name',
    ]
    list_editable = ['is_active']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['province', 'manager']

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('province', 'name', 'manager', 'is_active')
        }),
        ('اطلاعات تماس', {
            'fields': ('address', 'phone', 'email')
        }),
        ('اطلاعات سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )