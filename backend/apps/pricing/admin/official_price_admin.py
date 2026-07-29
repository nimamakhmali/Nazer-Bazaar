"""
Official Price Admin
"""
from django.contrib import admin
from django.utils.html import format_html
from apps.pricing.models import OfficialPrice, PriceHistory


@admin.register(OfficialPrice)
class OfficialPriceAdmin(admin.ModelAdmin):
    list_display = [
        'product',
        'union',
        'price_formatted_display',
        'min_price_display',
        'effective_date',
        'is_today',
        'is_active',
        'created_by',
    ]
    list_filter = [
        'is_active',
        'effective_date',
        'union__chamber__city__province',
        'union',
    ]
    search_fields = [
        'product__name',
        'union__name',
        'created_by__first_name',
    ]
    list_editable = ['is_active']
    readonly_fields = [
        'created_at',
        'updated_at',
        'min_allowed_price',
        'max_allowed_price',
        'price_formatted',
        'is_today',
        'is_expired',
    ]
    autocomplete_fields = ['union', 'product', 'created_by']
    date_hierarchy = 'effective_date'
    ordering = ['-effective_date', 'product__name']

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': (
                'union',
                'product',
                'created_by',
                'is_active',
            )
        }),
        ('قیمت', {
            'fields': (
                'price',
                'price_formatted',
                'min_allowed_price',
                'max_allowed_price',
            )
        }),
        ('تاریخ اعتبار', {
            'fields': (
                'effective_date',
                'expire_date',
                'is_today',
                'is_expired',
            )
        }),
        ('توضیحات', {
            'fields': ('description',),
            'classes': ('collapse',)
        }),
        ('اطلاعات سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def price_formatted_display(self, obj: OfficialPrice) -> str:
        if obj.price is None:
            return '—'
        return f'{obj.price:,} ریال'
    price_formatted_display.short_description = 'قیمت مصوب'

    def min_price_display(self, obj: OfficialPrice) -> str:
        if obj.min_allowed_price is None:
            return '—'
        return format_html(
            '<span style="color:#28a745">{} ریال</span>',
            f'{obj.min_allowed_price:,}'
        )
    min_price_display.short_description = 'حداقل قیمت مجاز'

    def is_today(self, obj: OfficialPrice) -> bool:
        return obj.is_today
    is_today.boolean = True
    is_today.short_description = 'امروز'


@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = [
        'change_type',
        'product_name',
        'union_name',
        'store_name',
        'old_price',
        'new_price',
        'price_change_display',
        'changed_by_name',
        'price_date',
        'created_at',
    ]
    list_filter = [
        'change_type',
        'price_date',
        'changed_by_role',
    ]
    search_fields = [
        'product_name',
        'union_name',
        'store_name',
        'changed_by_name',
    ]
    readonly_fields = [
        f.name for f in PriceHistory._meta.fields
    ]
    date_hierarchy = 'price_date'
    ordering = ['-created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def price_change_display(self, obj: PriceHistory) -> str:
        amount = obj.price_change_amount
        if obj.old_price is None:
            return format_html(
                '<span style="color:#17a2b8">جدید</span>'
            )
        if amount > 0:
            return format_html(
                '<span style="color:#dc3545">↑ {}</span>',
                f'{amount:,}'
            )
        elif amount < 0:
            return format_html(
                '<span style="color:#28a745">↓ {}</span>',
                f'{abs(amount):,}'
            )
        return '—'
    price_change_display.short_description = 'تغییر قیمت'