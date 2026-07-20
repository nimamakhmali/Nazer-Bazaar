"""
Import Service - ورود انبوه محصولات از Excel

این سرویس مسئول پردازش فایل‌های Excel و ایجاد/بروزرسانی
محصولات در دیتابیس است.

ساختار فایل Excel مورد انتظار:
    ستون A: نام محصول (اجباری)
    ستون B: نام دسته‌بندی (اجباری)
    ستون C: نماد واحد (اجباری) - مثال: kg, piece
    ستون D: بارکد (اختیاری)
    ستون E: برند (اختیاری)
    ستون F: منشأ تولید (اختیاری)
    ستون G: توضیحات (اختیاری)
"""
import logging
from dataclasses import dataclass, field
from typing import List
from apps.common.base import BaseService
from apps.common.exceptions import ExcelImportError
from apps.common.constants import ALLOWED_EXCEL_EXTENSIONS

logger = logging.getLogger(__name__)


@dataclass
class ImportRow:
    """یک ردیف از فایل Excel"""
    row_number: int
    name: str
    category_name: str
    unit_symbol: str
    barcode: str = ''
    brand: str = ''
    origin: str = ''
    description: str = ''
    errors: List[str] = field(default_factory=list)
    is_valid: bool = True


@dataclass
class ImportResult:
    """نتیجه نهایی عملیات import"""
    total_rows: int = 0
    created_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    error_rows: List[dict] = field(default_factory=list)

    @property
    def success_count(self) -> int:
        return self.created_count + self.updated_count

    @property
    def has_errors(self) -> bool:
        return len(self.error_rows) > 0


