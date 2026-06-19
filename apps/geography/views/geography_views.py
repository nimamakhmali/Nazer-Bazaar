"""
Geography API Views

تمام endpoint های مربوط به استان و شهر
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.common.permissions import IsAdminUser, IsAdminOrReadOnly
from apps.common.pagination import StandardResultsPagination
from apps.common.exceptions import ResourceNotFoundError

from apps.geography.selectors import ProvinceSelector, CitySelector
from apps.geography.services import ProvinceService, CityService
from apps.geography.serializers import (
    ProvinceListSerializer,
    ProvinceDetailSerializer,
    ProvinceCreateUpdateSerializer,
    CityListSerializer,
    CityDetailSerializer,
    CityCreateUpdateSerializer,
)


# ─── Province Views ──────────────────────────────────────────────────────────

class ProvinceListCreateView(APIView):
    """
    GET  /api/v1/geography/provinces/     ← لیست استان‌ها (عمومی)
    POST /api/v1/geography/provinces/     ← ایجاد استان (فقط ادمین)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]

    @extend_schema(
        summary='لیست استان‌ها',
        tags=['geography'],
        responses={200: ProvinceListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        provinces = ProvinceSelector.get_all_active()
        serializer = ProvinceListSerializer(provinces, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })

    @extend_schema(
        summary='ایجاد استان جدید',
        tags=['geography'],
        request=ProvinceCreateUpdateSerializer,
        responses={201: ProvinceDetailSerializer}
    )
    def post(self, request) -> Response:
        serializer = ProvinceCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ProvinceService()
        province = service.create(**serializer.validated_data)

        return Response(
            {
                'success': True,
                'message': 'استان با موفقیت ایجاد شد',
                'data': ProvinceDetailSerializer(province).data
            },
            status=status.HTTP_201_CREATED
        )


class ProvinceDetailView(APIView):
    """
    GET    /api/v1/geography/provinces/{id}/   ← جزئیات استان
    PATCH  /api/v1/geography/provinces/{id}/   ← ویرایش استان (ادمین)
    DELETE /api/v1/geography/provinces/{id}/   ← غیرفعال کردن (ادمین)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]

    def _get_province(self, province_id: int):
        province = ProvinceSelector.get_by_id(province_id)
        if not province:
            raise ResourceNotFoundError('استان مورد نظر یافت نشد')
        return province

    @extend_schema(
        summary='جزئیات استان',
        tags=['geography'],
        responses={200: ProvinceDetailSerializer}
    )
    def get(self, request, province_id: int) -> Response:
        province = self._get_province(province_id)
        serializer = ProvinceDetailSerializer(province)
        return Response({'success': True, 'data': serializer.data})

    @extend_schema(
        summary='ویرایش استان',
        tags=['geography'],
        request=ProvinceCreateUpdateSerializer,
        responses={200: ProvinceDetailSerializer}
    )
    def patch(self, request, province_id: int) -> Response:
        province = self._get_province(province_id)
        serializer = ProvinceCreateUpdateSerializer(
            province,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        service = ProvinceService()
        updated_province = service.update(
            province_id=province_id,
            **serializer.validated_data
        )

        return Response({
            'success': True,
            'message': 'استان با موفقیت ویرایش شد',
            'data': ProvinceDetailSerializer(updated_province).data
        })

    @extend_schema(
        summary='غیرفعال کردن استان',
        tags=['geography'],
    )
    def delete(self, request, province_id: int) -> Response:
        """
        استان را حذف نمی‌کنیم بلکه غیرفعال می‌کنیم.
        چون داده‌های وابسته (شهر، اتاق اصناف و...) باید حفظ شوند.
        """
        self._get_province(province_id)
        service = ProvinceService()
        service.toggle_active(province_id=province_id)

        return Response({
            'success': True,
            'message': 'وضعیت استان تغییر کرد'
        })


class ProvinceWithCitiesView(APIView):
    """
    GET /api/v1/geography/provinces/{id}/cities/
    لیست شهرهای یک استان
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary='شهرهای یک استان',
        tags=['geography'],
        responses={200: CityListSerializer(many=True)}
    )
    def get(self, request, province_id: int) -> Response:
        province = ProvinceSelector.get_by_id(province_id)
        if not province:
            raise ResourceNotFoundError('استان مورد نظر یافت نشد')

        cities = CitySelector.get_by_province(province_id)
        serializer = CityListSerializer(cities, many=True)

        return Response({
            'success': True,
            'data': serializer.data
        })


# ─── City Views ──────────────────────────────────────────────────────────────

class CityListCreateView(APIView):
    """
    GET  /api/v1/geography/cities/    ← لیست همه شهرها
    POST /api/v1/geography/cities/    ← ایجاد شهر (ادمین)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]

    @extend_schema(
        summary='لیست شهرها',
        tags=['geography'],
        parameters=[
            OpenApiParameter(
                name='province',
                description='فیلتر بر اساس شناسه استان',
                required=False,
                type=int
            ),
            OpenApiParameter(
                name='search',
                description='جستجو در نام شهر',
                required=False,
                type=str
            ),
        ],
        responses={200: CityListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        province_id = request.query_params.get('province')
        search = request.query_params.get('search')

        if province_id:
            cities = CitySelector.get_by_province(int(province_id))
        elif search:
            cities = CitySelector.search(search)
        else:
            cities = CitySelector.get_all_active()

        serializer = CityListSerializer(cities, many=True)
        return Response({'success': True, 'data': serializer.data})

    @extend_schema(
        summary='ایجاد شهر جدید',
        tags=['geography'],
        request=CityCreateUpdateSerializer,
        responses={201: CityDetailSerializer}
    )
    def post(self, request) -> Response:
        serializer = CityCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = CityService()
        city = service.create(
            name=serializer.validated_data['name'],
            province_id=serializer.validated_data['province'].id,
            is_active=serializer.validated_data.get('is_active', True)
        )

        return Response(
            {
                'success': True,
                'message': 'شهر با موفقیت ایجاد شد',
                'data': CityDetailSerializer(city).data
            },
            status=status.HTTP_201_CREATED
        )


class CityDetailView(APIView):
    """
    GET   /api/v1/geography/cities/{id}/
    PATCH /api/v1/geography/cities/{id}/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]

    def _get_city(self, city_id: int):
        city = CitySelector.get_by_id_with_province(city_id)
        if not city:
            raise ResourceNotFoundError('شهر مورد نظر یافت نشد')
        return city

    @extend_schema(
        summary='جزئیات شهر',
        tags=['geography'],
        responses={200: CityDetailSerializer}
    )
    def get(self, request, city_id: int) -> Response:
        city = self._get_city(city_id)
        serializer = CityDetailSerializer(city)
        return Response({'success': True, 'data': serializer.data})

    @extend_schema(
        summary='ویرایش شهر',
        tags=['geography'],
        request=CityCreateUpdateSerializer,
        responses={200: CityDetailSerializer}
    )
    def patch(self, request, city_id: int) -> Response:
        city = self._get_city(city_id)
        serializer = CityCreateUpdateSerializer(
            city,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        service = CityService()
        updated_city = service.update(
            city_id=city_id,
            **{
                k: (v.id if hasattr(v, 'id') else v)
                for k, v in serializer.validated_data.items()
            }
        )

        return Response({
            'success': True,
            'message': 'شهر با موفقیت ویرایش شد',
            'data': CityDetailSerializer(updated_city).data
        })