"""
Store Views - API endpoints مربوط به فروشگاه
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.common.permissions import IsAdminUser
from apps.common.exceptions import ResourceNotFoundError
from apps.common.pagination import StandardResultsPagination

from apps.stores.selectors import StoreSelector
from apps.stores.services import StoreService
from apps.stores.serializers import (
    StoreListSerializer,
    StoreDetailSerializer,
    StoreRegisterSerializer,
    StoreUpdateSerializer,
    StoreStatusChangeSerializer,
)
from apps.stores.permissions import (
    CanManageStore,
    CanApproveStore,
    CanViewStoreDetails,
)


class StoreListCreateView(APIView):
    """
    GET  /api/v1/stores/           ← لیست فروشگاه‌های عمومی
    POST /api/v1/stores/           ← ثبت فروشگاه جدید
    """
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [CanManageStore()]

    @extend_schema(
        summary='لیست فروشگاه‌ها',
        tags=['stores'],
        parameters=[
            OpenApiParameter(
                name='union',
                description='فیلتر بر اساس اتحادیه',
                required=False,
                type=int
            ),
            OpenApiParameter(
                name='city',
                description='فیلتر بر اساس شهر',
                required=False,
                type=int
            ),
            OpenApiParameter(
                name='province',
                description='فیلتر بر اساس استان',
                required=False,
                type=int
            ),
            OpenApiParameter(
                name='search',
                description='جستجو در نام یا آدرس',
                required=False,
                type=str
            ),
        ],
        responses={200: StoreListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        union_id = request.query_params.get('union')
        city_id = request.query_params.get('city')
        province_id = request.query_params.get('province')
        search = request.query_params.get('search')

        if union_id:
            stores = StoreSelector.get_by_union_active(int(union_id))
        elif city_id:
            stores = StoreSelector.get_by_city(int(city_id))
        elif province_id:
            stores = StoreSelector.get_by_province(int(province_id))
        elif search:
            stores = StoreSelector.search(
                query=search,
                city_id=int(city_id) if city_id else None,
                union_id=int(union_id) if union_id else None,
            )
        else:
            stores = StoreSelector.get_all_active()

        paginator = StandardResultsPagination()
        paginated = paginator.paginate_queryset(stores, request)
        serializer = StoreListSerializer(paginated, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary='ثبت فروشگاه جدید',
        tags=['stores'],
        request=StoreRegisterSerializer,
        responses={201: StoreDetailSerializer}
    )
    def post(self, request) -> Response:
        serializer = StoreRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = StoreService()
        store = service.register(
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response(
            {
                'success': True,
                'message': (
                    'فروشگاه با موفقیت ثبت شد و '
                    'در انتظار تایید است'
                ),
                'data': StoreDetailSerializer(store).data
            },
            status=status.HTTP_201_CREATED
        )


class StoreDetailView(APIView):
    """
    GET   /api/v1/stores/{id}/   ← جزئیات فروشگاه
    PATCH /api/v1/stores/{id}/   ← ویرایش فروشگاه
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [CanManageStore()]

    def _get_store(self, store_id: int):
        store = StoreSelector.get_with_stats(store_id)
        if not store:
            raise ResourceNotFoundError('فروشگاه مورد نظر یافت نشد')
        return store

    @extend_schema(
        summary='جزئیات فروشگاه',
        tags=['stores'],
        responses={200: StoreDetailSerializer}
    )
    def get(self, request, store_id: int) -> Response:
        store = self._get_store(store_id)
        return Response({
            'success': True,
            'data': StoreDetailSerializer(store).data
        })

    @extend_schema(
        summary='ویرایش فروشگاه',
        tags=['stores'],
        request=StoreUpdateSerializer,
        responses={200: StoreDetailSerializer}
    )
    def patch(self, request, store_id: int) -> Response:
        self._get_store(store_id)
        serializer = StoreUpdateSerializer(
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        service = StoreService()
        updated = service.update(
            store_id=store_id,
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response({
            'success': True,
            'message': 'فروشگاه با موفقیت ویرایش شد',
            'data': StoreDetailSerializer(updated).data
        })


class StoreApproveView(APIView):
    """
    POST /api/v1/stores/{id}/approve/
    تایید فروشگاه
    """
    permission_classes = [CanApproveStore]

    @extend_schema(
        summary='تایید فروشگاه',
        tags=['stores'],
        responses={200: StoreDetailSerializer}
    )
    def post(self, request, store_id: int) -> Response:
        service = StoreService()
        store = service.approve(
            store_id=store_id,
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'فروشگاه با موفقیت تایید شد',
            'data': StoreDetailSerializer(store).data
        })


class StoreRejectView(APIView):
    """
    POST /api/v1/stores/{id}/reject/
    رد فروشگاه
    """
    permission_classes = [CanApproveStore]

    @extend_schema(
        summary='رد فروشگاه',
        tags=['stores'],
        request=StoreStatusChangeSerializer,
        responses={200: StoreDetailSerializer}
    )
    def post(self, request, store_id: int) -> Response:
        serializer = StoreStatusChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = StoreService()
        store = service.reject(
            store_id=store_id,
            reason=serializer.validated_data.get('reason', ''),
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'فروشگاه رد شد',
            'data': StoreDetailSerializer(store).data
        })


