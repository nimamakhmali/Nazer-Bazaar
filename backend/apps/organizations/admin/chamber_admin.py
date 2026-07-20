from django.contrib import admin
from apps.organizations.models import Chamber


@admin.register(Chamber)
class ChamberAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'city',
        'province_name',
        'manager',
        'unions_count',
        'is_active',
        'created_at',
    ]
    list_filter = [
        'is_active',
        'city__province',
    ]
    search_fields = [
        'name',
        'city__name',
        'city__province__name',
        'manager__first_name',
        'manager__last_name',
    ]
    list_editable = ['is_active']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['city', 'manager']

    def province_name(self, obj: Chamber) -> str:
        return obj.province_name
    province_name.short_description = 'استان'

    def unions_count(self, obj: Chamber) -> int:
        return obj.unions_count
    unions_count.short_description = 'تعداد اتحادیه‌ها'

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('city', 'name', 'manager', 'is_active')
        }),
        ('اطلاعات تماس', {
            'fields': ('address', 'phone', 'email', 'established_year')
        }),
        ('اطلاعات سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )