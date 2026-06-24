"""
Category Views
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema

from apps.common.exceptions import ResourceNotFoundError
from apps.common.pagination import StandardResultsPagination
from apps.products.selectors import ProductCategorySelector
from apps.products.services import ProductCategoryService
from apps.products.serializers import (
    ProductCategoryListSerializer,
    ProductCategoryDetailSerializer,
    ProductCategoryCreateSerializer,
    ProductCategoryUpdateSerializer,
)
from apps.products.permissions import CanManageProduct


class ProductCategoryListCreateView(APIView):
    """
    GET  /api/v1/products/categories/
    POST /api/v1/products/categories/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [CanManageProduct()]

    @extend_schema(
        summary='لیست دسته‌بندی‌های محصول',
        tags=['products'],
        responses={200: ProductCategoryListSerializer(many=True)}
    )
    def get(self, request) -> Response:
        only_root = request.query_params.get('root', False)

        if only_root:
            categories = ProductCategorySelector.get_root_categories()
        else:
            categories = ProductCategorySelector.get_all_active()

        serializer = ProductCategoryListSerializer(
            categories,
            many=True
        )
        return Response({'success': True, 'data': serializer.data})

    @extend_schema(
        summary='ایجاد دسته‌بندی',
        tags=['products'],
        request=ProductCategoryCreateSerializer,
        responses={201: ProductCategoryDetailSerializer}
    )
    def post(self, request) -> Response:
        serializer = ProductCategoryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ProductCategoryService()
        category = service.create(
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response(
            {
                'success': True,
                'message': 'دسته‌بندی با موفقیت ایجاد شد',
                'data': ProductCategoryDetailSerializer(category).data
            },
            status=status.HTTP_201_CREATED
        )


class ProductCategoryDetailView(APIView):
    """
    GET   /api/v1/products/categories/{id}/
    PATCH /api/v1/products/categories/{id}/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [CanManageProduct()]

    def _get_category(self, category_id: int):
        category = ProductCategorySelector.get_by_id(category_id)
        if not category:
            raise ResourceNotFoundError(
                'دسته‌بندی مورد نظر یافت نشد'
            )
        return category

    @extend_schema(
        summary='جزئیات دسته‌بندی',
        tags=['products'],
        responses={200: ProductCategoryDetailSerializer}
    )
    def get(self, request, category_id: int) -> Response:
        category = self._get_category(category_id)
        return Response({
            'success': True,
            'data': ProductCategoryDetailSerializer(category).data
        })

    @extend_schema(
        summary='ویرایش دسته‌بندی',
        tags=['products'],
        request=ProductCategoryUpdateSerializer,
        responses={200: ProductCategoryDetailSerializer}
    )
    def patch(self, request, category_id: int) -> Response:
        self._get_category(category_id)
        serializer = ProductCategoryUpdateSerializer(
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        service = ProductCategoryService()
        updated = service.update(
            category_id=category_id,
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response({
            'success': True,
            'message': 'دسته‌بندی با موفقیت ویرایش شد',
            'data': ProductCategoryDetailSerializer(updated).data
        })