"""
Category Serializers
"""
from rest_framework import serializers
from apps.products.models import ProductCategory


class ProductCategorySimpleSerializer(serializers.ModelSerializer):
    """سریالایزر ساده برای استفاده در سایر سریالایزرها"""
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'slug']


class ProductCategoryListSerializer(serializers.ModelSerializer):
    """لیست دسته‌بندی‌ها"""
    parent_name = serializers.SerializerMethodField()
    products_count = serializers.IntegerField(read_only=True)
    children_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ProductCategory
        fields = [
            'id',
            'name',
            'slug',
            'parent',
            'parent_name',
            'icon',
            'order',
            'products_count',
            'children_count',
            'is_active',
        ]

    def get_parent_name(self, obj: ProductCategory) -> str:
        if obj.parent:
            return obj.parent.name
        return ''


class ProductCategoryDetailSerializer(serializers.ModelSerializer):
    """جزئیات دسته‌بندی"""
    parent_name = serializers.SerializerMethodField()
    full_path = serializers.CharField(read_only=True)
    products_count = serializers.IntegerField(read_only=True)
    children = serializers.SerializerMethodField()
    level = serializers.IntegerField(read_only=True)

    class Meta:
        model = ProductCategory
        fields = [
            'id',
            'name',
            'slug',
            'parent',
            'parent_name',
            'full_path',
            'description',
            'icon',
            'image',
            'order',
            'level',
            'products_count',
            'children',
            'is_active',
            'created_at',
            'updated_at',
        ]

    def get_parent_name(self, obj: ProductCategory) -> str:
        if obj.parent:
            return obj.parent.name
        return ''

    def get_children(self, obj: ProductCategory) -> list:
        children = obj.children.filter(is_active=True).order_by('order', 'name')
        return ProductCategorySimpleSerializer(children, many=True).data


class ProductCategoryCreateSerializer(serializers.Serializer):
    """ایجاد دسته‌بندی"""
    name = serializers.CharField(max_length=200)
    parent_id = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
    icon = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    order = serializers.IntegerField(required=False, default=0)

    def validate_name(self, value: str) -> str:
        from apps.common.utils import normalize_persian_text
        return normalize_persian_text(value)


class ProductCategoryUpdateSerializer(serializers.Serializer):
    """ویرایش دسته‌بندی"""
    name = serializers.CharField(max_length=200, required=False)
    parent_id = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
    icon = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    order = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)