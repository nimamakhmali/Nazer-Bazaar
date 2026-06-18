"""
Production settings
"""
from .base import *  # noqa

DEBUG = False

# ─── Security ───────────────────────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'

# ─── Static Files (Production) ──────────────────────────────────────────────
STATICFILES_STORAGE = (
    'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'
)

# ─── Sentry ─────────────────────────────────────────────────────────────────
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from decouple import config

SENTRY_DSN = config('SENTRY_DSN', default='')
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(transaction_style='url'),
            CeleryIntegration(),
        ],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment='production',
    )

# ─── Logging (Production) ───────────────────────────────────────────────────
LOGGING['handlers']['file']['filename'] = '/var/log/price-monitor/django.log'