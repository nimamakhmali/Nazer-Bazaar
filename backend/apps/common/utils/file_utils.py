"""
ابزارهای مربوط به فایل
"""
import os
import uuid
from django.utils.text import slugify
from apps.common.constants import (
    MAX_IMAGE_SIZE_MB,
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_DOCUMENT_EXTENSIONS,
)
from apps.common.exceptions import InvalidFileTypeError, FileSizeTooLargeError


def generate_unique_filename(filename: str) -> str:
    """
    نام فایل منحصربه‌فرد با UUID تولید می‌کند.
    
    Example:
        invoice.jpg → a3f8b2c1-invoice.jpg
    """
    ext = os.path.splitext(filename)[1].lower()
    unique_name = f'{uuid.uuid4().hex[:8]}-{slugify(filename)}{ext}'
    return unique_name


def validate_image_file(file) -> None:
    """اعتبارسنجی فایل تصویر"""
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise InvalidFileTypeError(
            f'فرمت تصویر مجاز نیست. فرمت‌های قابل قبول: '
            f'{", ".join(ALLOWED_IMAGE_EXTENSIONS)}'
        )
    max_size = MAX_IMAGE_SIZE_MB * 1024 * 1024
    if file.size > max_size:
        raise FileSizeTooLargeError(
            f'حجم تصویر نباید بیشتر از {MAX_IMAGE_SIZE_MB} مگابایت باشد'
        )


def get_upload_path(instance, filename: str, folder: str) -> str:
    """
    مسیر آپلود فایل را بر اساس نوع و تاریخ تعیین می‌کند.
    
    Example:
        complaints/2024/01/15/a3f8b2c1-invoice.jpg
    """
    from django.utils import timezone
    today = timezone.now()
    unique_name = generate_unique_filename(filename)
    return (
        f'{folder}/'
        f'{today.year}/{today.month:02d}/{today.day:02d}/'
        f'{unique_name}'
    )