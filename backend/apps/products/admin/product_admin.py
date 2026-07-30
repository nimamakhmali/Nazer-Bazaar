"""
Product Admin
"""
from django.contrib import admin
from django.utils.html import format_html
from apps.products.models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'union',
        'category',
        'unit',
        'brand',
        'barcode',
        'order',
        'is_featured',
        'is_active',
        'product_image_preview',
    ]
    list_filter = [
        'is_active',
        'is_featured',
        'union',
        'category',
        'unit',
    ]
    search_fields = [
        'name',
        'barcode',
        'brand',
        'description',
        'union__name',
    ]
    list_editable = ['order', 'is_featured', 'is_active']
    readonly_fields = [
        'created_at',
        'updated_at',
        'slug',
        'product_image_preview',
        'full_name',
    ]
    autocomplete_fields = ['union', 'category', 'unit']
    ordering = ['union__name', 'category__name', 'order', 'name']

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': (
                'union',
                'category',
                'name',
                'slug',
                'full_name',
                'unit',
                'barcode',
            )
        }),
        ('اطلاعات تکمیلی', {
            'fields': (
                'brand',
                'origin',
                'description',
                'specifications',
            )
        }),
        ('نمایش', {
            'fields': ('order', 'is_featured', 'is_active')
        }),
        ('تصویر', {
            'fields': ('image', 'product_image_preview'),
        }),
        ('اطلاعات سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['activate_products', 'deactivate_products', 'mark_as_featured']

    def product_image_preview(self, obj: Product) -> str:
        if obj.image:
            return format_html(
                '<img src="{}" width="60" height="60" '
                'style="object-fit:cover;border-radius:4px"/>',
                obj.image.url
            )
        return '—'
    product_image_preview.short_description = 'تصویر'

    def full_name(self, obj: Product) -> str:
        return obj.full_name
    full_name.short_description = 'نام کامل'

    def activate_products(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, 'محصولات انتخابی فعال شدند')
    activate_products.short_description = 'فعال کردن محصولات انتخابی'

    def deactivate_products(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, 'محصولات انتخابی غیرفعال شدند')
    deactivate_products.short_description = 'غیرفعال کردن محصولات انتخابی'

    def mark_as_featured(self, request, queryset):
        queryset.update(is_featured=True)
        self.message_user(
            request,
            'محصولات انتخابی به عنوان ویژه علامت‌گذاری شدند'
        )
    mark_as_featured.short_description = 'علامت‌گذاری به عنوان ویژه'