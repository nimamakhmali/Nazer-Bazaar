"""
ProvinceOffice Serializers
"""
from rest_framework import serializers
from apps.organizations.models import ProvinceOffice


class ProvinceOfficeListSerializer(serializers.ModelSerializer):
    """لیست دفاتر استانداری"""
    province_name = serializers.CharField(
        source='province.name',
        read_only=True
    )
    manager_name = serializers.CharField(read_only=True)

    class Meta:
        model = ProvinceOffice
        fields = [
            'id',
            'name',
            'province',
            'province_name',
            'manager_name',
            'is_active',
        ]


class ProvinceOfficeDetailSerializer(serializers.ModelSerializer):
    """جزئیات دفتر استانداری"""
    province_name = serializers.CharField(
        source='province.name',
        read_only=True
    )
    manager_name = serializers.CharField(read_only=True)
    manager_phone = serializers.SerializerMethodField()
    chambers_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ProvinceOffice
        fields = [
            'id',
            'name',
            'province',
            'province_name',
            'manager',
            'manager_name',
            'manager_phone',
            'address',
            'phone',
            'email',
            'chambers_count',
            'is_active',
            'created_at',
            'updated_at',
        ]

    def get_manager_phone(self, obj: ProvinceOffice) -> str:
        if obj.manager:
            from apps.common.utils import mask_mobile
            return mask_mobile(obj.manager.phone_number)
        return ''


class ProvinceOfficeCreateSerializer(serializers.Serializer):
    """ایجاد دفتر استانداری"""
    province_id = serializers.IntegerField()
    name = serializers.CharField(max_length=200)
    manager_id = serializers.IntegerField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True
    )
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_name(self, value: str) -> str:
        from apps.common.utils import normalize_persian_text
        return normalize_persian_text(value)


class ProvinceOfficeUpdateSerializer(serializers.Serializer):
    """ویرایش دفتر استانداری"""
    name = serializers.CharField(
        max_length=200,
        required=False
    )
    manager_id = serializers.IntegerField(
        required=False,
        allow_null=True
    )
    address = serializers.CharField(
        required=False,
        allow_blank=True
    )
    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True
    )
    email = serializers.EmailField(
        required=False,
        allow_blank=True
    )
    is_active = serializers.BooleanField(required=False)