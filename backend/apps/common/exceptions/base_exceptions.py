

class PriceMonitorBaseException(Exception):
    """خطای پایه پروژه - تمام خطاهای سفارشی از این ارث می‌برند"""
    default_message = 'خطایی رخ داده است'
    default_code = 'error'

    def __init__(self, message: str = None, code: str = None):
        self.message = message or self.default_message
        self.code = code or self.default_code
        super().__init__(self.message)


# ─── Business Logic Exceptions ──────────────────────────────────────────────

class BusinessRuleViolation(PriceMonitorBaseException):
    """نقض قانون کسب‌وکار"""
    default_message = 'عملیات مغایر با قوانین سیستم است'
    default_code = 'business_rule_violation'


class PriceValidationError(BusinessRuleViolation):
    """
    خطای اعتبارسنجی قیمت.
    وقتی قیمت فروشگاه خارج از محدوده مجاز است.
    """
    default_message = 'قیمت وارد شده در محدوده مجاز نیست'
    default_code = 'price_validation_error'


class DuplicatePriceError(BusinessRuleViolation):
    """ثبت قیمت تکراری برای یک محصول در یک روز"""
    default_message = 'قیمت این محصول برای امروز قبلاً ثبت شده است'
    default_code = 'duplicate_price'


class UnauthorizedOrganizationAccess(BusinessRuleViolation):
    """دسترسی به سازمان دیگر"""
    default_message = 'شما مجاز به دسترسی به این سازمان نیستید'
    default_code = 'unauthorized_organization_access'


# ─── Authentication Exceptions ──────────────────────────────────────────────

class AuthenticationError(PriceMonitorBaseException):
    """خطای احراز هویت"""
    default_message = 'احراز هویت ناموفق بود'
    default_code = 'authentication_error'


class OTPExpiredError(AuthenticationError):
    """کد OTP منقضی شده"""
    default_message = 'کد تایید منقضی شده است'
    default_code = 'otp_expired'


class OTPInvalidError(AuthenticationError):
    """کد OTP نادرست"""
    default_message = 'کد تایید نادرست است'
    default_code = 'otp_invalid'


class MaxOTPAttemptsExceeded(AuthenticationError):
    """تعداد تلاش‌های OTP از حد مجاز بیشتر شده"""
    default_message = 'تعداد دفعات تلاش از حد مجاز بیشتر شده است'
    default_code = 'max_otp_attempts'


# ─── Resource Exceptions ────────────────────────────────────────────────────

class ResourceNotFoundError(PriceMonitorBaseException):
    """رکورد یافت نشد"""
    default_message = 'رکورد مورد نظر یافت نشد'
    default_code = 'not_found'


class ResourceAlreadyExistsError(PriceMonitorBaseException):
    """رکورد تکراری"""
    default_message = 'این رکورد قبلاً ثبت شده است'
    default_code = 'already_exists'


# ─── File Exceptions ────────────────────────────────────────────────────────

class InvalidFileTypeError(PriceMonitorBaseException):
    """نوع فایل مجاز نیست"""
    default_message = 'نوع فایل مجاز نیست'
    default_code = 'invalid_file_type'


class FileSizeTooLargeError(PriceMonitorBaseException):
    """حجم فایل بیش از حد مجاز"""
    default_message = 'حجم فایل بیش از حد مجاز است'
    default_code = 'file_too_large'


class ExcelImportError(PriceMonitorBaseException):
    """خطا در ایمپورت فایل اکسل"""
    default_message = 'خطا در پردازش فایل اکسل'
    default_code = 'excel_import_error'
    
    