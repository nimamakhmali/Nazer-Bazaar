from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema

from apps.common.choices import UserRole
from apps.common.exceptions import ResourceNotFoundError
from apps.complaints.selectors import ComplaintSelector
from apps.complaints.services import ComplaintService
from apps.complaints.serializers import (
    ComplaintCreateSerializer,
    ComplaintListSerializer,
    ComplaintDetailSerializer,
)
from apps.complaints.permissions import IsComplaintOwnerOrManager

class ComplaintListCreateView(APIView):
    """
    POST /api/v1/complaints/     ← ثبت شکایت جدید (فقط مشتریان)
    GET  /api/v1/complaints/     ← مشاهده لیست شکایات (فقط مدیران)
    """
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            # فقط مشتریان می‌توانند شکایت ثبت کنند
            return [IsAuthenticated()]
        # TODO: Add manager permission for GET
        return [IsAuthenticated()] 

    @extend_schema(summary="ثبت شکایت", tags=['complaints'], request=ComplaintCreateSerializer, responses={201: ComplaintDetailSerializer})
    def post(self, request):
        if request.user.role != UserRole.CUSTOMER:
            return Response({"detail": "فقط مشتریان می‌توانند شکایت ثبت کنند."}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ComplaintCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        service = ComplaintService()
        complaint = service.create(
            customer_id=request.user.id,
            **serializer.validated_data
        )
        
        return Response(
            ComplaintDetailSerializer(complaint).data,
            status=status.HTTP_201_CREATED
        )

class MyComplaintsView(APIView):
    """
    GET /api/v1/complaints/my/
    مشاهده لیست شکایات کاربر لاگین کرده
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="شکایات من", tags=['complaints'], responses={200: ComplaintListSerializer(many=True)})
    def get(self, request):
        complaints = ComplaintSelector.get_by_customer(request.user.id)
        serializer = ComplaintListSerializer(complaints, many=True)
        return Response(serializer.data)

class ComplaintDetailView(APIView):
    """
    GET /api/v1/complaints/{uuid}/
    مشاهده جزئیات یک شکایت
    """
    permission_classes = [IsComplaintOwnerOrManager]

    @extend_schema(summary="جزئیات شکایت", tags=['complaints'], responses={200: ComplaintDetailSerializer})
    def get(self, request, uuid):
        complaint = ComplaintSelector.get_by_uuid(uuid)
        if not complaint:
            raise ResourceNotFoundError("شکایت مورد نظر یافت نشد.")
        
        self.check_object_permissions(request, complaint)
        serializer = ComplaintDetailSerializer(complaint)
        return Response(serializer.data)
        
class ComplaintTrackView(APIView):
    """
    GET /api/v1/complaints/track/{uuid}/
    رهگیری عمومی شکایت با کد UUID
    """
    permission_classes = [AllowAny]

    @extend_schema(summary="رهگیری عمومی شکایت", tags=['complaints'], responses={200: ComplaintListSerializer})
    def get(self, request, uuid):
        complaint = ComplaintSelector.get_by_uuid(uuid)
        if not complaint:
            raise ResourceNotFoundError("شکایت با این کد رهگیری یافت نشد.")
        
        # نمایش اطلاعات محدود برای رهگیری عمومی
        serializer = ComplaintListSerializer(complaint)
        return Response(serializer.data)