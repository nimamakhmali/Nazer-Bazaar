from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db.models import Q

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
import logging

logger = logging.getLogger(__name__)


class ComplaintListCreateView(APIView):
    """
    POST /api/v1/complaints/ ← ثبت شکایت جدید
    GET  /api/v1/complaints/ ← لیست شکایات (role-based)
    """
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    @extend_schema(
        summary="ثبت شکایت جدید", 
        tags=['complaints'], 
        request=ComplaintCreateSerializer, 
        responses={201: ComplaintDetailSerializer}
    )
    def post(self, request):
        serializer = ComplaintCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        service = ComplaintService()
        
        try:
            complaint = service.create(
                customer_id=request.user.id,
                store_id=serializer.validated_data['store'].id,
                product_id=serializer.validated_data['product'].id,
                title=serializer.validated_data['title'],
                description=serializer.validated_data['description'],
                price_reported=serializer.validated_data['price_reported'],
                price_proof=serializer.validated_data.get('price_proof', None)
            )
        except Exception as e:
            logger.error(f"Error creating complaint: {str(e)}", exc_info=True)
            return Response(
                {"detail": f"خطا در ثبت شکایت: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(
            ComplaintDetailSerializer(complaint).data,
            status=status.HTTP_201_CREATED
        )

    @extend_schema(
        summary="لیست شکایات (role-based)",
        tags=['complaints'],
        parameters=[
            OpenApiParameter(name='status', description='فیلتر وضعیت', type=str),
            OpenApiParameter(name='search', description='جستجو', type=str),
            OpenApiParameter(name='page', description='صفحه', type=int),
            OpenApiParameter(name='page_size', description='تعداد در صفحه', type=int),
        ],
        responses={200: ComplaintListSerializer(many=True)}
    )
    def get(self, request):
        """
        لیست شکایات بر اساس نقش کاربر:
        - admin: همه شکایات
        - province_manager: شکایات استان
        - chamber_manager: شکایات شهر (اتاق اصناف)
        - union_manager: شکایات اتحادیه
        - store_owner: شکایات فروشگاه‌های خودش
        - inspector: شکایات محول شده
        - customer: شکایات خودش
        """
        user = request.user
        
        # ✅ فیلتر role-based
        if user.role == UserRole.ADMIN:
            queryset = ComplaintSelector.get_all()
        
        elif user.role == UserRole.PROVINCE_MANAGER:
            # شکایات استانی که مدیرش این کاربر است
            try:
                from apps.organizations.models import ProvinceOffice
                office = ProvinceOffice.objects.filter(manager=user).first()
                if office:
                    queryset = ComplaintSelector.get_for_province(office.province_id)
                else:
                    queryset = ComplaintSelector.get_all().none()
            except:
                queryset = ComplaintSelector.get_all().none()
        
        elif user.role == UserRole.CHAMBER_MANAGER:
            # شکایات اتاق اصنافی که مدیرش این کاربر است
            try:
                from apps.organizations.models import Chamber
                chamber = Chamber.objects.filter(manager=user).first()
                if chamber:
                    queryset = ComplaintSelector.get_for_chamber(chamber.id)
                else:
                    queryset = ComplaintSelector.get_all().none()
            except:
                queryset = ComplaintSelector.get_all().none()
        
        elif user.role == UserRole.UNION_MANAGER:
            # شکایات اتحادیه‌ای که مدیرش این کاربر است
            try:
                from apps.organizations.models import Union
                union = Union.objects.filter(manager=user).first()
                if union:
                    queryset = ComplaintSelector.get_for_union(union.id)
                else:
                    queryset = ComplaintSelector.get_all().none()
            except:
                queryset = ComplaintSelector.get_all().none()
        
        elif user.role == UserRole.STORE_OWNER:
            # شکایات فروشگاه‌های این کاربر
            store_ids = user.owned_stores.values_list('id', flat=True)
            queryset = ComplaintSelector.get_all().filter(store_id__in=store_ids)
        
        elif user.role == UserRole.INSPECTOR:
            # شکایات محول شده به بازرس
            queryset = ComplaintSelector.get_all().filter(assigned_to=user)
        
        elif user.role == UserRole.CUSTOMER:
            queryset = ComplaintSelector.get_by_customer(user.id)
        
        else:
            queryset = ComplaintSelector.get_all().none()
        
        # ✅ فیلترهای اضافی
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(store__name__icontains=search) |
                Q(tracking_code__icontains=search)
            )
        
        # ✅ Pagination
        from apps.common.pagination import StandardResultsSetPagination
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = ComplaintListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = ComplaintListSerializer(queryset, many=True)
        return Response(serializer.data)


class MyComplaintsView(APIView):
    """
    GET /api/v1/complaints/my/
    شکایات کاربر لاگین کرده
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="شکایات من", 
        tags=['complaints'], 
        responses={200: ComplaintListSerializer(many=True)}
    )
    def get(self, request):
        complaints = ComplaintSelector.get_by_customer(request.user.id)
        serializer = ComplaintListSerializer(complaints, many=True)
        return Response(serializer.data)


class ComplaintDetailView(APIView):
    """
    GET /api/v1/complaints/{uuid}/
    جزئیات شکایت
    """
    permission_classes = [IsComplaintOwnerOrManager]

    @extend_schema(
        summary="جزئیات شکایت", 
        tags=['complaints'], 
        responses={200: ComplaintDetailSerializer}
    )
    def get(self, request, uuid):
        complaint = ComplaintSelector.get_by_uuid(uuid)
        if not complaint:
            raise ResourceNotFoundError("شکایت مورد نظر یافت نشد.")
        
        self.check_object_permissions(request, complaint)
        serializer = ComplaintDetailSerializer(complaint)
        return Response(serializer.data)


class ComplaintTrackView(APIView):
    """
    GET /api/v1/complaints/track/{identifier}/
    رهگیری عمومی با UUID یا کد ۸ رقمی
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="رهگیری عمومی شکایت", 
        tags=['complaints'], 
        responses={200: ComplaintDetailSerializer}
    )
    def get(self, request, identifier):
        complaint = None
        
        # ✅ اگر ۸ رقم بود، با tracking_code جستجو کن
        if identifier.isdigit() and len(identifier) == 8:
            complaint = ComplaintSelector.get_by_tracking_code(identifier)
        else:
            # وگرنه UUID
            try:
                complaint = ComplaintSelector.get_by_uuid(identifier)
            except:
                pass
        
        if not complaint:
            raise ResourceNotFoundError("شکایت با این کد رهگیری یافت نشد.")
        
        serializer = ComplaintDetailSerializer(complaint)
        return Response(serializer.data)