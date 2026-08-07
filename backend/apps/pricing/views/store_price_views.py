"""
Store Price Views
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.common.exceptions import ResourceNotFoundError
from apps.common.pagination import StandardResultsPagination

from apps.pricing.models import PriceHistory

from apps.pricing.selectors import (
    StorePriceSelector,
    PriceHistorySelector,
)
from apps.pricing.services import (
    StorePriceService,
    PriceValidatorService,
)
from apps.pricing.serializers import (
    StorePriceListSerializer,
    StorePriceDetailSerializer,
    StorePriceSetSerializer,
    BulkStorePriceSerializer,
    PriceComparisonSerializer,
    PriceHistorySerializer,
    PriceStatsSerializer,
)
from apps.pricing.permissions import (
    CanSetStorePrice,
    CanViewPriceHistory,
)


class StorePriceSetView(APIView):
    """
    POST /api/v1/pricing/store-prices/set/
    ثبت یا بروزرسانی قیمت فروشگاه
    """
    permission_classes = [CanSetStorePrice]

    @extend_schema(
        summary='ثبت قیمت فروشگاه',
        tags=['pricing'],
        request=StorePriceSetSerializer,
        responses={201: StorePriceDetailSerializer}
    )
    def post(self, request) -> Response:
        serializer = StorePriceSetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = StorePriceService()
        store_price = service.set_price(
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response(
            {
                'success': True,
                'message': 'قیمت با موفقیت ثبت شد',
                'data': StorePriceDetailSerializer(store_price).data
            },
            status=status.HTTP_201_CREATED
        )


class BulkStorePriceView(APIView):
    """
    POST /api/v1/pricing/store-prices/bulk/
    ثبت انبوه قیمت‌های فروشگاه
    """
    permission_classes = [CanSetStorePrice]

    @extend_schema(
        summary='ثبت انبوه قیمت‌های فروشگاه',
        tags=['pricing'],
        request=BulkStorePriceSerializer,
    )
    def post(self, request) -> Response:
        serializer = BulkStorePriceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = StorePriceService()
        result = service.bulk_set_prices(
            store_id=serializer.validated_data['store_id'],
            prices=serializer.validated_data['prices'],
            price_date=serializer.validated_data.get('price_date'),
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'عملیات ثبت انبوه انجام شد',
            'data': result
        })


class StorePriceDetailView(APIView):
    """
    GET /api/v1/pricing/store-prices/{id}/
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='جزئیات قیمت فروشگاه',
        tags=['pricing'],
        responses={200: StorePriceDetailSerializer}
    )
    def get(self, request, price_id: int) -> Response:
        store_price = StorePriceSelector.get_by_id(price_id)
        if not store_price:
            raise ResourceNotFoundError('قیمت مورد نظر یافت نشد')
        return Response({
            'success': True,
            'data': StorePriceDetailSerializer(store_price).data
        })


