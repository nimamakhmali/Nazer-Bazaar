"""
Products API URLs
"""
from django.urls import path
from apps.products.views import (
    ProductCategoryListCreateView,
    ProductCategoryDetailView,
    ProductUnitListView,
    ProductListCreateView,
    ProductDetailView,
    ProductImageUploadView,
    ProductImportView,
    ProductImportTemplateView,
    ProductExportView,
)

app_name = 'products_api'

urlpatterns = [
    # ─── Units ──────────────────────────────────────────────────────────────
    path(
        'units/',
        ProductUnitListView.as_view(),
        name='unit-list'
    ),

    # ─── Categories ─────────────────────────────────────────────────────────
    path(
        'categories/',
        ProductCategoryListCreateView.as_view(),
        name='category-list-create'
    ),
    path(
        'categories/<int:category_id>/',
        ProductCategoryDetailView.as_view(),
        name='category-detail'
    ),

    # ─── Import/Export ───────────────────────────────────────────────────────
    path(
        'import/',
        ProductImportView.as_view(),
        name='product-import'
    ),
    path(
        'import/template/',
        ProductImportTemplateView.as_view(),
        name='product-import-template'
    ),
    path(
        'export/',
        ProductExportView.as_view(),
        name='product-export'
    ),

    # ─── Products ────────────────────────────────────────────────────────────
    path(
        '',
        ProductListCreateView.as_view(),
        name='product-list-create'
    ),
    path(
        '<int:product_id>/',
        ProductDetailView.as_view(),
        name='product-detail'
    ),
    path(
        '<int:product_id>/upload-image/',
        ProductImageUploadView.as_view(),
        name='product-upload-image'
    ),
]