class StoreSuspendView(APIView):
    """
    POST /api/v1/stores/{id}/suspend/
    تعلیق فروشگاه
    """
    permission_classes = [CanApproveStore]

    @extend_schema(
        summary='تعلیق فروشگاه',
        tags=['stores'],
        request=StoreStatusChangeSerializer,
        responses={200: StoreDetailSerializer}
    )
    def post(self, request, store_id: int) -> Response:
        serializer = StoreStatusChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data.get('reason', '')
        if not reason:
            return Response(
                {
                    'success': False,
                    'message': 'دلیل تعلیق الزامی است'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        service = StoreService()
        store = service.suspend(
            store_id=store_id,
            reason=reason,
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'فروشگاه تعلیق شد',
            'data': StoreDetailSerializer(store).data
        })


class StoreReactivateView(APIView):
    """
    POST /api/v1/stores/{id}/reactivate/
    بازگرداندن فروشگاه تعلیق‌شده
    """
    permission_classes = [CanApproveStore]

    @extend_schema(
        summary='بازگرداندن فروشگاه',
        tags=['stores'],
        responses={200: StoreDetailSerializer}
    )
    def post(self, request, store_id: int) -> Response:
        service = StoreService()
        store = service.reactivate(
            store_id=store_id,
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'فروشگاه با موفقیت بازگردانده شد',
            'data': StoreDetailSerializer(store).data
        })


class MyStoresView(APIView):
    """
    GET /api/v1/stores/my-stores/
    فروشگاه‌های صاحب فروشگاه جاری
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='فروشگاه‌های من',
        tags=['stores'],
        responses={200: StoreListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        stores = StoreSelector.get_by_owner(request.user.id)
        serializer = StoreListSerializer(stores, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })


class PendingStoresView(APIView):
    """
    GET /api/v1/stores/pending/
    فروشگاه‌های در انتظار تایید
    """
    permission_classes = [CanApproveStore]

    @extend_schema(
        summary='فروشگاه‌های در انتظار تایید',
        tags=['stores'],
        parameters=[
            OpenApiParameter(
                name='union',
                description='فیلتر بر اساس اتحادیه',
                required=False,
                type=int
            ),
        ],
        responses={200: StoreListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        union_id = request.query_params.get('union')

        if union_id:
            stores = StoreSelector.get_pending_by_union(int(union_id))
        else:
            stores = StoreSelector.get_pending_approval()

        paginator = StandardResultsPagination()
        paginated = paginator.paginate_queryset(stores, request)
        serializer = StoreListSerializer(paginated, many=True)
        return paginator.get_paginated_response(serializer.data)