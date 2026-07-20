from django.urls import path
from ..views.report_views import OverpricingReportView

app_name = 'reports_api'

urlpatterns = [
    path('overpricing/', OverpricingReportView.as_view(), name='report-overpricing'),
]