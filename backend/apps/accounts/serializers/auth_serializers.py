"""
Serializer های مربوط به احراز هویت
"""
from rest_framework import serializers
from apps.common.validators import validate_iranian_mobile


class RequestOTPSerializer(serializers.Serializer):
    """درخواست کد OTP"""
    phone_number = serializers.CharField(
        max_length=15,
        help_text='شماره موبایل - مثال: 09123456789'
    )

    def validate_phone_number(self, value: str) -> str:
        validate_iranian_mobile(value)
        from apps.common.validators import normalize_mobile
        return normalize_mobile(value)


class VerifyOTPSerializer(serializers.Serializer):
    """اعتبارسنجی کد OTP"""
    phone_number = serializers.CharField(max_length=15)
    code = serializers.CharField(
        max_length=10,
        min_length=4,
        help_text='کد تایید ارسال‌شده به موبایل'
    )

    def validate_phone_number(self, value: str) -> str:
        validate_iranian_mobile(value)
        from apps.common.validators import normalize_mobile
        return normalize_mobile(value)

    def validate_code(self, value: str) -> str:
        if not value.isdigit():
            raise serializers.ValidationError(
                'کد تایید باید فقط شامل اعداد باشد'
            )
        return value


class PasswordLoginSerializer(serializers.Serializer):
    """ورود با رمز عبور (برای کاربران سازمانی)"""
    phone_number = serializers.CharField(max_length=15)
    password = serializers.CharField(
        min_length=8,
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate_phone_number(self, value: str) -> str:
        validate_iranian_mobile(value)
        from apps.common.validators import normalize_mobile
        return normalize_mobile(value)


class TokenResponseSerializer(serializers.Serializer):
    """فرمت پاسخ توکن"""
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)


class RefreshTokenSerializer(serializers.Serializer):
    """رفرش توکن"""
    refresh = serializers.CharField()