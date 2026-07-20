"""
Store Price Serializers
"""
from decimal import Decimal
from rest_framework import serializers
from apps.pricing.models import StorePrice, PriceHistory


class StorePriceListSerializer(serializers.ModelSerializer):
    """لیست قیمت‌های فروشگاه"""
    store_name = serializers.CharField(
        source='store.name', read_only=True
    )
    product_name = serializers.CharField(
        source='product.name', read_only=True
    )
    product_unit = serializers.CharField(
        source='product.unit.symbol', read_only=True
    )
    is_compliant = serializers.BooleanField(read_only=True)
    is_overpriced = serializers.BooleanField(read_only=True)
    discount_percent = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = StorePrice
        fields = [
            'id',
            'store',
            'store_name',
            'product',
            'product_name',
            'product_unit',
            'price',
            'official_price_amount',
            'min_allowed_price_amount',
            'discount_percent',
            'is_compliant',
            'is_overpriced',
            'price_date',
            'is_active',
        ]


class StorePriceDetailSerializer(serializers.ModelSerializer):
    """جزئیات قیمت فروشگاه"""
    store_name = serializers.CharField(
        source='store.name', read_only=True
    )
    product_name = serializers.CharField(
        source='product.name', read_only=True
    )
    product_unit_name = serializers.CharField(
        source='product.unit.name', read_only=True
    )
    product_unit_symbol = serializers.CharField(
        source='product.unit.symbol', read_only=True
    )
    union_name = serializers.CharField(
        source='store.union.name', read_only=True
    )
    is_compliant = serializers.BooleanField(read_only=True)
    is_overpriced = serializers.BooleanField(read_only=True)
    is_today = serializers.BooleanField(read_only=True)
    discount_percent = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True
    )
    price_ratio = serializers.DecimalField(
        max_digits=5,
        decimal_places=4,
        read_only=True
    )
    violation_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        read_only=True
    )
    price_formatted = serializers.CharField(read_only=True)
    official_price_formatted = serializers.CharField(read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name', read_only=True
    )

    class Meta:
        model = StorePrice
        fields = [
            'id',
            'store',
            'store_name',
            'union_name',
            'product',
            'product_name',
            'product_unit_name',
            'product_unit_symbol',
            'official_price',
            'price',
            'price_formatted',
            'official_price_amount',
            'official_price_formatted',
            'min_allowed_price_amount',
            'discount_percent',
            'price_ratio',
            'is_compliant',
            'is_overpriced',
            'violation_amount',
            'is_today',
            'price_date',
            'description',
            'is_active',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]


class StorePriceSetSerializer(serializers.Serializer):
    """ثبت/بروزرسانی قیمت فروشگاه"""
    store_id = serializers.IntegerField()
    product_id = serializers.IntegerField()
    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        min_value=Decimal('1')
    )
    price_date = serializers.DateField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate_price(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError(
                'قیمت باید بزرگ‌تر از صفر باشد'
            )
        return value


class BulkStorePriceSerializer(serializers.Serializer):
    """ثبت انبوه قیمت‌های فروشگاه"""

    class PriceItemSerializer(serializers.Serializer):
        product_id = serializers.IntegerField()
        price = serializers.DecimalField(
            max_digits=12,
            decimal_places=0,
            min_value=Decimal('1')
        )

    store_id = serializers.IntegerField()
    price_date = serializers.DateField(required=False)
    prices = PriceItemSerializer(many=True, min_length=1)


class PriceComparisonSerializer(serializers.ModelSerializer):
    """مقایسه قیمت‌ها برای نمایش به مردم"""
    store_name = serializers.CharField(
        source='store.name', read_only=True
    )
    store_address = serializers.CharField(
        source='store.address', read_only=True
    )
    union_name = serializers.CharField(
        source='store.union.name', read_only=True
    )
    is_compliant = serializers.BooleanField(read_only=True)
    discount_percent = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = StorePrice
        fields = [
            'id',
            'store',
            'store_name',
            'store_address',
            'union_name',
            'price',
            'official_price_amount',
            'discount_percent',
            'is_compliant',
        ]


class PriceHistorySerializer(serializers.ModelSerializer):
    """تاریخچه قیمت"""
    change_type_display = serializers.CharField(
        source='get_change_type_display', read_only=True
    )
    price_change_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        read_only=True
    )
    price_change_percent = serializers.DecimalField(
        max_digits=7,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = PriceHistory
        fields = [
            'id',
            'change_type',
            'change_type_display',
            'product_name',
            'union_name',
            'store_name',
            'old_price',
            'new_price',
            'price_change_amount',
            'price_change_percent',
            'price_date',
            'changed_by_name',
            'changed_by_role',
            'note',
            'created_at',
        ]


class PriceStatsSerializer(serializers.Serializer):
    """آمار قیمت‌ها"""
    avg_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        allow_null=True
    )
    min_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        allow_null=True
    )
    max_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        allow_null=True
    )
    stores_count = serializers.IntegerField()