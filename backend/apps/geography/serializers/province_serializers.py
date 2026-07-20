"""
Province Serializers
"""
from rest_framework import serializers
from apps.geography.models import Province


class ProvinceListSerializer(serializers.ModelSerializer):
    """
    برای لیست استان‌ها - فیلدهای کمتر برای سرعت بیشتر
    """
    class Meta:
        model = Province
        fields = ['id', 'name', 'code']


class ProvinceDetailSerializer(serializers.ModelSerializer):
    """
    برای جزئیات یک استان
    """
    cities_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Province
        fields = [
            'id',
            'name',
            'code',
            'is_active',
            'cities_count',
            'created_at',
            'updated_at',
        ]


class ProvinceCreateUpdateSerializer(serializers.ModelSerializer):
    """
    برای ایجاد و ویرایش استان - فقط توسط ادمین
    """
    class Meta:
        model = Province
        fields = ['name', 'code', 'is_active']

    def validate_name(self, value: str) -> str:
        from apps.common.utils import normalize_persian_text
        return normalize_persian_text(value)

    def validate_code(self, value: str) -> str:
        """کد استان باید عددی و دو رقمی باشد"""
        if not value.isdigit():
            raise serializers.ValidationError(
                'کد استان باید فقط شامل اعداد باشد'
            )
        return value.zfill(2)