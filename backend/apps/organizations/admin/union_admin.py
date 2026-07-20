from django.contrib import admin
from django.utils.html import format_html
from apps.organizations.models import Union


@admin.register(Union)
class UnionAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'chamber',
        'city_name',
        'province_name',
        'manager',
        'stores_count',
        'is_active',
        'created_at',
    ]
    list_filter = [
        'is_active',
        'chamber__city__province',
        'chamber__city',
    ]
    search_fields = [
        'name',
        'chamber__name',
        'chamber__city__name',
        'manager__first_name',
        'manager__last_name',
        'license_number',
    ]
    list_editable = ['is_active']
    readonly_fields = [
        'created_at',
        'updated_at',
        'logo_preview',
    ]
    autocomplete_fields = ['chamber', 'manager']

    def city_name(self, obj: Union) -> str:
        return obj.city_name
    city_name.short_description = 'شهر'

    def province_name(self, obj: Union) -> str:
        return obj.province_name
    province_name.short_description = 'استان'

    def stores_count(self, obj: Union) -> int:
        return obj.stores_count
    stores_count.short_description = 'تعداد فروشگاه‌ها'

    def logo_preview(self, obj: Union) -> str:
        if obj.logo:
            return format_html(
                '<img src="{}" width="100" height="100" '
                'style="object-fit:cover;border-radius:8px"/>',
                obj.logo.url
            )
        return 'بدون لوگو'
    logo_preview.short_description = 'پیش‌نمایش لوگو'

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': (
                'chamber', 'name', 'manager',
                'license_number', 'is_active'
            )
        }),
        ('اطلاعات تکمیلی', {
            'fields': (
                'description',
                'established_year',
                'phone',
                'address',
            )
        }),
        ('لوگو', {
            'fields': ('logo', 'logo_preview')
        }),
        ('اطلاعات سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )