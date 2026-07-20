"""
Geography API URLs
"""
from django.urls import path
from apps.geography.views import (
    ProvinceListCreateView,
    ProvinceDetailView,
    ProvinceWithCitiesView,
    CityListCreateView,
    CityDetailView,
)

app_name = 'geography'

urlpatterns = [
    # ─── Province ───────────────────────────────────────────────────────────
    path(
        'provinces/',
        ProvinceListCreateView.as_view(),
        name='province-list-create'
    ),
    path(
        'provinces/<int:province_id>/',
        ProvinceDetailView.as_view(),
        name='province-detail'
    ),
    path(
        'provinces/<int:province_id>/cities/',
        ProvinceWithCitiesView.as_view(),
        name='province-cities'
    ),

    # ─── City ───────────────────────────────────────────────────────────────
    path(
        'cities/',
        CityListCreateView.as_view(),
        name='city-list-create'
    ),
    path(
        'cities/<int:city_id>/',
        CityDetailView.as_view(),
        name='city-detail'
    ),
]