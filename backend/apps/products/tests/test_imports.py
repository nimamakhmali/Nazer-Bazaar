"""
تست Import محصولات از Excel
"""
import pytest
from io import BytesIO
from unittest.mock import patch
from apps.accounts.models import User
from apps.products.models import ProductUnit, ProductCategory, Product
from apps.products.services import ProductImportService
from apps.common.exceptions import ExcelImportError


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        phone_number='09000000000',
        password='admin123'
    )


@pytest.fixture
def kg_unit(db):
    return ProductUnit.objects.create(name='کیلوگرم', symbol='kg')


def create_test_excel(data: list) -> BytesIO:
    """تولید فایل Excel تست"""
    import openpyxl
    workbook = openpyxl.Workbook()
    worksheet = workbook.active

    # هدر
    headers = [
        'نام محصول', 'دسته‌بندی', 'واحد',
        'بارکد', 'برند', 'منشأ', 'توضیحات'
    ]
    worksheet.append(headers)

    # داده‌ها
    for row in data:
        worksheet.append(row)

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    output.name = 'test.xlsx'
    output.size = output.getbuffer().nbytes
    return output


@pytest.mark.django_db
class TestProductImportService:

    def setup_method(self):
        self.service = ProductImportService()

    def test_import_success(self, admin_user, kg_unit):
        excel_file = create_test_excel([
            ['مرغ گرم', 'گوشت مرغ', 'kg', '', 'مرغ ایران', 'ایران', ''],
            ['مرغ منجمد', 'گوشت مرغ', 'kg', '', '', '', ''],
        ])

        result = self.service.import_from_excel(
            file=excel_file,
            update_existing=False,
            requesting_user=admin_user
        )

        assert result.created_count == 2
        assert result.total_rows == 2
        assert not result.has_errors

    def test_import_updates_existing(self, admin_user, kg_unit):
        category = ProductCategory.objects.create(
            name='گوشت مرغ',
            slug='chicken'
        )
        Product.objects.create(
            name='مرغ گرم',
            slug='warm-chicken',
            category=category,
            unit=kg_unit
        )

        excel_file = create_test_excel([
            ['مرغ گرم', 'گوشت مرغ', 'kg', '', 'برند جدید', '', ''],
        ])

        result = self.service.import_from_excel(
            file=excel_file,
            update_existing=True,
            requesting_user=admin_user
        )

        assert result.updated_count == 1
        assert result.created_count == 0

    def test_import_skips_duplicate_without_update(
        self, admin_user, kg_unit
    ):
        category = ProductCategory.objects.create(
            name='گوشت مرغ',
            slug='chicken'
        )
        Product.objects.create(
            name='مرغ گرم',
            slug='warm-chicken',
            category=category,
            unit=kg_unit
        )

        excel_file = create_test_excel([
            ['مرغ گرم', 'گوشت مرغ', 'kg', '', '', '', ''],
        ])

        result = self.service.import_from_excel(
            file=excel_file,
            update_existing=False,
            requesting_user=admin_user
        )

        assert result.skipped_count == 1
        assert result.created_count == 0

    def test_import_invalid_unit(self, admin_user):
        excel_file = create_test_excel([
            ['محصول تست', 'دسته تست', 'invalid_unit', '', '', '', ''],
        ])

        result = self.service.import_from_excel(
            file=excel_file,
            update_existing=False,
            requesting_user=admin_user
        )

        assert result.skipped_count == 1
        assert result.has_errors

    def test_import_invalid_file_type(self, admin_user):
        fake_file = BytesIO(b'not an excel file')
        fake_file.name = 'test.csv'
        fake_file.size = 100

        with pytest.raises(ExcelImportError):
            self.service.import_from_excel(
                file=fake_file,
                update_existing=False,
                requesting_user=admin_user
            )

    def test_import_by_non_admin_raises(self, db):
        from apps.common.choices import UserRole
        regular_user = User.objects.create_user(
            phone_number='09111111111',
            role=UserRole.CUSTOMER
        )
        excel_file = create_test_excel([])

        with pytest.raises(PermissionError):
            self.service.import_from_excel(
                file=excel_file,
                update_existing=False,
                requesting_user=regular_user
            )