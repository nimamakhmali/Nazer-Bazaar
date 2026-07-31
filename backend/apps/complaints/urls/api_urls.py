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
    
    # ✅ FIX: تغییر از <uuid:uuid> به <str:identifier>
    path('track/<str:identifier>/', ComplaintTrackView.as_view(), name='complaint-track'),
    
    # Detail با UUID
    path('<uuid:uuid>/', ComplaintDetailView.as_view(), name='complaint-detail'),
]