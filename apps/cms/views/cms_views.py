from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_spectacular.utils import extend_schema

from apps.common.permissions import IsAdminUser
from apps.common.exceptions import ResourceNotFoundError
from apps.common.pagination import StandardResultsPagination
from apps.cms.selectors import CmsSelector
from apps.cms.services import CmsService
from apps.cms.serializers import (
    PageListSerializer, PageDetailSerializer, PageCreateUpdateSerializer,
    BlogCategorySerializer, BlogListSerializer, BlogDetailSerializer, BlogCreateSerializer,
    SliderSerializer, GallerySerializer, AdvertisementSerializer
)

# ─── Public Views (Read Only) ────────────────────────────────────────────────

class PublicPageDetailView(APIView):
    permission_classes = [AllowAny]
    @extend_schema(tags=['CMS Public'], responses=PageDetailSerializer)
    def get(self, request, slug: str):
        page = CmsSelector.get_page_by_slug(slug)
        if not page: raise ResourceNotFoundError("صفحه یافت نشد.")
        return Response({'success': True, 'data': PageDetailSerializer(page).data})

class PublicBlogListView(APIView):
    permission_classes = [AllowAny]
    @extend_schema(tags=['CMS Public'], responses=BlogListSerializer(many=True))
    def get(self, request):
        blogs = CmsSelector.get_published_blogs()
        paginator = StandardResultsPagination()
        paginated = paginator.paginate_queryset(blogs, request)
        return paginator.get_paginated_response(BlogListSerializer(paginated, many=True).data)

class PublicBlogDetailView(APIView):
    permission_classes = [AllowAny]
    @extend_schema(tags=['CMS Public'], responses=BlogDetailSerializer)
    def get(self, request, slug: str):
        blog = CmsSelector.get_blog_by_slug(slug)
        if not blog: raise ResourceNotFoundError("مطلب یافت نشد.")
        return Response({'success': True, 'data': BlogDetailSerializer(blog).data})

class PublicSliderListView(APIView):
    permission_classes = [AllowAny]
    @extend_schema(tags=['CMS Public'], responses=SliderSerializer(many=True))
    def get(self, request):
        sliders = CmsSelector.get_active_sliders()
        return Response({'success': True, 'data': SliderSerializer(sliders, many=True).data})

class PublicAdListView(APIView):
    permission_classes = [AllowAny]
    @extend_schema(tags=['CMS Public'], responses=AdvertisementSerializer(many=True))
    def get(self, request):
        position = request.query_params.get('position')
        ads = CmsSelector.get_active_ads(position=position)
        return Response({'success': True, 'data': AdvertisementSerializer(ads, many=True).data})

# ─── Admin Views (Write) ─────────────────────────────────────────────────────

class AdminPageListCreateView(APIView):
    parser_classes = [JSONParser]
    def get_permissions(self):
        return [IsAdminUser()] if self.request.method == 'POST' else [AllowAny()]

    @extend_schema(tags=['CMS Admin'], responses=PageListSerializer(many=True))
    def get(self, request):
        pages = CmsSelector.get_published_pages() if not request.user.is_admin else Page.objects.all()
        return Response({'success': True, 'data': PageListSerializer(pages, many=True).data})

    @extend_schema(tags=['CMS Admin'], request=PageCreateUpdateSerializer)
    def post(self, request):
        serializer = PageCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = CmsService()
        page = service.create_page(requesting_user=request.user, **serializer.validated_data)
        return Response({'success': True, 'data': PageDetailSerializer(page).data}, status=status.HTTP_201_CREATED)

class AdminBlogCreateView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(tags=['CMS Admin'], request=BlogCreateSerializer)
    def post(self, request):
        serializer = BlogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = CmsService()
        blog = service.create_blog(requesting_user=request.user, **serializer.validated_data)
        return Response({'success': True, 'data': BlogDetailSerializer(blog).data}, status=status.HTTP_201_CREATED)