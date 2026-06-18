"""
Development settings
"""
from .base import *  # noqa

DEBUG = True

# ─── Dev Apps ───────────────────────────────────────────────────────────────
INSTALLED_APPS += [
    'debug_toolbar',
    'silk',
]

MIDDLEWARE += [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
    'silk.middleware.SilkyMiddleware',
]

# ─── Database (Dev) ─────────────────────────────────────────────────────────
# در توسعه از SQLite هم میشه استفاده کرد
# اما ما postgres رو از همان ابتدا استفاده می‌کنیم

# ─── Email (Dev) ────────────────────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ─── Debug Toolbar ──────────────────────────────────────────────────────────
INTERNAL_IPS = ['127.0.0.1', 'localhost']
DEBUG_TOOLBAR_CONFIG = {
    'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG,
}

# ─── Silk (Profiling) ───────────────────────────────────────────────────────
SILKY_PYTHON_PROFILER = True
SILKY_AUTHENTICATION = True
SILKY_AUTHORISATION = True

# ─── Cache (Dev) - بدون فشرده‌سازی ─────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
    }
}

# ─── REST Framework (Dev) ───────────────────────────────────────────────────
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] += [
    'rest_framework.renderers.BrowsableAPIRenderer',
]