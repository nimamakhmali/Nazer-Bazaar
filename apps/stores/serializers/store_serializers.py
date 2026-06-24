"""
Store Serializers
"""
from rest_framework import serializers
from apps.common.choices import StoreStatus
from apps.stores.models import Store


class StoreListSerializer(serializers.ModelSerializer):
    """
    لیست فروشگاه‌ها - برای نمایش عمومی
    """
    union_name = serializers.CharField(
        source='union.name',
        read_only=True
    )
    city_name = serializers.CharField(read_only=True)
    province_name = serializers.CharField(read_only=True)
    owner_name = serializers.CharField(read_only=True)
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = Store
        fields = [
            'id',
            'name',
            'union',
            'union_name',
            'city_name',
            'province_name',
            'owner_name',
            'license_number',
            'phone',
            'status',
            'status_display',
            'has_location',
            'is_active',
        ]


class StoreDetailSerializer(serializers.ModelSerializer):
    """
    جزئیات فروشگاه
    """
    union_name = serializers.CharField(
        source='union.name',
        read_only=True
    )
    city_name = serializers.CharField(read_only=True)
    province_name = serializers.CharField(read_only=True)
    owner_name = serializers.CharField(read_only=True)
    owner_phone = serializers.SerializerMethodField()
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    can_set_price = serializers.BooleanField(read_only=True)
    complaints_count = serializers.IntegerField(read_only=True)
    pending_complaints_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Store
        fields = [
            'id',
            'name',
            'union',
            'union_name',
            'city_name',
            'province_name',
            'owner',
            'owner_name',
            'owner_phone',
            'license_number',
            'phone',
            'mobile',
            'address',
            'postal_code',
            'latitude',
            'longitude',
            'description',
            'image',
            'status',
            'status_display',
            'can_set_price',
            'is_active',
            'has_location',
            'complaints_count',
            'pending_complaints_count',
            'rejection_reason',
            'status_changed_at',
            'created_at',
            'updated_at',
        ]

    def get_owner_phone(self, obj: Store) -> str:
        from apps.common.utils import mask_mobile
        return mask_mobile(obj.owner.phone_number)


class StoreRegisterSerializer(serializers.Serializer):
    """
    ثبت فروشگاه جدید
    """
    union_id = serializers.IntegerField()
    owner_id = serializers.IntegerField()
    name = serializers.CharField(max_length=200)
    license_number = serializers.CharField(max_length=50)
    address = serializers.TextField()
    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True
    )
    mobile = serializers.CharField(
        max_length=15,
        required=False,
        allow_blank=True
    )
    postal_code = serializers.CharField(
        max_length=10,
        required=False,
        allow_blank=True
    )
    latitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        allow_null=True
    )
    longitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        allow_null=True
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True
    )

    def validate_name(self, value: str) -> str:
        from apps.common.utils import normalize_persian_text
        return normalize_persian_text(value)

    def validate_mobile(self, value: str) -> str:
        if value:
            from apps.common.validators import validate_iranian_mobile
            validate_iranian_mobile(value)
        return value

    def validate_license_number(self, value: str) -> str:
        from apps.stores.selectors import StoreSelector
        if StoreSelector.license_number_exists(value):
            raise serializers.ValidationError(
                'این شماره پروانه قبلاً ثبت شده است'
            )
        return value

    def validate(self, attrs: dict) -> dict:
        """بررسی اینکه latitude و longitude هر دو داده شده‌اند"""
        lat = attrs.get('latitude')
        lon = attrs.get('longitude')
        if (lat is None) != (lon is None):
            raise serializers.ValidationError(
                'عرض و طول جغرافیایی باید هر دو یا هیچ‌کدام داده شوند'
            )
        return attrs


class StoreUpdateSerializer(serializers.Serializer):
    """ویرایش فروشگاه"""
    name = serializers.CharField(max_length=200, required=False)
    address = serializers.CharField(required=False)
    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True
    )
    mobile = serializers.CharField(
        max_length=15,
        required=False,
        allow_blank=True
    )
    postal_code = serializers.CharField(
        max_length=10,
        required=False,
        allow_blank=True
    )
    latitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        allow_null=True
    )
    longitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        allow_null=True
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True
    )


class StoreStatusChangeSerializer(serializers.Serializer):
    """تغییر وضعیت فروشگاه (تایید/رد/تعلیق)"""
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='دلیل رد یا تعلیق (اختیاری برای تایید)'
    )