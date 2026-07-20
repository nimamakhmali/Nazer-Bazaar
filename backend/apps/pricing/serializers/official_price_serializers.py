"""
Official Price Serializers
"""
from decimal import Decimal
from rest_framework import serializers
from apps.pricing.models import OfficialPrice


class OfficialPriceListSerializer(serializers.ModelSerializer):
    """لیست قیمت‌های مصوب"""
    product_name = serializers.CharField(
        source='product.name', read_only=True
    )
    product_unit = serializers.CharField(
        source='product.unit.symbol', read_only=True
    )
    union_name = serializers.CharField(
        source='union.name', read_only=True
    )
    min_allowed_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name', read_only=True
    )

    class Meta:
        model = OfficialPrice
        fields = [
            'id',
            'product',
            'product_name',
            'product_unit',
            'union',
            'union_name',
            'price',
            'min_allowed_price',
            'effective_date',
            'expire_date',
            'is_today',
            'is_active',
            'created_by_name',
            'created_at',
        ]


class OfficialPriceDetailSerializer(serializers.ModelSerializer):
    """جزئیات کامل قیمت مصوب"""
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
        source='union.name', read_only=True
    )
    city_name = serializers.CharField(
        source='union.chamber.city.name', read_only=True
    )
    min_allowed_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        read_only=True
    )
    max_allowed_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        read_only=True
    )
    price_formatted = serializers.CharField(read_only=True)
    min_price_formatted = serializers.CharField(read_only=True)
    is_today = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name', read_only=True
    )

    class Meta:
        model = OfficialPrice
        fields = [
            'id',
            'product',
            'product_name',
            'product_unit_name',
            'product_unit_symbol',
            'union',
            'union_name',
            'city_name',
            'price',
            'price_formatted',
            'min_allowed_price',
            'max_allowed_price',
            'min_price_formatted',
            'effective_date',
            'expire_date',
            'description',
            'is_today',
            'is_expired',
            'is_active',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]


class OfficialPriceCreateSerializer(serializers.Serializer):
    """ثبت قیمت مصوب"""
    union_id = serializers.IntegerField()
    product_id = serializers.IntegerField()
    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        min_value=Decimal('1')
    )
    effective_date = serializers.DateField(required=False)
    expire_date = serializers.DateField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate_price(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError(
                'قیمت باید بزرگ‌تر از صفر باشد'
            )
        return value

    def validate(self, attrs: dict) -> dict:
        effective = attrs.get('effective_date')
        expire = attrs.get('expire_date')
        if effective and expire and expire <= effective:
            raise serializers.ValidationError(
                'تاریخ انقضا باید بعد از تاریخ اعتبار باشد'
            )
        return attrs


class OfficialPriceUpdateSerializer(serializers.Serializer):
    """ویرایش قیمت مصوب"""
    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        required=False,
        min_value=Decimal('1')
    )
    expire_date = serializers.DateField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)


class BulkOfficialPriceSerializer(serializers.Serializer):
    """ثبت انبوه قیمت‌های مصوب"""

    class PriceItemSerializer(serializers.Serializer):
        product_id = serializers.IntegerField()
        price = serializers.DecimalField(
            max_digits=12,
            decimal_places=0,
            min_value=Decimal('1')
        )

    union_id = serializers.IntegerField()
    effective_date = serializers.DateField(required=False)
    prices = PriceItemSerializer(many=True, min_length=1)

    def validate_prices(self, value: list) -> list:
        if not value:
            raise serializers.ValidationError(
                'لیست قیمت‌ها نمی‌تواند خالی باشد'
            )
        return value


class PriceRangeSerializer(serializers.Serializer):
    """نمایش محدوده قیمت مجاز"""
    official_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        read_only=True
    )
    min_allowed_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        read_only=True
    )
    max_allowed_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=0,
        read_only=True
    )
    min_ratio = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        read_only=True
    )
    max_ratio = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        read_only=True
    )