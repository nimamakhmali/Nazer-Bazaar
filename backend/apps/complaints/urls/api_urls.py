from django.urls import path
from apps.complaints.views import (
    ComplaintListCreateView,
    MyComplaintsView,
    ComplaintDetailView,
    ComplaintTrackView,
    ComplaintStatusChangeView,
)

app_name = 'complaints_api'

urlpatterns = [
    path('', ComplaintListCreateView.as_view(), name='complaint-list-create'),
    path('my/', MyComplaintsView.as_view(), name='my-complaints'),

    path('track/<str:identifier>/', ComplaintTrackView.as_view(), name='complaint-track'),

    # ✅ NEW
    path('<uuid:uuid>/status/', ComplaintStatusChangeView.as_view(), name='complaint-status-change'),

    path('<uuid:uuid>/', ComplaintDetailView.as_view(), name='complaint-detail'),
]