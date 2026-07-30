"""
Product Serializers
"""
from rest_framework import serializers
from apps.products.models import Product, ProductUnit
from apps.products.serializers.category_serializers import (
    ProductCategorySimpleSerializer
)


class ProductUnitSerializer(serializers.ModelSerializer):
    """واحد اندازه‌گیری"""
    class Meta:
        model = ProductUnit
        fields = ['id', 'name', 'symbol', 'description']


class ProductListSerializer(serializers.ModelSerializer):
    """لیست محصولات"""
    union_name = serializers.CharField(
        source='union.name',
        read_only=True
    )
    category_name = serializers.CharField(
        source='category.name',
        read_only=True
    )
    unit_name = serializers.CharField(
        source='unit.name',
        read_only=True
    )
    unit_symbol = serializers.CharField(
        source='unit.symbol',
        read_only=True
    )

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'union',
            'union_name',
            'category',
            'category_name',
            'unit',
            'unit_name',
            'unit_symbol',
            'brand',
            'image',
            'is_featured',
            'is_active',
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    """جزئیات محصول"""
    category_detail = ProductCategorySimpleSerializer(
        source='category',
        read_only=True
    )
    unit_detail = ProductUnitSerializer(
        source='unit',
        read_only=True
    )
    full_name = serializers.CharField(read_only=True)
    union_name = serializers.CharField(
        source='union.name',
        read_only=True
    )
    category_name = serializers.CharField(
        source='category.name',
        read_only=True
    )
    unit_symbol = serializers.CharField(
        source='unit.symbol',
        read_only=True
    )

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'full_name',
            'union',
            'union_name',
            'category',
            'category_name',
            'category_detail',
            'unit',
            'unit_symbol',
            'unit_detail',
            'barcode',
            'description',
            'image',
            'brand',
            'origin',
            'specifications',
            'order',
            'is_featured',
            'is_active',
            'created_at',
            'updated_at',
        ]


class ProductCreateSerializer(serializers.Serializer):
    """ایجاد محصول"""
    union_id = serializers.IntegerField()
    name = serializers.CharField(max_length=200)
    category_id = serializers.IntegerField()
    unit_id = serializers.IntegerField()
    description = serializers.CharField(required=False, allow_blank=True)
    brand = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    origin = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    barcode = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        allow_null=True
    )
    order = serializers.IntegerField(required=False, default=0)
    is_featured = serializers.BooleanField(required=False, default=False)
    specifications = serializers.DictField(required=False, default=dict)

    def validate_name(self, value: str) -> str:
        from apps.common.utils import normalize_persian_text
        return normalize_persian_text(value)

    def validate_barcode(self, value: str) -> str:
        if value:
            from apps.products.selectors import ProductSelector
            if ProductSelector.exists_by_barcode(value):
                raise serializers.ValidationError(
                    'این بارکد قبلاً استفاده شده است'
                )
        return value or None

    def validate_union_id(self, value: int) -> int:
        from apps.organizations.models import Union
        if not Union.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError(
                'اتحادیه مورد نظر یافت نشد یا غیرفعال است'
            )
        return value


class ProductUpdateSerializer(serializers.Serializer):
    """ویرایش محصول"""
    union_id = serializers.IntegerField(required=False)
    name = serializers.CharField(max_length=200, required=False)
    category_id = serializers.IntegerField(required=False)
    unit_id = serializers.IntegerField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    brand = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    origin = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    barcode = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        allow_null=True
    )
    order = serializers.IntegerField(required=False)
    is_featured = serializers.BooleanField(required=False)
    is_active = serializers.BooleanField(required=False)
    specifications = serializers.DictField(required=False)

    def validate_union_id(self, value: int) -> int:
        from apps.organizations.models import Union
        if not Union.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError(
                'اتحادیه مورد نظر یافت نشد یا غیرفعال است'
            )
        return value


class ProductImportSerializer(serializers.Serializer):
    """آپلود فایل Excel برای import"""
    file = serializers.FileField()
    update_existing = serializers.BooleanField(
        default=False,
        help_text='اگر True باشد، محصولات موجود بروزرسانی می‌شوند'
    )

    def validate_file(self, value):
        import os
        from apps.common.constants import ALLOWED_EXCEL_EXTENSIONS
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ALLOWED_EXCEL_EXTENSIONS:
            raise serializers.ValidationError(
                'فقط فایل‌های Excel (.xlsx, .xls) قابل قبول هستند'
            )
        return value