class ProductImportService(BaseService):

    REQUIRED_COLUMNS = [
        'نام محصول',
        'دسته‌بندی',
        'واحد',
    ]

    def import_from_excel(
        self,
        *,
        file,
        update_existing: bool = False,
        requesting_user
    ) -> ImportResult:
        """
        ورود محصولات از فایل Excel.

        Args:
            file: فایل Excel آپلود شده
            update_existing: اگر True باشد، محصولات موجود بروزرسانی می‌شوند
            requesting_user: کاربر انجام‌دهنده

        Returns:
            ImportResult: نتیجه عملیات

        Raises:
            PermissionError: اگر کاربر ادمین نباشد
            ExcelImportError: اگر فایل نامعتبر باشد
        """
        if not requesting_user.is_admin:
            raise PermissionError(
                'فقط ادمین می‌تواند محصولات را import کند'
            )

        # بررسی پسوند فایل
        self._validate_file(file)

        # خواندن فایل Excel
        rows = self._parse_excel(file)

        # پردازش ردیف‌ها
        result = self._process_rows(
            rows=rows,
            update_existing=update_existing,
            requesting_user=requesting_user
        )

        self.log_info(
            f'Product import completed: '
            f'created={result.created_count}, '
            f'updated={result.updated_count}, '
            f'errors={len(result.error_rows)}',
            by=requesting_user.id
        )

        return result

    def _validate_file(self, file) -> None:
        """بررسی اعتبار فایل"""
        import os
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in ALLOWED_EXCEL_EXTENSIONS:
            raise ExcelImportError(
                f'فرمت فایل مجاز نیست. '
                f'فقط فایل‌های Excel (.xlsx, .xls) قابل قبول هستند'
            )

        from apps.common.constants import MAX_DOCUMENT_SIZE_MB
        max_size = MAX_DOCUMENT_SIZE_MB * 1024 * 1024
        if file.size > max_size:
            raise ExcelImportError(
                f'حجم فایل بیش از حد مجاز است '
                f'(حداکثر {MAX_DOCUMENT_SIZE_MB} مگابایت)'
            )

    def _parse_excel(self, file) -> List[ImportRow]:
        """خواندن و parse کردن فایل Excel"""
        try:
            import openpyxl
            workbook = openpyxl.load_workbook(file, read_only=True)
            worksheet = workbook.active

            rows = []
            headers = None

            for row_idx, row in enumerate(worksheet.iter_rows(values_only=True), start=1):
                # ردیف اول = هدر
                if row_idx == 1:
                    headers = [str(cell).strip() if cell else '' for cell in row]
                    self._validate_headers(headers)
                    continue

                # ردیف‌های خالی را رد کن
                if not any(row):
                    continue

                import_row = self._parse_row(row_idx, row, headers)
                rows.append(import_row)

            workbook.close()
            return rows

        except ExcelImportError:
            raise
        except Exception as e:
            raise ExcelImportError(
                f'خطا در خواندن فایل Excel: {str(e)}'
            )

    def _validate_headers(self, headers: List[str]) -> None:
        """بررسی وجود ستون‌های اجباری"""
        missing = []
        for required in self.REQUIRED_COLUMNS:
            if required not in headers:
                missing.append(required)

        if missing:
            raise ExcelImportError(
                f'ستون‌های اجباری یافت نشد: '
                f'{", ".join(missing)}'
            )

    def _parse_row(
        self,
        row_number: int,
        row: tuple,
        headers: List[str]
    ) -> ImportRow:
        """تبدیل یک ردیف Excel به ImportRow"""
        data = {}
        for idx, header in enumerate(headers):
            if idx < len(row):
                value = row[idx]
                data[header] = str(value).strip() if value is not None else ''
            else:
                data[header] = ''

        return ImportRow(
            row_number=row_number,
            name=data.get('نام محصول', ''),
            category_name=data.get('دسته‌بندی', ''),
            unit_symbol=data.get('واحد', ''),
            barcode=data.get('بارکد', ''),
            brand=data.get('برند', ''),
            origin=data.get('منشأ', ''),
            description=data.get('توضیحات', ''),
        )

    def _process_rows(
        self,
        rows: List[ImportRow],
        update_existing: bool,
        requesting_user
    ) -> ImportResult:
        """پردازش و ذخیره ردیف‌ها"""
        from apps.products.models import (
            Product,
            ProductCategory,
            ProductUnit
        )
        from apps.common.utils import normalize_persian_text
        from django.utils.text import slugify

        result = ImportResult(total_rows=len(rows))

        # cache برای جلوگیری از کوئری‌های تکراری
        category_cache = {}
        unit_cache = {}

        for import_row in rows:
            try:
                # اعتبارسنجی
                errors = self._validate_row(import_row)
                if errors:
                    result.error_rows.append({
                        'row': import_row.row_number,
                        'name': import_row.name,
                        'errors': errors
                    })
                    result.skipped_count += 1
                    continue

                # دریافت دسته‌بندی از cache
                category = self._get_or_create_category(
                    import_row.category_name,
                    category_cache
                )

                # دریافت واحد از cache
                unit = self._get_unit(
                    import_row.unit_symbol,
                    unit_cache
                )
                if not unit:
                    result.error_rows.append({
                        'row': import_row.row_number,
                        'name': import_row.name,
                        'errors': [
                            f'واحد "{import_row.unit_symbol}" یافت نشد'
                        ]
                    })
                    result.skipped_count += 1
                    continue

                # ایجاد یا بروزرسانی محصول
                name = normalize_persian_text(import_row.name)
                existing = Product.objects.filter(
                    name=name,
                    category=category
                ).first()

                if existing:
                    if update_existing:
                        self._update_product(
                            existing,
                            import_row,
                            unit
                        )
                        result.updated_count += 1
                    else:
                        result.skipped_count += 1
                else:
                    self._create_product(
                        import_row,
                        category,
                        unit,
                        name
                    )
                    result.created_count += 1

            except Exception as e:
                result.error_rows.append({
                    'row': import_row.row_number,
                    'name': import_row.name,
                    'errors': [str(e)]
                })
                result.skipped_count += 1
                logger.warning(
                    f'Error processing row {import_row.row_number}: {e}'
                )

        return result

    @staticmethod
    def _validate_row(row: ImportRow) -> List[str]:
        """اعتبارسنجی یک ردیف"""
        errors = []
        if not row.name:
            errors.append('نام محصول الزامی است')
        elif len(row.name) > 200:
            errors.append('نام محصول بیش از 200 کاراکتر است')

        if not row.category_name:
            errors.append('نام دسته‌بندی الزامی است')

        if not row.unit_symbol:
            errors.append('واحد اندازه‌گیری الزامی است')

        return errors

    @staticmethod
    def _get_or_create_category(
        name: str,
        cache: dict
    ):
        """دریافت یا ایجاد دسته‌بندی"""
        from apps.products.models import ProductCategory
        from apps.common.utils import normalize_persian_text
        from django.utils.text import slugify

        name = normalize_persian_text(name)
        if name in cache:
            return cache[name]

        category = ProductCategory.objects.filter(
            name=name,
            parent__isnull=True
        ).first()

        if not category:
            slug = slugify(name, allow_unicode=True)
            counter = 1
            base_slug = slug
            while ProductCategory.objects.filter(slug=slug).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1

            category = ProductCategory.objects.create(
                name=name,
                slug=slug,
            )

        cache[name] = category
        return category

    @staticmethod
    def _get_unit(symbol: str, cache: dict):
        """دریافت واحد از دیتابیس"""
        from apps.products.models import ProductUnit

        if symbol in cache:
            return cache[symbol]

        unit = ProductUnit.objects.filter(
            symbol=symbol,
            is_active=True
        ).first()

        if unit:
            cache[symbol] = unit

        return unit

    @staticmethod
    def _create_product(
        row: ImportRow,
        category,
        unit,
        name: str
    ):
        """ایجاد محصول جدید"""
        from apps.products.models import Product
        from django.utils.text import slugify

        slug = slugify(name, allow_unicode=True)
        counter = 1
        base_slug = slug
        while Product.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        Product.objects.create(
            name=name,
            category=category,
            unit=unit,
            slug=slug,
            barcode=row.barcode or None,
            brand=row.brand,
            origin=row.origin,
            description=row.description,
        )

    @staticmethod
    def _update_product(product, row: ImportRow, unit):
        """بروزرسانی محصول موجود"""
        update_fields = ['updated_at']

        if row.brand:
            product.brand = row.brand
            update_fields.append('brand')

        if row.origin:
            product.origin = row.origin
            update_fields.append('origin')

        if row.description:
            product.description = row.description
            update_fields.append('description')

        if row.barcode and row.barcode != product.barcode:
            product.barcode = row.barcode
            update_fields.append('barcode')

        product.unit = unit
        update_fields.append('unit')

        product.save(update_fields=update_fields)

