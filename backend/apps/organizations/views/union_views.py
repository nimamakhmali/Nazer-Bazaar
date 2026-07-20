"""
Union Views
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.common.exceptions import ResourceNotFoundError
from apps.common.pagination import StandardResultsPagination

from apps.organizations.selectors import UnionSelector
from apps.organizations.services import UnionService
from apps.organizations.serializers import (
    UnionListSerializer,
    UnionDetailSerializer,
    UnionCreateSerializer,
    UnionUpdateSerializer,
    AssignManagerSerializer,
)
from apps.organizations.permissions import CanManageUnion


class UnionListCreateView(APIView):
    """
    GET  /api/v1/organizations/unions/
    POST /api/v1/organizations/unions/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [CanManageUnion()]

    @extend_schema(
        summary='لیست اتحادیه‌ها',
        tags=['organizations'],
        parameters=[
            OpenApiParameter(
                name='chamber',
                description='فیلتر بر اساس شناسه اتاق اصناف',
                required=False,
                type=int
            ),
            OpenApiParameter(
                name='city',
                description='فیلتر بر اساس شناسه شهر',
                required=False,
                type=int
            ),
            OpenApiParameter(
                name='province',
                description='فیلتر بر اساس شناسه استان',
                required=False,
                type=int
            ),
            OpenApiParameter(
                name='search',
                description='جستجو در نام اتحادیه',
                required=False,
                type=str
            ),
        ],
        responses={200: UnionListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        chamber_id = request.query_params.get('chamber')
        city_id = request.query_params.get('city')
        province_id = request.query_params.get('province')
        search = request.query_params.get('search')

        if chamber_id:
            unions = UnionSelector.get_by_chamber(int(chamber_id))
        elif city_id:
            unions = UnionSelector.get_by_city(int(city_id))
        elif province_id:
            unions = UnionSelector.get_by_province(int(province_id))
        elif search:
            unions = UnionSelector.search(search)
        else:
            unions = UnionSelector.get_all_active()

        paginator = StandardResultsPagination()
        paginated = paginator.paginate_queryset(unions, request)
        serializer = UnionListSerializer(paginated, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary='ایجاد اتحادیه',
        tags=['organizations'],
        request=UnionCreateSerializer,
        responses={201: UnionDetailSerializer}
    )
    def post(self, request) -> Response:
        serializer = UnionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = UnionService()
        union = service.create(
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response(
            {
                'success': True,
                'message': 'اتحادیه با موفقیت ایجاد شد',
                'data': UnionDetailSerializer(union).data
            },
            status=status.HTTP_201_CREATED
        )


class UnionDetailView(APIView):
    """
    GET   /api/v1/organizations/unions/{id}/
    PATCH /api/v1/organizations/unions/{id}/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [CanManageUnion()]

    def _get_union(self, union_id: int):
        union = UnionSelector.get_by_id(union_id)
        if not union:
            raise ResourceNotFoundError('اتحادیه مورد نظر یافت نشد')
        return union

    @extend_schema(
        summary='جزئیات اتحادیه',
        tags=['organizations'],
        responses={200: UnionDetailSerializer}
    )
    def get(self, request, union_id: int) -> Response:
        union = self._get_union(union_id)
        return Response({
            'success': True,
            'data': UnionDetailSerializer(union).data
        })

    @extend_schema(
        summary='ویرایش اتحادیه',
        tags=['organizations'],
        request=UnionUpdateSerializer,
        responses={200: UnionDetailSerializer}
    )
    def patch(self, request, union_id: int) -> Response:
        self._get_union(union_id)
        serializer = UnionUpdateSerializer(
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        service = UnionService()
        updated = service.update(
            union_id=union_id,
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response({
            'success': True,
            'message': 'اتحادیه با موفقیت ویرایش شد',
            'data': UnionDetailSerializer(updated).data
        })


class UnionToggleActiveView(APIView):
    """
    POST /api/v1/organizations/unions/{id}/toggle-active/
    """
    permission_classes = [CanManageUnion]

    @extend_schema(
        summary='فعال/غیرفعال کردن اتحادیه',
        tags=['organizations'],
    )
    def post(self, request, union_id: int) -> Response:
        service = UnionService()
        union = service.toggle_active(
            union_id=union_id,
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': (
                'اتحادیه فعال شد'
                if union.is_active
                else 'اتحادیه غیرفعال شد'
            ),
            'data': UnionDetailSerializer(union).data
        })


class UnionAssignManagerView(APIView):
    """
    POST /api/v1/organizations/unions/{id}/assign-manager/
    """
    permission_classes = [CanManageUnion]

    @extend_schema(
        summary='تخصیص رئیس به اتحادیه',
        tags=['organizations'],
        request=AssignManagerSerializer,
        responses={200: UnionDetailSerializer}
    )
    def post(self, request, union_id: int) -> Response:
        serializer = AssignManagerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = UnionService()
        updated = service.assign_manager(
            union_id=union_id,
            manager_id=serializer.validated_data['manager_id'],
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'رئیس اتحادیه با موفقیت تعیین شد',
            'data': UnionDetailSerializer(updated).data
        })