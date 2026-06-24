"""
Union Serializers
"""
from rest_framework import serializers
from apps.organizations.models import Union


class UnionListSerializer(serializers.ModelSerializer):
    """لیست اتحادیه‌ها"""
    chamber_name = serializers.CharField(
        source='chamber.name',
        read_only=True
    )
    city_name = serializers.CharField(
        source='chamber.city.name',
        read_only=True
    )
    province_name = serializers.CharField(
        source='chamber.city.province.name',
        read_only=True
    )
    manager_name = serializers.CharField(read_only=True)
    stores_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Union
        fields = [
            'id',
            'name',
            'chamber',
            'chamber_name',
            'city_name',
            'province_name',
            'manager_name',
            'stores_count',
            'is_active',
        ]


class UnionDetailSerializer(serializers.ModelSerializer):
    """جزئیات اتحادیه"""
    chamber_name = serializers.CharField(
        source='chamber.name',
        read_only=True
    )
    city_name = serializers.CharField(
        source='chamber.city.name',
        read_only=True
    )
    province_name = serializers.CharField(
        source='chamber.city.province.name',
        read_only=True
    )
    manager_name = serializers.CharField(read_only=True)
    manager_phone = serializers.SerializerMethodField()
    stores_count = serializers.IntegerField(read_only=True)
    full_path = serializers.CharField(read_only=True)

    class Meta:
        model = Union
        fields = [
            'id',
            'name',
            'chamber',
            'chamber_name',
            'city_name',
            'province_name',
            'manager',
            'manager_name',
            'manager_phone',
            'description',
            'license_number',
            'established_year',
            'phone',
            'address',
            'logo',
            'stores_count',
            'full_path',
            'is_active',
            'created_at',
            'updated_at',
        ]

    def get_manager_phone(self, obj: Union) -> str:
        if obj.manager:
            from apps.common.utils import mask_mobile
            return mask_mobile(obj.manager.phone_number)
        return ''


class UnionCreateSerializer(serializers.Serializer):
    """ایجاد اتحادیه"""
    chamber_id = serializers.IntegerField()
    name = serializers.CharField(max_length=200)
    manager_id = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
    license_number = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        allow_null=True
    )
    established_year = serializers.IntegerField(
        required=False,
        allow_null=True
    )
    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True
    )
    address = serializers.CharField(required=False, allow_blank=True)

    def validate_name(self, value: str) -> str:
        from apps.common.utils import normalize_persian_text
        return normalize_persian_text(value)


class UnionUpdateSerializer(serializers.Serializer):
    """ویرایش اتحادیه"""
    name = serializers.CharField(max_length=200, required=False)
    manager_id = serializers.IntegerField(
        required=False,
        allow_null=True
    )
    description = serializers.CharField(required=False, allow_blank=True)
    license_number = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        allow_null=True
    )
    established_year = serializers.IntegerField(
        required=False,
        allow_null=True
    )
    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True
    )
    address = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)


class AssignManagerSerializer(serializers.Serializer):
    """تخصیص مدیر/رئیس"""
    manager_id = serializers.IntegerField()