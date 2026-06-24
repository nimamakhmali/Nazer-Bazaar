"""
Pricing API URLs
"""
from django.urls import path
from apps.pricing.views import (
    OfficialPriceListCreateView,
    OfficialPriceDetailView,
    OfficialPriceDeactivateView,
    BulkOfficialPriceView,
    TodayOfficialPricesView,
    PriceRangeCheckView,
    StorePriceSetView,
    BulkStorePriceView,
    StorePriceDetailView,
    StoreTodayPricesView,
    PriceComparisonView,
    OverpricedStoresView,
    PriceStatsView,
    PriceHistoryView,
)

app_name = 'pricing_api'

urlpatterns = [
    # ─── Official Prices ────────────────────────────────────────────────────
    path(
        'official-prices/',
        OfficialPriceListCreateView.as_view(),
        name='official-price-list-create'
    ),
    path(
        'official-prices/bulk/',
        BulkOfficialPriceView.as_view(),
        name='official-price-bulk'
    ),
    path(
        'official-prices/today/',
        TodayOfficialPricesView.as_view(),
        name='official-price-today'
    ),
    path(
        'official-prices/<int:price_id>/',
        OfficialPriceDetailView.as_view(),
        name='official-price-detail'
    ),
    path(
        'official-prices/<int:price_id>/deactivate/',
        OfficialPriceDeactivateView.as_view(),
        name='official-price-deactivate'
    ),

    # ─── Store Prices ────────────────────────────────────────────────────────
    path(
        'store-prices/set/',
        StorePriceSetView.as_view(),
        name='store-price-set'
    ),
    path(
        'store-prices/bulk/',
        BulkStorePriceView.as_view(),
        name='store-price-bulk'
    ),
    path(
        'store-prices/today/',
        StoreTodayPricesView.as_view(),
        name='store-price-today'
    ),
    path(
        'store-prices/<int:price_id>/',
        StorePriceDetailView.as_view(),
        name='store-price-detail'
    ),

    # ─── Public / Comparison ────────────────────────────────────────────────
    path(
        'compare/',
        PriceComparisonView.as_view(),
        name='price-comparison'
    ),
    path(
        'overpriced/',
        OverpricedStoresView.as_view(),
        name='overpriced-stores'
    ),
    path(
        'stats/',
        PriceStatsView.as_view(),
        name='price-stats'
    ),
    path(
        'price-range/',
        PriceRangeCheckView.as_view(),
        name='price-range-check'
    ),
    path(
        'history/',
        PriceHistoryView.as_view(),
        name='price-history'
    ),
]