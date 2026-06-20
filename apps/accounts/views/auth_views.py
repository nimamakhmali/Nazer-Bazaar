"""
Auth Views - endpoint های احراز هویت
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import extend_schema

from apps.accounts.serializers import (
    RequestOTPSerializer,
    VerifyOTPSerializer,
    PasswordLoginSerializer,
    RefreshTokenSerializer,
    UserProfileSerializer,
)
from apps.accounts.services import AuthService


def get_client_ip(request) -> str:
    """استخراج IP کلاینت از request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


class RequestOTPView(APIView):
    """
    POST /api/v1/auth/otp/request/
    درخواست کد OTP برای ورود
    """
    permission_classes = [AllowAny]
    throttle_scope = 'otp'

    @extend_schema(
        summary='درخواست کد OTP',
        tags=['auth'],
        request=RequestOTPSerializer,
        responses={200: {
            'type': 'object',
            'properties': {
                'success': {'type': 'boolean'},
                'message': {'type': 'string'},
                'data': {
                    'type': 'object',
                    'properties': {
                        'expires_in': {'type': 'integer'},
                        'is_new_user': {'type': 'boolean'},
                    }
                }
            }
        }}
    )
    def post(self, request) -> Response:
        serializer = RequestOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        result = service.request_otp(
            phone_number=serializer.validated_data['phone_number'],
            ip_address=get_client_ip(request)
        )

        return Response({
            'success': True,
            'message': 'کد تایید به شماره موبایل شما ارسال شد',
            'data': {
                'expires_in': result['expires_in'],
                'is_new_user': result['is_new_user'],
            }
        })


class VerifyOTPView(APIView):
    """
    POST /api/v1/auth/otp/verify/
    اعتبارسنجی OTP و دریافت توکن
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary='تایید کد OTP و ورود به سیستم',
        tags=['auth'],
        request=VerifyOTPSerializer,
        responses={200: {
            'type': 'object',
            'properties': {
                'success': {'type': 'boolean'},
                'data': {
                    'type': 'object',
                    'properties': {
                        'access': {'type': 'string'},
                        'refresh': {'type': 'string'},
                        'user': {'type': 'object'},
                    }
                }
            }
        }}
    )
    def post(self, request) -> Response:
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        user, tokens = service.verify_otp_and_login(
            phone_number=serializer.validated_data['phone_number'],
            code=serializer.validated_data['code']
        )

        return Response({
            'success': True,
            'message': 'ورود با موفقیت انجام شد',
            'data': {
                **tokens,
                'user': UserProfileSerializer(user).data,
            }
        })


class PasswordLoginView(APIView):
    """
    POST /api/v1/auth/login/
    ورود با رمز عبور (برای کاربران سازمانی)
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary='ورود با رمز عبور',
        tags=['auth'],
        request=PasswordLoginSerializer,
    )
    def post(self, request) -> Response:
        serializer = PasswordLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        user, tokens = service.login_with_password(
            phone_number=serializer.validated_data['phone_number'],
            password=serializer.validated_data['password']
        )

        return Response({
            'success': True,
            'message': 'ورود با موفقیت انجام شد',
            'data': {
                **tokens,
                'user': UserProfileSerializer(user).data,
            }
        })


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    خروج از سیستم
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='خروج از سیستم',
        tags=['auth'],
        request=RefreshTokenSerializer,
    )
    def post(self, request) -> Response:
        serializer = RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        service.logout(
            refresh_token=serializer.validated_data['refresh']
        )

        return Response({
            'success': True,
            'message': 'خروج با موفقیت انجام شد'
        })


class RefreshTokenView(APIView):
    """
    POST /api/v1/auth/token/refresh/
    تمدید access token
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary='تمدید توکن',
        tags=['auth'],
        request=RefreshTokenSerializer,
    )
    def post(self, request) -> Response:
        serializer = RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        tokens = service.refresh_access_token(
            refresh_token=serializer.validated_data['refresh']
        )

        return Response({
            'success': True,
            'data': tokens
        })


class MeView(APIView):
    """
    GET  /api/v1/auth/me/  ← اطلاعات کاربر فعلی
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='اطلاعات کاربر جاری',
        tags=['auth'],
        responses={200: UserProfileSerializer}
    )
    def get(self, request) -> Response:
        serializer = UserProfileSerializer(request.user)
        return Response({
            'success': True,
            'data': serializer.data
        })