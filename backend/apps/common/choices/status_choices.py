
from django.db import models


class UserRole(models.TextChoices):
    """نقش‌های کاربری سیستم"""
    ADMIN = 'admin', 'ادمین کل'
    PROVINCE_MANAGER = 'province_manager', 'ناظر استانداری'
    CHAMBER_MANAGER = 'chamber_manager', 'مدیر اتاق اصناف'
    UNION_MANAGER = 'union_manager', 'رئیس اتحادیه'
    STORE_OWNER = 'store_owner', 'صاحب فروشگاه'
    INSPECTOR = 'inspector', 'بازرس'
    CUSTOMER = 'customer', 'شهروند'


class StoreStatus(models.TextChoices):
    """وضعیت فروشگاه"""
    PENDING = 'pending', 'در انتظار تایید'
    ACTIVE = 'active', 'فعال'
    SUSPENDED = 'suspended', 'تعلیق شده'
    REJECTED = 'rejected', 'رد شده'
    CLOSED = 'closed', 'تعطیل'


class ComplaintStatus(models.TextChoices):
    """وضعیت شکایت"""
    SUBMITTED = 'submitted', 'ثبت شده'
    REVIEWING = 'reviewing', 'در حال بررسی'
    REFERRED = 'referred', 'ارجاع داده شده'
    INSPECTING = 'inspecting', 'در حال بازرسی'
    CONFIRMED = 'confirmed', 'تایید شده'
    REJECTED = 'rejected', 'رد شده'
    CLOSED = 'closed', 'مختومه'


class PriceImportStatus(models.TextChoices):
    """وضعیت ایمپورت قیمت از اکسل"""
    PENDING = 'pending', 'در انتظار پردازش'
    PROCESSING = 'processing', 'در حال پردازش'
    COMPLETED = 'completed', 'تکمیل شده'
    FAILED = 'failed', 'ناموفق'
    PARTIAL = 'partial', 'تکمیل ناقص'


class NotificationStatus(models.TextChoices):
    """وضعیت اطلاع‌رسانی"""
    PENDING = 'pending', 'در انتظار ارسال'
    SENT = 'sent', 'ارسال شده'
    FAILED = 'failed', 'ناموفق'
    READ = 'read', 'خوانده شده'


class ProductUnit(models.TextChoices):
    """واحد اندازه‌گیری محصول"""
    KG = 'kg', 'کیلوگرم'
    GRAM = 'gram', 'گرم'
    PIECE = 'piece', 'عدد'
    PACK = 'pack', 'بسته'
    LITER = 'liter', 'لیتر'
    METER = 'meter', 'متر'


class ViolationType(models.TextChoices):
    """نوع تخلف"""
    OVERPRICING = 'overpricing', 'گران‌فروشی'
    UNDERWEIGHT = 'underweight', 'کم‌فروشی'
    LOW_QUALITY = 'low_quality', 'کیفیت پایین'
    NO_RECEIPT = 'no_receipt', 'عدم صدور فاکتور'
    OTHER = 'other', 'سایر'


class InspectionResult(models.TextChoices):
    """نتیجه بازرسی"""
    COMPLIANT = 'compliant', 'مطابق مقررات'
    VIOLATION_FOUND = 'violation_found', 'تخلف یافت شد'
    INCONCLUSIVE = 'inconclusive', 'نتیجه نامشخص'
    