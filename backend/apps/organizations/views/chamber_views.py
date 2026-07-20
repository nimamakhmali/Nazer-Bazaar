"""
Chamber Views
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.common.exceptions import ResourceNotFoundError
from apps.common.pagination import StandardResultsPagination

from apps.organizations.selectors import ChamberSelector
from apps.organizations.services import ChamberService
from apps.organizations.serializers import (
    ChamberListSerializer,
    ChamberDetailSerializer,
    ChamberCreateSerializer,
    ChamberUpdateSerializer,
    AssignManagerSerializer,
    UnionListSerializer,
)
from apps.organizations.permissions import (
    CanManageChamber,
    CanViewOrganization,
)


class ChamberListCreateView(APIView):
    """
    GET  /api/v1/organizations/chambers/
    POST /api/v1/organizations/chambers/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [CanManageChamber()]

    @extend_schema(
        summary='لیست اتاق‌های اصناف',
        tags=['organizations'],
        parameters=[
            OpenApiParameter(
                name='province',
                description='فیلتر بر اساس شناسه استان',
                required=False,
                type=int
            ),
        ],
        responses={200: ChamberListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        province_id = request.query_params.get('province')

        if province_id:
            chambers = ChamberSelector.get_by_province(int(province_id))
        else:
            chambers = ChamberSelector.get_all_active()

        paginator = StandardResultsPagination()
        paginated = paginator.paginate_queryset(chambers, request)
        serializer = ChamberListSerializer(paginated, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary='ایجاد اتاق اصناف',
        tags=['organizations'],
        request=ChamberCreateSerializer,
        responses={201: ChamberDetailSerializer}
    )
    def post(self, request) -> Response:
        serializer = ChamberCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ChamberService()
        chamber = service.create(
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response(
            {
                'success': True,
                'message': 'اتاق اصناف با موفقیت ایجاد شد',
                'data': ChamberDetailSerializer(chamber).data
            },
            status=status.HTTP_201_CREATED
        )


class ChamberDetailView(APIView):
    """
    GET   /api/v1/organizations/chambers/{id}/
    PATCH /api/v1/organizations/chambers/{id}/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [CanManageChamber()]

    def _get_chamber(self, chamber_id: int):
        chamber = ChamberSelector.get_by_id(chamber_id)
        if not chamber:
            raise ResourceNotFoundError('اتاق اصناف مورد نظر یافت نشد')
        return chamber

    @extend_schema(
        summary='جزئیات اتاق اصناف',
        tags=['organizations'],
        responses={200: ChamberDetailSerializer}
    )
    def get(self, request, chamber_id: int) -> Response:
        chamber = self._get_chamber(chamber_id)
        return Response({
            'success': True,
            'data': ChamberDetailSerializer(chamber).data
        })

    @extend_schema(
        summary='ویرایش اتاق اصناف',
        tags=['organizations'],
        request=ChamberUpdateSerializer,
        responses={200: ChamberDetailSerializer}
    )
    def patch(self, request, chamber_id: int) -> Response:
        self._get_chamber(chamber_id)
        serializer = ChamberUpdateSerializer(
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        service = ChamberService()
        updated = service.update(
            chamber_id=chamber_id,
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response({
            'success': True,
            'message': 'اتاق اصناف با موفقیت ویرایش شد',
            'data': ChamberDetailSerializer(updated).data
        })


class ChamberUnionsView(APIView):
    """
    GET /api/v1/organizations/chambers/{id}/unions/
    لیست اتحادیه‌های یک اتاق اصناف
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='اتحادیه‌های یک اتاق اصناف',
        tags=['organizations'],
        responses={200: UnionListSerializer(many=True)}
    )
    def get(self, request, chamber_id: int) -> Response:
        chamber = ChamberSelector.get_by_id(chamber_id)
        if not chamber:
            raise ResourceNotFoundError('اتاق اصناف مورد نظر یافت نشد')

        from apps.organizations.selectors import UnionSelector
        unions = UnionSelector.get_by_chamber(chamber_id)
        serializer = UnionListSerializer(unions, many=True)

        return Response({
            'success': True,
            'data': serializer.data
        })


class ChamberAssignManagerView(APIView):
    """
    POST /api/v1/organizations/chambers/{id}/assign-manager/
    """
    permission_classes = [CanManageChamber]

    @extend_schema(
        summary='تخصیص مدیر به اتاق اصناف',
        tags=['organizations'],
        request=AssignManagerSerializer,
        responses={200: ChamberDetailSerializer}
    )
    def post(self, request, chamber_id: int) -> Response:
        serializer = AssignManagerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ChamberService()
        updated = service.assign_manager(
            chamber_id=chamber_id,
            manager_id=serializer.validated_data['manager_id'],
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'مدیر با موفقیت تعیین شد',
            'data': ChamberDetailSerializer(updated).data
        })