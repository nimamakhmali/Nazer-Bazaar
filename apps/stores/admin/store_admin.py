"""
Store Admin
"""
from django.contrib import admin
from django.utils.html import format_html
from apps.common.choices import StoreStatus
from apps.stores.models import Store


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'union',
        'city_name',
        'owner',
        'license_number',
        'status_badge',
        'is_active',
        'created_at',
    ]
    list_filter = [
        'status',
        'is_active',
        'union__chamber__city__province',
        'union__chamber__city',
        'union',
    ]
    search_fields = [
        'name',
        'license_number',
        'address',
        'owner__first_name',
        'owner__last_name',
        'owner__phone_number',
    ]
    list_editable = ['is_active']
    readonly_fields = [
        'created_at',
        'updated_at',
        'status_changed_at',
        'store_image_preview',
        'complaints_count',
    ]
    autocomplete_fields = ['union', 'owner']
    ordering = ['-created_at']

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': (
                'union',
                'owner',
                'name',
                'license_number',
                'status',
                'is_active',
            )
        }),
        ('اطلاعات تماس', {
            'fields': (
                'phone',
                'mobile',
                'address',
                'postal_code',
            )
        }),
        ('موقعیت جغرافیایی', {
            'fields': ('latitude', 'longitude'),
            'classes': ('collapse',)
        }),
        ('تصویر', {
            'fields': ('image', 'store_image_preview'),
        }),
        ('توضیحات', {
            'fields': ('description',),
            'classes': ('collapse',)
        }),
        ('وضعیت', {
            'fields': (
                'rejection_reason',
                'status_changed_at',
                'status_changed_by',
            ),
            'classes': ('collapse',)
        }),
        ('آمار', {
            'fields': ('complaints_count',),
            'classes': ('collapse',)
        }),
        ('اطلاعات سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['approve_stores', 'suspend_stores']

    def city_name(self, obj: Store) -> str:
        return obj.city_name
    city_name.short_description = 'شهر'

    def status_badge(self, obj: Store) -> str:
        colors = {
            StoreStatus.PENDING: '#ffc107',
            StoreStatus.ACTIVE: '#28a745',
            StoreStatus.SUSPENDED: '#dc3545',
            StoreStatus.REJECTED: '#6c757d',
            StoreStatus.CLOSED: '#343a40',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;'
            'border-radius:4px;font-size:11px">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'وضعیت'

    def store_image_preview(self, obj: Store) -> str:
        if obj.image:
            return format_html(
                '<img src="{}" width="150" height="100" '
                'style="object-fit:cover;border-radius:8px"/>',
                obj.image.url
            )
        return 'بدون تصویر'
    store_image_preview.short_description = 'پیش‌نمایش'

    def complaints_count(self, obj: Store) -> int:
        return obj.complaints_count
    complaints_count.short_description = 'تعداد شکایات'

    def approve_stores(self, request, queryset):
        for store in queryset.filter(status=StoreStatus.PENDING):
            store.approve(approved_by=request.user)
        self.message_user(request, 'فروشگاه‌های انتخابی تایید شدند')
    approve_stores.short_description = 'تایید فروشگاه‌های انتخابی'

    def suspend_stores(self, request, queryset):
        for store in queryset.filter(status=StoreStatus.ACTIVE):
            store.suspend(suspended_by=request.user, reason='تعلیق از پنل ادمین')
        self.message_user(request, 'فروشگاه‌های انتخابی تعلیق شدند')
    suspend_stores.short_description = 'تعلیق فروشگاه‌های انتخابی'