class StoreTodayPricesView(APIView):
    """
    GET /api/v1/pricing/store-prices/today/
    قیمت‌های امروز یک فروشگاه
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='قیمت‌های امروز فروشگاه',
        tags=['pricing'],
        parameters=[
            OpenApiParameter(
                name='store',
                description='شناسه فروشگاه (اجباری)',
                required=True,
                type=int
            ),
        ],
        responses={200: StorePriceListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        store_id = request.query_params.get('store')
        if not store_id:
            return Response(
                {
                    'success': False,
                    'message': 'شناسه فروشگاه الزامی است'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        prices = StorePriceSelector.get_today_prices_for_store(
            store_id=int(store_id)
        )
        serializer = StorePriceListSerializer(prices, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })


class PriceComparisonView(APIView):
    """
    GET /api/v1/pricing/compare/
    مقایسه قیمت یک محصول در فروشگاه‌های مختلف

    این endpoint برای مردم/مشتریان است.
    نمایش قیمت‌های مختلف یک محصول در یک شهر.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary='مقایسه قیمت محصول در فروشگاه‌های مختلف',
        tags=['pricing'],
        parameters=[
            OpenApiParameter(
                name='product',
                description='شناسه محصول (اجباری)',
                required=True,
                type=int
            ),
            OpenApiParameter(
                name='city',
                description='شناسه شهر (اجباری)',
                required=True,
                type=int
            ),
        ],
        responses={200: PriceComparisonSerializer(many=True)}
    )
    def get(self, request) -> Response:
        product_id = request.query_params.get('product')
        city_id = request.query_params.get('city')

        if not product_id or not city_id:
            return Response(
                {
                    'success': False,
                    'message': 'شناسه محصول و شهر الزامی است'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        prices = StorePriceSelector.get_price_comparison(
            product_id=int(product_id),
            city_id=int(city_id)
        )
        serializer = PriceComparisonSerializer(prices, many=True)

        return Response({
            'success': True,
            'data': serializer.data
        })


class OverpricedStoresView(APIView):
    """
    GET /api/v1/pricing/overpriced/
    فروشگاه‌های گران‌فروش امروز
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='فروشگاه‌های گران‌فروش',
        tags=['pricing'],
        parameters=[
            OpenApiParameter(
                name='union',
                description='فیلتر بر اساس اتحادیه',
                required=False,
                type=int
            ),
        ],
        responses={200: StorePriceListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        union_id = request.query_params.get('union')

        prices = StorePriceSelector.get_overpriced_today(
            union_id=int(union_id) if union_id else None
        )
        serializer = StorePriceListSerializer(prices, many=True)

        return Response({
            'success': True,
            'data': serializer.data
        })


class PriceStatsView(APIView):
    """
    GET /api/v1/pricing/stats/
    آمار قیمت‌های یک محصول در اتحادیه
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary='آمار قیمت محصول',
        tags=['pricing'],
        parameters=[
            OpenApiParameter(
                name='product',
                description='شناسه محصول',
                required=True,
                type=int
            ),
            OpenApiParameter(
                name='union',
                description='شناسه اتحادیه',
                required=True,
                type=int
            ),
        ],
        responses={200: PriceStatsSerializer}
    )
    def get(self, request) -> Response:
        product_id = request.query_params.get('product')
        union_id = request.query_params.get('union')

        if not product_id or not union_id:
            return Response(
                {
                    'success': False,
                    'message': 'شناسه محصول و اتحادیه الزامی است'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        stats = StorePriceSelector.get_price_stats(
            product_id=int(product_id),
            union_id=int(union_id)
        )
        serializer = PriceStatsSerializer(stats)

        return Response({
            'success': True,
            'data': serializer.data
        })


# apps/pricing/views/store_price_views.py
# فقط PriceHistoryView را جایگزین کن

class PriceHistoryView(APIView):
    """
    GET /api/v1/pricing/history/
    تاریخچه قیمت‌ها
    """
    permission_classes = [CanViewPriceHistory]

    @extend_schema(
        summary='تاریخچه قیمت‌ها',
        tags=['pricing'],
        parameters=[
            OpenApiParameter(
                name='product',
                description='فیلتر بر اساس محصول',
                required=False,
                type=int
            ),
            OpenApiParameter(
                name='store',
                description='فیلتر بر اساس فروشگاه',
                required=False,
                type=int
            ),
            OpenApiParameter(
                name='union',
                description='فیلتر بر اساس اتحادیه',
                required=False,
                type=int
            ),
        ],
        responses={200: PriceHistorySerializer(many=True)}
    )
    def get(self, request) -> Response:
        product_id = request.query_params.get('product')
        store_id   = request.query_params.get('store')
        union_id   = request.query_params.get('union')

        if product_id:
            history = PriceHistorySelector.get_by_product(int(product_id))
        elif store_id:
            history = PriceHistorySelector.get_by_store(int(store_id))
        elif union_id:
            history = PriceHistorySelector.get_by_union(int(union_id))
        else:
            # اگر هیچ فیلتری نبود — برای union_manager خودش را برگردان
            user = request.user
            if hasattr(user, 'role') and user.role == 'union_manager':
                try:
                    from apps.organizations.models import Union
                    union = Union.objects.filter(
                        manager=user, is_active=True
                    ).first()
                    if union:
                        history = PriceHistorySelector.get_by_union(union.id)
                    else:
                        history = PriceHistory.objects.none()
                except Exception:
                    history = PriceHistory.objects.none()
            else:
                return Response(
                    {
                        'success': False,
                        'message': 'شناسه محصول، فروشگاه یا اتحادیه الزامی است'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        paginator = StandardResultsPagination()
        paginated = paginator.paginate_queryset(history, request)
        serializer = PriceHistorySerializer(paginated, many=True)
        return paginator.get_paginated_response(serializer.data)