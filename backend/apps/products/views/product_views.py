"""
Product Views
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.common.exceptions import ResourceNotFoundError
from apps.common.pagination import StandardResultsPagination
from apps.products.selectors import ProductSelector, ProductUnitSelector
from apps.products.services import ProductService
from apps.products.serializers import (
    ProductUnitSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateSerializer,
    ProductUpdateSerializer,
)
from apps.products.permissions import CanManageProduct


class ProductUnitListView(APIView):
    """
    GET /api/v1/products/units/
    لیست واحدهای اندازه‌گیری
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary='لیست واحدهای اندازه‌گیری',
        tags=['products'],
        responses={200: ProductUnitSerializer(many=True)}
    )
    def get(self, request) -> Response:
        units = ProductUnitSelector.get_all_active()
        serializer = ProductUnitSerializer(units, many=True)
        return Response({'success': True, 'data': serializer.data})


class ProductListCreateView(APIView):
    """
    GET  /api/v1/products/
    POST /api/v1/products/
    """
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [CanManageProduct()]

    @extend_schema(
        summary='لیست محصولات',
        tags=['products'],
        parameters=[
            OpenApiParameter(
                name='category',
                description='فیلتر بر اساس دسته‌بندی',
                required=False,
                type=int
            ),
            OpenApiParameter(
                name='featured',
                description='فقط محصولات ویژه',
                required=False,
                type=bool
            ),
            OpenApiParameter(
                name='search',
                description='جستجو در نام، برند یا بارکد',
                required=False,
                type=str
            ),
        ],
        responses={200: ProductListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        category_id = request.query_params.get('category')
        featured = request.query_params.get('featured')
        search = request.query_params.get('search')

        if category_id:
            include_children = request.query_params.get(
                'include_children', 'true'
            ).lower() == 'true'
            products = ProductSelector.get_by_category(
                int(category_id),
                include_children=include_children
            )
        elif featured:
            products = ProductSelector.get_featured()
        elif search:
            products = ProductSelector.search(search)
        else:
            products = ProductSelector.get_all_active()

        paginator = StandardResultsPagination()
        paginated = paginator.paginate_queryset(products, request)
        serializer = ProductListSerializer(paginated, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary='ایجاد محصول',
        tags=['products'],
        request=ProductCreateSerializer,
        responses={201: ProductDetailSerializer}
    )
    def post(self, request) -> Response:
        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ProductService()
        product = service.create(
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response(
            {
                'success': True,
                'message': 'محصول با موفقیت ایجاد شد',
                'data': ProductDetailSerializer(product).data
            },
            status=status.HTTP_201_CREATED
        )


class ProductDetailView(APIView):
    """
    GET   /api/v1/products/{id}/
    PATCH /api/v1/products/{id}/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [CanManageProduct()]

    def _get_product(self, product_id: int):
        product = ProductSelector.get_by_id(product_id)
        if not product:
            raise ResourceNotFoundError('محصول مورد نظر یافت نشد')
        return product

    @extend_schema(
        summary='جزئیات محصول',
        tags=['products'],
        responses={200: ProductDetailSerializer}
    )
    def get(self, request, product_id: int) -> Response:
        product = self._get_product(product_id)
        return Response({
            'success': True,
            'data': ProductDetailSerializer(product).data
        })

    @extend_schema(
        summary='ویرایش محصول',
        tags=['products'],
        request=ProductUpdateSerializer,
        responses={200: ProductDetailSerializer}
    )
    def patch(self, request, product_id: int) -> Response:
        self._get_product(product_id)
        serializer = ProductUpdateSerializer(
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        service = ProductService()
        updated = service.update(
            product_id=product_id,
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response({
            'success': True,
            'message': 'محصول با موفقیت ویرایش شد',
            'data': ProductDetailSerializer(updated).data
        })


class ProductImageUploadView(APIView):
    """
    POST /api/v1/products/{id}/upload-image/
    """
    permission_classes = [CanManageProduct]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        summary='آپلود تصویر محصول',
        tags=['products'],
        responses={200: ProductDetailSerializer}
    )
    def post(self, request, product_id: int) -> Response:
        if 'image' not in request.FILES:
            return Response(
                {
                    'success': False,
                    'message': 'فایل تصویر ارسال نشده است'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        service = ProductService()
        product = service.upload_image(
            product_id=product_id,
            image=request.FILES['image'],
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'تصویر با موفقیت آپلود شد',
            'data': ProductDetailSerializer(product).data
        })