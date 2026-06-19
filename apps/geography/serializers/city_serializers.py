"""
City Serializers
"""
from rest_framework import serializers
from apps.geography.models import City


class CityListSerializer(serializers.ModelSerializer):
    """
    برای لیست شهرها - استفاده در dropdown ها
    """
    province_name = serializers.CharField(
        source='province.name',
        read_only=True
    )

    class Meta:
        model = City
        fields = ['id', 'name', 'province_name']


class CityDetailSerializer(serializers.ModelSerializer):
    """
    برای جزئیات یک شهر
    """
    province_name = serializers.CharField(
        source='province.name',
        read_only=True
    )
    province_code = serializers.CharField(
        source='province.code',
        read_only=True
    )

    class Meta:
        model = City
        fields = [
            'id',
            'name',
            'province',
            'province_name',
            'province_code',
            'is_active',
            'created_at',
            'updated_at',
        ]


class CityCreateUpdateSerializer(serializers.ModelSerializer):
    """
    برای ایجاد و ویرایش شهر
    """
    class Meta:
        model = City
        fields = ['name', 'province', 'is_active']

    def validate_name(self, value: str) -> str:
        from apps.common.utils import normalize_persian_text
        return normalize_persian_text(value)

    def validate(self, attrs: dict) -> dict:
        """
        بررسی تکراری نبودن شهر در استان.
        هم در create و هم در update بررسی می‌شود.
        """
        name = attrs.get('name')
        province = attrs.get('province')

        if name and province:
            instance = getattr(self, 'instance', None)
            exclude_id = instance.id if instance else None

            from apps.geography.selectors import CitySelector
            if CitySelector.exists_in_province(
                name,
                province.id,
                exclude_id=exclude_id
            ):
                raise serializers.ValidationError(
                    f'شهری با نام "{name}" در این استان قبلاً ثبت شده است'
                )

        return attrs