from django.urls import path
from apps.complaints.views import (
    ComplaintListCreateView,
    MyComplaintsView,
    ComplaintDetailView,
    ComplaintTrackView,
)

app_name = 'complaints_api'

urlpatterns = [
    path('', ComplaintListCreateView.as_view(), name='complaint-list-create'),
    path('my/', MyComplaintsView.as_view(), name='my-complaints'),
    path('track/<uuid:uuid>/', ComplaintTrackView.as_view(), name='complaint-track'),
    path('<uuid:uuid>/', ComplaintDetailView.as_view(), name='complaint-detail'),
]