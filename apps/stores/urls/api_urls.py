"""
Stores API URLs
"""
from django.urls import path
from apps.stores.views import (
    StoreListCreateView,
    StoreDetailView,
    StoreApproveView,
    StoreRejectView,
    StoreSuspendView,
    StoreReactivateView,
    MyStoresView,
    PendingStoresView,
    StoreDocumentListView,
    StoreDocumentDetailView,
    StoreDocumentVerifyView,
    StoreLicenseView,
)

app_name = 'stores_api'

urlpatterns = [
    # ─── Store ──────────────────────────────────────────────────────────────
    path(
        '',
        StoreListCreateView.as_view(),
        name='store-list-create'
    ),
    path(
        'my-stores/',
        MyStoresView.as_view(),
        name='my-stores'
    ),
    path(
        'pending/',
        PendingStoresView.as_view(),
        name='store-pending'
    ),
    path(
        '<int:store_id>/',
        StoreDetailView.as_view(),
        name='store-detail'
    ),
    path(
        '<int:store_id>/approve/',
        StoreApproveView.as_view(),
        name='store-approve'
    ),
    path(
        '<int:store_id>/reject/',
        StoreRejectView.as_view(),
        name='store-reject'
    ),
    path(
        '<int:store_id>/suspend/',
        StoreSuspendView.as_view(),
        name='store-suspend'
    ),
    path(
        '<int:store_id>/reactivate/',
        StoreReactivateView.as_view(),
        name='store-reactivate'
    ),

    # ─── Documents ──────────────────────────────────────────────────────────
    path(
        '<int:store_id>/documents/',
        StoreDocumentListView.as_view(),
        name='store-document-list'
    ),
    path(
        'documents/<int:document_id>/',
        StoreDocumentDetailView.as_view(),
        name='store-document-detail'
    ),
    path(
        'documents/<int:document_id>/verify/',
        StoreDocumentVerifyView.as_view(),
        name='store-document-verify'
    ),

    # ─── License ────────────────────────────────────────────────────────────
    path(
        '<int:store_id>/license/',
        StoreLicenseView.as_view(),
        name='store-license'
    ),
]