from django.http import HttpResponse
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .services.report_services import ReportService

class OverpricingReportView(APIView):
    permission_classes = [IsAuthenticated] # TODO: Add more specific permission

    def get(self, request):
        union_id = request.query_params.get('union_id')
        date_str = request.query_params.get('date', datetime.today().strftime('%Y-%m-%d'))
        
        if not union_id:
            return HttpResponse("شناسه اتحادیه الزامی است.", status=400)
            
        report_date = datetime.strptime(date_str, '%Y-%m-%d').date()

        service = ReportService()
        file_bytes = service.generate_overpricing_report(
            union_id=int(union_id), date=report_date
        )
        
        response = HttpResponse(
            file_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="overpricing_{union_id}_{date_str}.xlsx"'
        return response