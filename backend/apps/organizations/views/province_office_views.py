"""
ProvinceOffice Views
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from apps.common.permissions import IsAdminUser
from apps.common.exceptions import ResourceNotFoundError
from apps.common.pagination import StandardResultsPagination

from apps.organizations.selectors import ProvinceOfficeSelector
from apps.organizations.services import ProvinceOfficeService
from apps.organizations.serializers import (
    ProvinceOfficeListSerializer,
    ProvinceOfficeDetailSerializer,
    ProvinceOfficeCreateSerializer,
    ProvinceOfficeUpdateSerializer,
    AssignManagerSerializer,
)
from apps.organizations.permissions import CanManageProvinceOffice


class ProvinceOfficeListCreateView(APIView):
    """
    GET  /api/v1/organizations/province-offices/
    POST /api/v1/organizations/province-offices/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminUser()]

    @extend_schema(
        summary='لیست دفاتر استانداری',
        tags=['organizations'],
        responses={200: ProvinceOfficeListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        offices = ProvinceOfficeSelector.get_all_active()
        paginator = StandardResultsPagination()
        paginated = paginator.paginate_queryset(offices, request)
        serializer = ProvinceOfficeListSerializer(paginated, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary='ایجاد دفتر استانداری',
        tags=['organizations'],
        request=ProvinceOfficeCreateSerializer,
        responses={201: ProvinceOfficeDetailSerializer}
    )
    def post(self, request) -> Response:
        serializer = ProvinceOfficeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ProvinceOfficeService()
        office = service.create(
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response(
            {
                'success': True,
                'message': 'دفتر استانداری با موفقیت ایجاد شد',
                'data': ProvinceOfficeDetailSerializer(office).data
            },
            status=status.HTTP_201_CREATED
        )


class ProvinceOfficeDetailView(APIView):
    """
    GET   /api/v1/organizations/province-offices/{id}/
    PATCH /api/v1/organizations/province-offices/{id}/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [CanManageProvinceOffice()]

    def _get_office(self, office_id: int):
        office = ProvinceOfficeSelector.get_by_id(office_id)
        if not office:
            raise ResourceNotFoundError(
                'دفتر استانداری مورد نظر یافت نشد'
            )
        return office

    @extend_schema(
        summary='جزئیات دفتر استانداری',
        tags=['organizations'],
        responses={200: ProvinceOfficeDetailSerializer}
    )
    def get(self, request, office_id: int) -> Response:
        office = self._get_office(office_id)
        return Response({
            'success': True,
            'data': ProvinceOfficeDetailSerializer(office).data
        })

    @extend_schema(
        summary='ویرایش دفتر استانداری',
        tags=['organizations'],
        request=ProvinceOfficeUpdateSerializer,
        responses={200: ProvinceOfficeDetailSerializer}
    )
    def patch(self, request, office_id: int) -> Response:
        self._get_office(office_id)
        serializer = ProvinceOfficeUpdateSerializer(
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        service = ProvinceOfficeService()
        updated = service.update(
            office_id=office_id,
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response({
            'success': True,
            'message': 'دفتر استانداری با موفقیت ویرایش شد',
            'data': ProvinceOfficeDetailSerializer(updated).data
        })


class ProvinceOfficeAssignManagerView(APIView):
    """
    POST /api/v1/organizations/province-offices/{id}/assign-manager/
    """
    permission_classes = [IsAdminUser]

    @extend_schema(
        summary='تخصیص مدیر به دفتر استانداری',
        tags=['organizations'],
        request=AssignManagerSerializer,
        responses={200: ProvinceOfficeDetailSerializer}
    )
    def post(self, request, office_id: int) -> Response:
        serializer = AssignManagerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ProvinceOfficeService()
        updated = service.assign_manager(
            office_id=office_id,
            manager_id=serializer.validated_data['manager_id'],
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'مدیر با موفقیت تعیین شد',
            'data': ProvinceOfficeDetailSerializer(updated).data
        })