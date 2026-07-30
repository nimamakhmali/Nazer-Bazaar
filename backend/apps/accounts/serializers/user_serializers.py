"""
Serializer های مربوط به کاربران
"""
from rest_framework import serializers
from apps.common.choices import UserRole
from apps.common.validators import (
    validate_iranian_mobile,
    validate_iranian_national_id,
)
from apps.accounts.models import User


class UserBasicSerializer(serializers.ModelSerializer):
    """
    اطلاعات پایه کاربر.
    برای نمایش در سایر Serializer ها استفاده می‌شود.
    """
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'full_name',
            'phone_number',
            'role',
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    """
    پروفایل کامل کاربر - برای نمایش به خودش
    """
    full_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(
        source='get_role_display',
        read_only=True
    )
    masked_phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'full_name',
            'first_name',
            'last_name',
            'phone_number',
            'masked_phone',
            'email',
            'national_code',
            'role',
            'role_display',
            'is_phone_verified',
            'avatar',
            'date_joined',
            'last_login_at',
        ]
        read_only_fields = [
            'phone_number',
            'role',
            'is_phone_verified',
            'date_joined',
            'last_login_at',
        ]

    def get_masked_phone(self, obj: User) -> str:
        from apps.common.utils import mask_mobile
        return mask_mobile(obj.phone_number)


class UserUpdateSerializer(serializers.ModelSerializer):
    """ویرایش پروفایل توسط خود کاربر"""

    national_code = serializers.CharField(
        max_length=10,
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    first_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )
    last_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'email',
            'national_code',
        ]

    def validate_national_code(self, value):
        if value and value.strip():
            validate_iranian_national_id(value.strip())
            return value.strip()
        return None

    def validate_email(self, value):
        if value and value.strip():
            return value.strip()
        return None

class UserAdminSerializer(serializers.ModelSerializer):
    """
    اطلاعات کامل کاربر - برای نمایش به ادمین
    """
    full_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(
        source='get_role_display',
        read_only=True
    )

    class Meta:
        model = User
        fields = [
            'id',
            'full_name',
            'first_name',
            'last_name',
            'phone_number',
            'email',
            'national_code',
            'role',
            'role_display',
            'is_active',
            'is_phone_verified',
            'date_joined',
            'last_login_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['date_joined', 'last_login_at']


class CreateOrganizationUserSerializer(serializers.Serializer):
    """
    ایجاد کاربر سازمانی توسط ادمین.
    """
    phone_number = serializers.CharField(max_length=15)
    role = serializers.ChoiceField(choices=[
        UserRole.PROVINCE_MANAGER,
        UserRole.CHAMBER_MANAGER,
        UserRole.UNION_MANAGER,
        UserRole.STORE_OWNER,
        UserRole.INSPECTOR,
    ])
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False)
    national_code = serializers.CharField(
        max_length=10,
        required=False,
        allow_blank=True
    )
    password = serializers.CharField(
        min_length=8,
        required=False,
        write_only=True
    )

    def validate_phone_number(self, value: str) -> str:
        validate_iranian_mobile(value)
        from apps.common.validators import normalize_mobile
        return normalize_mobile(value)

    def validate_national_code(self, value: str) -> str:
        if value:
            validate_iranian_national_id(value)
        return value


class ChangeRoleSerializer(serializers.Serializer):
    """تغییر نقش کاربر"""
    role = serializers.ChoiceField(choices=UserRole.choices)