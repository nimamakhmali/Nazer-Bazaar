from django.urls import path
from apps.cms.views import (
    PublicPageDetailView, PublicBlogListView, PublicBlogDetailView, PublicSliderListView, PublicAdListView,
    AdminPageListCreateView, AdminBlogCreateView
)

app_name = 'cms_api'

urlpatterns = [
    # Public Endpoints
    path('pages/<slug:slug>/', PublicPageDetailView.as_view(), name='page-detail'),
    path('blogs/', PublicBlogListView.as_view(), name='blog-list'),
    path('blogs/<slug:slug>/', PublicBlogDetailView.as_view(), name='blog-detail'),
    path('sliders/', PublicSliderListView.as_view(), name='slider-list'),
    path('ads/', PublicAdListView.as_view(), name='ad-list'),

    # Admin Endpoints
    path('admin/pages/', AdminPageListCreateView.as_view(), name='admin-page-list-create'),
    path('admin/blogs/', AdminBlogCreateView.as_view(), name='admin-blog-create'),
]