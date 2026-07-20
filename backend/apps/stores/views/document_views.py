"""
Document Views - مدیریت مدارک فروشگاه
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema

from apps.common.exceptions import ResourceNotFoundError
from apps.stores.selectors import (
    StoreSelector,
    StoreDocumentSelector,
    StoreLicenseSelector,
)
from apps.stores.services import StoreDocumentService, StoreLicenseService
from apps.stores.serializers import (
    StoreDocumentSerializer,
    StoreDocumentUploadSerializer,
    StoreLicenseSerializer,
    StoreLicenseCreateSerializer,
)
from apps.stores.permissions import CanManageStore, CanApproveStore


class StoreDocumentListView(APIView):
    """
    GET  /api/v1/stores/{store_id}/documents/
    POST /api/v1/stores/{store_id}/documents/
    """
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [CanManageStore()]

    @extend_schema(
        summary='مدارک فروشگاه',
        tags=['stores'],
        responses={200: StoreDocumentSerializer(many=True)}
    )
    def get(self, request, store_id: int) -> Response:
        store = StoreSelector.get_by_id(store_id)
        if not store:
            raise ResourceNotFoundError('فروشگاه مورد نظر یافت نشد')

        documents = StoreDocumentSelector.get_by_store(store_id)
        serializer = StoreDocumentSerializer(documents, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })

    @extend_schema(
        summary='آپلود مدرک',
        tags=['stores'],
        request=StoreDocumentUploadSerializer,
        responses={201: StoreDocumentSerializer}
    )
    def post(self, request, store_id: int) -> Response:
        serializer = StoreDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = StoreDocumentService()
        document = service.upload_document(
            store_id=store_id,
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response(
            {
                'success': True,
                'message': 'مدرک با موفقیت آپلود شد',
                'data': StoreDocumentSerializer(document).data
            },
            status=status.HTTP_201_CREATED
        )


class StoreDocumentDetailView(APIView):
    """
    DELETE /api/v1/stores/documents/{id}/
    POST   /api/v1/stores/documents/{id}/verify/
    """
    permission_classes = [CanManageStore]

    def delete(self, request, document_id: int) -> Response:
        service = StoreDocumentService()
        service.delete_document(
            document_id=document_id,
            requesting_user=request.user
        )
        return Response({
            'success': True,
            'message': 'مدرک با موفقیت حذف شد'
        })


class StoreDocumentVerifyView(APIView):
    """
    POST /api/v1/stores/documents/{id}/verify/
    تایید مدرک
    """
    permission_classes = [CanApproveStore]

    @extend_schema(
        summary='تایید مدرک',
        tags=['stores'],
        responses={200: StoreDocumentSerializer}
    )
    def post(self, request, document_id: int) -> Response:
        service = StoreDocumentService()
        document = service.verify_document(
            document_id=document_id,
            requesting_user=request.user
        )

        return Response({
            'success': True,
            'message': 'مدرک با موفقیت تایید شد',
            'data': StoreDocumentSerializer(document).data
        })


class StoreLicenseView(APIView):
    """
    GET  /api/v1/stores/{store_id}/license/
    POST /api/v1/stores/{store_id}/license/
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [CanManageStore()]

    @extend_schema(
        summary='پروانه کسب فروشگاه',
        tags=['stores'],
        responses={200: StoreLicenseSerializer}
    )
    def get(self, request, store_id: int) -> Response:
        store = StoreSelector.get_by_id(store_id)
        if not store:
            raise ResourceNotFoundError('فروشگاه مورد نظر یافت نشد')

        license_obj = StoreLicenseSelector.get_by_store(store_id)
        if not license_obj:
            return Response(
                {
                    'success': False,
                    'message': 'پروانه کسب برای این فروشگاه ثبت نشده است'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'success': True,
            'data': StoreLicenseSerializer(license_obj).data
        })

    @extend_schema(
        summary='ثبت پروانه کسب',
        tags=['stores'],
        request=StoreLicenseCreateSerializer,
        responses={201: StoreLicenseSerializer}
    )
    def post(self, request, store_id: int) -> Response:
        serializer = StoreLicenseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = StoreLicenseService()
        license_obj = service.create_license(
            store_id=store_id,
            requesting_user=request.user,
            **serializer.validated_data
        )

        return Response(
            {
                'success': True,
                'message': 'پروانه کسب با موفقیت ثبت شد',
                'data': StoreLicenseSerializer(license_obj).data
            },
            status=status.HTTP_201_CREATED
        )