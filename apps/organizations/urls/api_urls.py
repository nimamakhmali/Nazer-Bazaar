"""
Organizations API URLs
"""
from django.urls import path
from apps.organizations.views import (
    ProvinceOfficeListCreateView,
    ProvinceOfficeDetailView,
    ProvinceOfficeAssignManagerView,
    ChamberListCreateView,
    ChamberDetailView,
    ChamberUnionsView,
    ChamberAssignManagerView,
    UnionListCreateView,
    UnionDetailView,
    UnionToggleActiveView,
    UnionAssignManagerView,
)

app_name = 'organizations_api'

urlpatterns = [
    # ─── ProvinceOffice ──────────────────────────────────────────────────────
    path(
        'province-offices/',
        ProvinceOfficeListCreateView.as_view(),
        name='province-office-list-create'
    ),
    path(
        'province-offices/<int:office_id>/',
        ProvinceOfficeDetailView.as_view(),
        name='province-office-detail'
    ),
    path(
        'province-offices/<int:office_id>/assign-manager/',
        ProvinceOfficeAssignManagerView.as_view(),
        name='province-office-assign-manager'
    ),

    # ─── Chamber ─────────────────────────────────────────────────────────────
    path(
        'chambers/',
        ChamberListCreateView.as_view(),
        name='chamber-list-create'
    ),
    path(
        'chambers/<int:chamber_id>/',
        ChamberDetailView.as_view(),
        name='chamber-detail'
    ),
    path(
        'chambers/<int:chamber_id>/unions/',
        ChamberUnionsView.as_view(),
        name='chamber-unions'
    ),
    path(
        'chambers/<int:chamber_id>/assign-manager/',
        ChamberAssignManagerView.as_view(),
        name='chamber-assign-manager'
    ),

    # ─── Union ───────────────────────────────────────────────────────────────
    path(
        'unions/',
        UnionListCreateView.as_view(),
        name='union-list-create'
    ),
    path(
        'unions/<int:union_id>/',
        UnionDetailView.as_view(),
        name='union-detail'
    ),
    path(
        'unions/<int:union_id>/toggle-active/',
        UnionToggleActiveView.as_view(),
        name='union-toggle-active'
    ),
    path(
        'unions/<int:union_id>/assign-manager/',
        UnionAssignManagerView.as_view(),
        name='union-assign-manager'
    ),
]