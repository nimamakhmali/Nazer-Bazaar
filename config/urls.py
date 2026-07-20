"""
URL Configuration اصلی پروژه
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


# ─── API v1 URL Patterns ────────────────────────────────────────────────────
api_v1_patterns = [
    path('auth/', include('apps.accounts.urls.api_urls')),
    path('geography/', include('apps.geography.urls.api_urls')),
    path('organizations/', include('apps.organizations.urls.api_urls')),
    path('stores/', include('apps.stores.urls.api_urls')),
    path('products/', include('apps.products.urls.api_urls')),
    path('pricing/', include('apps.pricing.urls.api_urls')),
    path('complaints/', include('apps.complaints.urls.api_urls')),
    path('cms/', include('apps.cms.urls.api_urls')),

]

urlpatterns = [
    # ─── Django Admin ───────────────────────────────────────────────────────
    path('admin/', admin.site.urls),

    # ─── API ────────────────────────────────────────────────────────────────
    path('api/v1/', include(api_v1_patterns)),

    # ─── API Documentation ──────────────────────────────────────────────────
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path(
        'api/docs/',
        SpectacularSwaggerView.as_view(url_name='schema'),
        name='swagger-ui'
    ),
    path(
        'api/redoc/',
        SpectacularRedocView.as_view(url_name='schema'),
        name='redoc'
    ),

    # ─── Web Panels ─────────────────────────────────────────────────────────
    path('', include('apps.accounts.urls.web_urls')),
    path('dashboard/', include('apps.accounts.urls.web_urls')),
    path('organizations/', include('apps.organizations.urls.web_urls')),
    path('stores/', include('apps.stores.urls.web_urls')),
    #path('products/', include('apps.products.urls.web_urls')),
    path('pricing/', include('apps.pricing.urls.web_urls')),
    #path('complaints/', include('apps.complaints.urls.web_urls')),
    #path('reports/', include('apps.reports.urls.web_urls')),
    #path('cms/', include('apps.cms.urls.web_urls')),
]

# ─── Debug Mode Extras ──────────────────────────────────────────────────────
if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        path('__debug__/', include(debug_toolbar.urls)),
        path('silk/', include('silk.urls', namespace='silk')),
    ] + urlpatterns

    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )
    urlpatterns += static(
        settings.STATIC_URL,
        document_root=settings.STATIC_ROOT
    )
    
    