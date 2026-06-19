"""
ثابت‌های سیستمی
"""

# ─── OTP ────────────────────────────────────────────────────────────────────
OTP_EXPIRE_SECONDS = 120
OTP_LENGTH = 6
OTP_MAX_ATTEMPTS = 3

# ─── Pagination ─────────────────────────────────────────────────────────────
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# ─── File Upload ────────────────────────────────────────────────────────────
MAX_IMAGE_SIZE_MB = 5
MAX_DOCUMENT_SIZE_MB = 10
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
ALLOWED_EXCEL_EXTENSIONS = ['.xlsx', '.xls']

# ─── Cache TTL (ثانیه) ──────────────────────────────────────────────────────
CACHE_TTL_SHORT = 60          # 1 دقیقه
CACHE_TTL_MEDIUM = 300        # 5 دقیقه
CACHE_TTL_LONG = 3600         # 1 ساعت
CACHE_TTL_DAY = 86400         # 1 روز

# ─── Cache Keys ─────────────────────────────────────────────────────────────
CACHE_KEY_PROVINCES = 'geography:provinces:all'
CACHE_KEY_CITIES = 'geography:cities:province:{province_id}'
CACHE_KEY_OFFICIAL_PRICE = 'pricing:official:{union_id}:{date}'
CACHE_KEY_USER_PERMISSIONS = 'accounts:permissions:user:{user_id}'
