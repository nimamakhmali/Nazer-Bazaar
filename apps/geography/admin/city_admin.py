"""
Admin پنل برای مدیریت شهرها
"""
from django.contrib import admin
from apps.geography.models import City


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'province',
        'is_active',
        'created_at',
    ]
    list_filter = ['is_active', 'province']
    search_fields = ['name', 'province__name']
    list_editable = ['is_active']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['province__name', 'name']
    autocomplete_fields = ['province']

    fieldsets = (
        ('اطلاعات شهر', {
            'fields': ('province', 'name', 'is_active')
        }),
        ('اطلاعات سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )