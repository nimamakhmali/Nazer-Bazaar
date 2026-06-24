"""
Import/Export Views
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema

from apps.products.services import ProductImportService
from apps.products.serializers import ProductImportSerializer
from apps.products.permissions import CanImportProducts


class ProductImportView(APIView):
    """
    POST /api/v1/products/import/
    ورود انبوه محصولات از Excel
    """
    permission_classes = [CanImportProducts]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        summary='ورود محصولات از Excel',
        tags=['products'],
        request=ProductImportSerializer,
    )
    def post(self, request) -> Response:
        serializer = ProductImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ProductImportService()
        result = service.import_from_excel(
            file=serializer.validated_data['file'],
            update_existing=serializer.validated_data.get(
                'update_existing', False
            ),
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'عملیات import انجام شد',
            'data': {
                'total_rows': result.total_rows,
                'created': result.created_count,
                'updated': result.updated_count,
                'skipped': result.skipped_count,
                'has_errors': result.has_errors,
                'errors': result.error_rows[:20],
            }
        })


class ProductImportTemplateView(APIView):
    """
    GET /api/v1/products/import/template/
    دانلود قالب Excel برای import
    """
    permission_classes = [CanImportProducts]

    @extend_schema(
        summary='دانلود قالب Excel',
        tags=['products'],
    )
    def get(self, request) -> HttpResponse:
        from apps.products.imports.excel_handler import (
            generate_import_template
        )
        content = generate_import_template()

        response = HttpResponse(
            content,
            content_type=(
                'application/vnd.openxmlformats-officedocument'
                '.spreadsheetml.sheet'
            )
        )
        response['Content-Disposition'] = (
            'attachment; filename="products_import_template.xlsx"'
        )
        return response


class ProductExportView(APIView):
    """
    GET /api/v1/products/export/
    خروجی Excel لیست محصولات
    """
    permission_classes = [CanImportProducts]

    @extend_schema(
        summary='خروجی Excel محصولات',
        tags=['products'],
    )
    def get(self, request) -> HttpResponse:
        from apps.products.exports.product_export import (
            export_products_to_excel
        )
        category_id = request.query_params.get('category')
        content = export_products_to_excel(
            category_id=int(category_id) if category_id else None
        )

        response = HttpResponse(
            content,
            content_type=(
                'application/vnd.openxmlformats-officedocument'
                '.spreadsheetml.sheet'
            )
        )
        response['Content-Disposition'] = (
            'attachment; filename="products_export.xlsx"'
        )
        return response