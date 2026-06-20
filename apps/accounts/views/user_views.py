"""
User Views - مدیریت کاربران
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from apps.common.permissions import IsAdminUser
from apps.common.exceptions import ResourceNotFoundError
from apps.common.pagination import StandardResultsPagination

from apps.accounts.serializers import (
    UserProfileSerializer,
    UserUpdateSerializer,
    UserAdminSerializer,
    CreateOrganizationUserSerializer,
    ChangeRoleSerializer,
)
from apps.accounts.services import UserService
from apps.accounts.selectors import UserSelector
from apps.accounts.permissions import IsSelfOrAdmin


class UserProfileView(APIView):
    """
    GET   /api/v1/users/profile/   ← مشاهده پروفایل
    PATCH /api/v1/users/profile/   ← ویرایش پروفایل
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='مشاهده پروفایل',
        tags=['users'],
        responses={200: UserProfileSerializer}
    )
    def get(self, request) -> Response:
        serializer = UserProfileSerializer(request.user)
        return Response({
            'success': True,
            'data': serializer.data
        })

    @extend_schema(
        summary='ویرایش پروفایل',
        tags=['users'],
        request=UserUpdateSerializer,
        responses={200: UserProfileSerializer}
    )
    def patch(self, request) -> Response:
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        service = UserService()
        updated_user = service.update_profile(
            user_id=request.user.id,
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response({
            'success': True,
            'message': 'پروفایل با موفقیت بروزرسانی شد',
            'data': UserProfileSerializer(updated_user).data
        })


class AdminUserListView(APIView):
    """
    GET  /api/v1/users/           ← لیست کاربران (ادمین)
    POST /api/v1/users/           ← ایجاد کاربر سازمانی (ادمین)
    """
    permission_classes = [IsAdminUser]

    @extend_schema(
        summary='لیست کاربران',
        tags=['users'],
        responses={200: UserAdminSerializer(many=True)}
    )
    def get(self, request) -> Response:
        role = request.query_params.get('role')
        search = request.query_params.get('search')

        if role:
            users = UserSelector.get_by_role(role)
        elif search:
            users = UserSelector.search(search)
        else:
            users = UserSelector.get_all_active()

        paginator = StandardResultsPagination()
        paginated = paginator.paginate_queryset(users, request)
        serializer = UserAdminSerializer(paginated, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary='ایجاد کاربر سازمانی',
        tags=['users'],
        request=CreateOrganizationUserSerializer,
        responses={201: UserAdminSerializer}
    )
    def post(self, request) -> Response:
        serializer = CreateOrganizationUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = UserService()
        user = service.create_organization_user(
            created_by=request.user,
            **serializer.validated_data
        )

        return Response(
            {
                'success': True,
                'message': 'کاربر با موفقیت ایجاد شد',
                'data': UserAdminSerializer(user).data
            },
            status=status.HTTP_201_CREATED
        )


class AdminUserDetailView(APIView):
    """
    GET    /api/v1/users/{id}/          ← جزئیات کاربر
    PATCH  /api/v1/users/{id}/role/     ← تغییر نقش
    DELETE /api/v1/users/{id}/          ← غیرفعال کردن
    """
    permission_classes = [IsAdminUser]

    def _get_user(self, user_id: int):
        user = UserSelector.get_by_id(user_id)
        if not user:
            raise ResourceNotFoundError('کاربر مورد نظر یافت نشد')
        return user

    @extend_schema(
        summary='جزئیات کاربر',
        tags=['users'],
        responses={200: UserAdminSerializer}
    )
    def get(self, request, user_id: int) -> Response:
        user = self._get_user(user_id)
        return Response({
            'success': True,
            'data': UserAdminSerializer(user).data
        })

    @extend_schema(
        summary='غیرفعال کردن کاربر',
        tags=['users'],
    )
    def delete(self, request, user_id: int) -> Response:
        self._get_user(user_id)
        service = UserService()
        service.deactivate_user(
            user_id=user_id,
            requesting_user=request.user
        )
        return Response({
            'success': True,
            'message': 'کاربر غیرفعال شد'
        })


class ChangeUserRoleView(APIView):
    """
    PATCH /api/v1/users/{id}/role/
    تغییر نقش کاربر - فقط ادمین
    """
    permission_classes = [IsAdminUser]

    @extend_schema(
        summary='تغییر نقش کاربر',
        tags=['users'],
        request=ChangeRoleSerializer,
        responses={200: UserAdminSerializer}
    )
    def patch(self, request, user_id: int) -> Response:
        serializer = ChangeRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = UserService()
        user = service.change_user_role(
            user_id=user_id,
            new_role=serializer.validated_data['role'],
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'نقش کاربر با موفقیت تغییر کرد',
            'data': UserAdminSerializer(user).data
        })