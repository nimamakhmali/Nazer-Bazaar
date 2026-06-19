"""
Admin پنل برای مدیریت استان‌ها
"""
from django.contrib import admin
from apps.geography.models import Province


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'code',
        'cities_count',
        'is_active',
        'created_at',
    ]
    list_filter = ['is_active']
    search_fields = ['name', 'code']
    list_editable = ['is_active']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['name']

    fieldsets = (
        ('اطلاعات استان', {
            'fields': ('name', 'code', 'is_active')
        }),
        ('اطلاعات سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def cities_count(self, obj) -> int:
        return obj.cities_count
    cities_count.short_description = 'تعداد شهرها'