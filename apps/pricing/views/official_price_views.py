"""
Official Price Views
"""
from datetime import date
from decimal import Decimal
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.common.permissions import IsAdminUser
from apps.common.exceptions import ResourceNotFoundError
from apps.common.pagination import StandardResultsPagination

from apps.pricing.selectors import OfficialPriceSelector
from apps.pricing.services import OfficialPriceService, PriceValidatorService
from apps.pricing.serializers import (
    OfficialPriceListSerializer,
    OfficialPriceDetailSerializer,
    OfficialPriceCreateSerializer,
    OfficialPriceUpdateSerializer,
    BulkOfficialPriceSerializer,
    PriceRangeSerializer,
)
from apps.pricing.permissions import (
    CanSetOfficialPrice,
    CanViewPrices,
    CanViewPriceHistory,
)


class OfficialPriceListCreateView(APIView):
    """
    GET  /api/v1/pricing/official-prices/
    POST /api/v1/pricing/official-prices/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [CanSetOfficialPrice()]

    @extend_schema(
        summary='لیست قیمت‌های مصوب',
        tags=['pricing'],
        parameters=[
            OpenApiParameter(
                name='union',
                description='فیلتر بر اساس اتحادیه',
                required=False,
                type=int
            ),
            OpenApiParameter(
                name='product',
                description='فیلتر بر اساس محصول',
                required=False,
                type=int
            ),
            OpenApiParameter(
                name='date',
                description='فیلتر بر اساس تاریخ (YYYY-MM-DD)',
                required=False,
                type=str
            ),
        ],
        responses={200: OfficialPriceListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        union_id = request.query_params.get('union')
        product_id = request.query_params.get('product')
        date_str = request.query_params.get('date')

        target_date = None
        if date_str:
            try:
                from datetime import datetime
                target_date = datetime.strptime(
                    date_str, '%Y-%m-%d'
                ).date()
            except ValueError:
                return Response(
                    {
                        'success': False,
                        'message': 'فرمت تاریخ نامعتبر است (YYYY-MM-DD)'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        prices = OfficialPriceSelector.get_all_for_admin(
            union_id=int(union_id) if union_id else None,
            product_id=int(product_id) if product_id else None,
            date=target_date,
        )

        paginator = StandardResultsPagination()
        paginated = paginator.paginate_queryset(prices, request)
        serializer = OfficialPriceListSerializer(paginated, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary='ثبت قیمت مصوب',
        tags=['pricing'],
        request=OfficialPriceCreateSerializer,
        responses={201: OfficialPriceDetailSerializer}
    )
    def post(self, request) -> Response:
        serializer = OfficialPriceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = OfficialPriceService()
        official_price = service.create(
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response(
            {
                'success': True,
                'message': 'قیمت مصوب با موفقیت ثبت شد',
                'data': OfficialPriceDetailSerializer(official_price).data
            },
            status=status.HTTP_201_CREATED
        )


class OfficialPriceDetailView(APIView):
    """
    GET   /api/v1/pricing/official-prices/{id}/
    PATCH /api/v1/pricing/official-prices/{id}/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [CanSetOfficialPrice()]

    def _get_price(self, price_id: int):
        price = OfficialPriceSelector.get_by_id(price_id)
        if not price:
            raise ResourceNotFoundError('قیمت مصوب مورد نظر یافت نشد')
        return price

    @extend_schema(
        summary='جزئیات قیمت مصوب',
        tags=['pricing'],
        responses={200: OfficialPriceDetailSerializer}
    )
    def get(self, request, price_id: int) -> Response:
        price = self._get_price(price_id)
        return Response({
            'success': True,
            'data': OfficialPriceDetailSerializer(price).data
        })

    @extend_schema(
        summary='ویرایش قیمت مصوب',
        tags=['pricing'],
        request=OfficialPriceUpdateSerializer,
        responses={200: OfficialPriceDetailSerializer}
    )
    def patch(self, request, price_id: int) -> Response:
        self._get_price(price_id)
        serializer = OfficialPriceUpdateSerializer(
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        service = OfficialPriceService()
        updated = service.update(
            official_price_id=price_id,
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response({
            'success': True,
            'message': 'قیمت مصوب با موفقیت ویرایش شد',
            'data': OfficialPriceDetailSerializer(updated).data
        })


class OfficialPriceDeactivateView(APIView):
    """
    POST /api/v1/pricing/official-prices/{id}/deactivate/
    """
    permission_classes = [CanSetOfficialPrice]

    @extend_schema(
        summary='غیرفعال کردن قیمت مصوب',
        tags=['pricing'],
    )
    def post(self, request, price_id: int) -> Response:
        service = OfficialPriceService()
        service.deactivate(
            official_price_id=price_id,
            requesting_user=request.user
        )
        return Response({
            'success': True,
            'message': 'قیمت مصوب غیرفعال شد'
        })


class BulkOfficialPriceView(APIView):
    """
    POST /api/v1/pricing/official-prices/bulk/
    ثبت انبوه قیمت‌های مصوب
    """
    permission_classes = [CanSetOfficialPrice]

    @extend_schema(
        summary='ثبت انبوه قیمت مصوب',
        tags=['pricing'],
        request=BulkOfficialPriceSerializer,
    )
    def post(self, request) -> Response:
        serializer = BulkOfficialPriceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = OfficialPriceService()
        result = service.bulk_create(
            union_id=serializer.validated_data['union_id'],
            prices=serializer.validated_data['prices'],
            effective_date=serializer.validated_data.get('effective_date'),
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'عملیات ثبت انبوه انجام شد',
            'data': result
        })


class TodayOfficialPricesView(APIView):
    """
    GET /api/v1/pricing/official-prices/today/
    قیمت‌های مصوب امروز یک اتحادیه
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary='قیمت‌های مصوب امروز',
        tags=['pricing'],
        parameters=[
            OpenApiParameter(
                name='union',
                description='شناسه اتحادیه (اجباری)',
                required=True,
                type=int
            ),
        ],
        responses={200: OfficialPriceListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        union_id = request.query_params.get('union')
        if not union_id:
            return Response(
                {
                    'success': False,
                    'message': 'شناسه اتحادیه الزامی است'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        prices = OfficialPriceSelector.get_by_union_and_date(
            union_id=int(union_id)
        )
        serializer = OfficialPriceListSerializer(prices, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })


class PriceRangeCheckView(APIView):
    """
    GET /api/v1/pricing/price-range/
    محاسبه محدوده قیمت مجاز برای یک قیمت مصوب
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary='محاسبه محدوده قیمت مجاز',
        tags=['pricing'],
        parameters=[
            OpenApiParameter(
                name='official_price',
                description='قیمت مصوب (ریال)',
                required=True,
                type=float
            ),
        ],
        responses={200: PriceRangeSerializer}
    )
    def get(self, request) -> Response:
        price_str = request.query_params.get('official_price')
        if not price_str:
            return Response(
                {
                    'success': False,
                    'message': 'قیمت مصوب الزامی است'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            official_price = Decimal(price_str)
        except Exception:
            return Response(
                {
                    'success': False,
                    'message': 'قیمت وارد شده معتبر نیست'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        validator = PriceValidatorService()
        price_range = validator.calculate_price_range(official_price)

        return Response({
            'success': True,
            'data': price_range
        })