"""
Store Price Admin
"""
from django.contrib import admin
from django.utils.html import format_html
from apps.pricing.models import StorePrice, PriceImport


@admin.register(StorePrice)
class StorePriceAdmin(admin.ModelAdmin):
    list_display = [
        'store',
        'product',
        'price_display',
        'official_price_display',
        'compliance_badge',
        'discount_percent',
        'price_date',
        'is_active',
    ]
    list_filter = [
        'is_active',
        'price_date',
        'store__union__chamber__city__province',
        'store__union',
    ]
    search_fields = [
        'store__name',
        'product__name',
        'created_by__first_name',
    ]
    list_editable = ['is_active']
    readonly_fields = [
        'created_at',
        'updated_at',
        'is_compliant',
        'is_overpriced',
        'discount_percent',
        'violation_amount',
        'price_ratio',
        'price_formatted',
        'official_price_formatted',
    ]
    autocomplete_fields = ['store', 'product', 'created_by']
    date_hierarchy = 'price_date'
    ordering = ['-price_date', 'store__name']

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': (
                'store',
                'product',
                'official_price',
                'created_by',
                'is_active',
            )
        }),
        ('قیمت', {
            'fields': (
                'price',
                'price_formatted',
                'official_price_amount',
                'official_price_formatted',
                'min_allowed_price_amount',
                'is_compliant',
                'is_overpriced',
                'discount_percent',
                'price_ratio',
                'violation_amount',
            )
        }),
        ('تاریخ', {
            'fields': ('price_date',)
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

    def price_display(self, obj: StorePrice) -> str:
        return f'{obj.price:,} ریال'
    price_display.short_description = 'قیمت فروشگاه'

    def official_price_display(self, obj: StorePrice) -> str:
        return f'{obj.official_price_amount:,} ریال'
    official_price_display.short_description = 'قیمت مصوب'

    def compliance_badge(self, obj: StorePrice) -> str:
        if obj.is_overpriced:
            return format_html(
                '<span style="background:#dc3545;color:white;'
                'padding:2px 8px;border-radius:4px;font-size:11px">'
                '⚠ گران‌فروشی</span>'
            )
        elif obj.is_compliant:
            return format_html(
                '<span style="background:#28a745;color:white;'
                'padding:2px 8px;border-radius:4px;font-size:11px">'
                '✓ مطابق</span>'
            )
        return format_html(
            '<span style="background:#ffc107;color:white;'
            'padding:2px 8px;border-radius:4px;font-size:11px">'
            '! خارج محدوده</span>'
        )
    compliance_badge.short_description = 'وضعیت'


@admin.register(PriceImport)
class PriceImportAdmin(admin.ModelAdmin):
    list_display = [
        'union',
        'effective_date',
        'status',
        'total_rows',
        'success_count',
        'error_count',
        'success_rate',
        'uploaded_by',
        'created_at',
    ]
    list_filter = ['status', 'effective_date', 'union']
    search_fields = ['union__name', 'uploaded_by__phone_number']
    readonly_fields = [
        'created_at',
        'updated_at',
        'processed_at',
        'success_rate',
    ]

    def success_rate(self, obj: PriceImport) -> str:
        rate = obj.success_rate
        color = '#28a745' if rate >= 80 else '#ffc107' if rate >= 50 else '#dc3545'
        return format_html(
            '<span style="color:{}">{:.1f}%</span>',
            color, rate
        )
    success_rate.short_description = 'نرخ موفقیت'