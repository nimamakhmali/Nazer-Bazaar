"""
Chamber Serializers
"""
from rest_framework import serializers
from apps.organizations.models import Chamber


class ChamberListSerializer(serializers.ModelSerializer):
    """لیست اتاق‌های اصناف"""
    city_name = serializers.CharField(
        source='city.name',
        read_only=True
    )
    province_name = serializers.CharField(
        source='city.province.name',
        read_only=True
    )
    manager_name = serializers.CharField(read_only=True)
    unions_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Chamber
        fields = [
            'id',
            'name',
            'city',
            'city_name',
            'province_name',
            'manager_name',
            'unions_count',
            'is_active',
        ]


class ChamberDetailSerializer(serializers.ModelSerializer):
    """جزئیات اتاق اصناف"""
    city_name = serializers.CharField(
        source='city.name',
        read_only=True
    )
    province_name = serializers.CharField(
        source='city.province.name',
        read_only=True
    )
    manager_name = serializers.CharField(read_only=True)
    manager_phone = serializers.SerializerMethodField()
    unions_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Chamber
        fields = [
            'id',
            'name',
            'city',
            'city_name',
            'province_name',
            'manager',
            'manager_name',
            'manager_phone',
            'address',
            'phone',
            'email',
            'established_year',
            'unions_count',
            'is_active',
            'created_at',
            'updated_at',
        ]

    def get_manager_phone(self, obj: Chamber) -> str:
        if obj.manager:
            from apps.common.utils import mask_mobile
            return mask_mobile(obj.manager.phone_number)
        return ''


class ChamberCreateSerializer(serializers.Serializer):
    """ایجاد اتاق اصناف"""
    city_id = serializers.IntegerField()
    name = serializers.CharField(max_length=200)
    manager_id = serializers.IntegerField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True
    )
    email = serializers.EmailField(required=False, allow_blank=True)
    established_year = serializers.IntegerField(
        required=False,
        allow_null=True
    )

    def validate_name(self, value: str) -> str:
        from apps.common.utils import normalize_persian_text
        return normalize_persian_text(value)


class ChamberUpdateSerializer(serializers.Serializer):
    """ویرایش اتاق اصناف"""
    name = serializers.CharField(max_length=200, required=False)
    manager_id = serializers.IntegerField(
        required=False,
        allow_null=True
    )
    address = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True
    )
    email = serializers.EmailField(required=False, allow_blank=True)
    established_year = serializers.IntegerField(
        required=False,
        allow_null=True
    )
    is_active = serializers.BooleanField(required=False)