"""
Category Admin
"""
from django.contrib import admin
from django.utils.html import format_html
from apps.products.models import ProductCategory, ProductUnit


@admin.register(ProductUnit)
class ProductUnitAdmin(admin.ModelAdmin):
    list_display = ['name', 'symbol', 'is_active', 'products_count']
    list_editable = ['is_active']
    search_fields = ['name', 'symbol']
    readonly_fields = ['created_at', 'updated_at']

    def products_count(self, obj: ProductUnit) -> int:
        return obj.products.count()
    products_count.short_description = 'تعداد محصولات'


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'parent',
        'level',
        'products_count',
        'children_count',
        'order',
        'is_active',
    ]
    list_filter = ['is_active', 'parent']
    search_fields = ['name', 'slug']
    list_editable = ['order', 'is_active']
    readonly_fields = [
        'created_at',
        'updated_at',
        'full_path',
        'level',
        'category_image_preview',
    ]
    prepopulated_fields = {'slug': ('name',)}
    autocomplete_fields = ['parent']

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('parent', 'name', 'slug', 'icon', 'order', 'is_active')
        }),
        ('اطلاعات تکمیلی', {
            'fields': ('description', 'full_path', 'level'),
            'classes': ('collapse',)
        }),
        ('تصویر', {
            'fields': ('image', 'category_image_preview'),
        }),
        ('اطلاعات سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def level(self, obj: ProductCategory) -> int:
        return obj.level
    level.short_description = 'سطح'

    def products_count(self, obj: ProductCategory) -> int:
        return obj.products_count
    products_count.short_description = 'محصولات'

    def children_count(self, obj: ProductCategory) -> int:
        return obj.children_count
    children_count.short_description = 'زیردسته‌ها'

    def category_image_preview(self, obj: ProductCategory) -> str:
        if obj.image:
            return format_html(
                '<img src="{}" width="100" height="80" '
                'style="object-fit:cover;border-radius:6px"/>',
                obj.image.url
            )
        return 'بدون تصویر'
    category_image_preview.short_description = 'پیش‌نمایش'