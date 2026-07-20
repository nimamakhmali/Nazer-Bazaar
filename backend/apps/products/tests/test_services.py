"""
تست Service های Products
"""
import pytest
from apps.accounts.models import User
from apps.products.models import Product, ProductCategory, ProductUnit
from apps.products.services import (
    ProductCategoryService,
    ProductService,
)
from apps.common.choices import UserRole
from apps.common.exceptions import (
    ResourceNotFoundError,
    ResourceAlreadyExistsError,
)


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        phone_number='09000000000',
        password='admin123'
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        phone_number='09111111111',
        role=UserRole.CUSTOMER
    )


@pytest.fixture
def unit(db):
    return ProductUnit.objects.create(
        name='کیلوگرم',
        symbol='kg'
    )


@pytest.fixture
def category(db, admin_user):
    service = ProductCategoryService()
    return service.create(
        name='مواد غذایی',
        requesting_user=admin_user
    )


@pytest.mark.django_db
class TestProductCategoryService:

    def setup_method(self):
        self.service = ProductCategoryService()

    def test_create_category_success(self, admin_user):
        category = self.service.create(
            name='مواد غذایی',
            requesting_user=admin_user
        )
        assert category.id is not None
        assert category.name == 'مواد غذایی'
        assert category.slug is not None

    def test_create_child_category(self, admin_user, category):
        child = self.service.create(
            name='گوشت مرغ',
            parent_id=category.id,
            requesting_user=admin_user
        )
        assert child.parent == category
        assert child.level == 1

    def test_create_duplicate_category(self, admin_user):
        self.service.create(
            name='مواد غذایی',
            requesting_user=admin_user
        )
        with pytest.raises(ResourceAlreadyExistsError):
            self.service.create(
                name='مواد غذایی',
                requesting_user=admin_user
            )

    def test_create_by_non_admin_raises_error(self, regular_user):
        with pytest.raises(PermissionError):
            self.service.create(
                name='تست',
                requesting_user=regular_user
            )

    def test_update_category(self, admin_user, category):
        updated = self.service.update(
            category_id=category.id,
            name='مواد خوراکی',
            requesting_user=admin_user
        )
        assert updated.name == 'مواد خوراکی'


@pytest.mark.django_db
class TestProductService:

    def setup_method(self):
        self.service = ProductService()

    def test_create_product_success(self, admin_user, category, unit):
        product = self.service.create(
            name='مرغ گرم',
            category_id=category.id,
            unit_id=unit.id,
            requesting_user=admin_user
        )
        assert product.id is not None
        assert product.name == 'مرغ گرم'
        assert product.slug is not None

    def test_create_duplicate_product(self, admin_user, category, unit):
        self.service.create(
            name='مرغ گرم',
            category_id=category.id,
            unit_id=unit.id,
            requesting_user=admin_user
        )
        with pytest.raises(ResourceAlreadyExistsError):
            self.service.create(
                name='مرغ گرم',
                category_id=category.id,
                unit_id=unit.id,
                requesting_user=admin_user
            )

    def test_create_product_invalid_category(self, admin_user, unit):
        with pytest.raises(ResourceNotFoundError):
            self.service.create(
                name='محصول',
                category_id=9999,
                unit_id=unit.id,
                requesting_user=admin_user
            )

    def test_update_product(self, admin_user, category, unit):
        product = self.service.create(
            name='مرغ گرم',
            category_id=category.id,
            unit_id=unit.id,
            requesting_user=admin_user
        )
        updated = self.service.update(
            product_id=product.id,
            name='مرغ تازه',
            brand='مرغ ایرانی',
            requesting_user=admin_user
        )
        assert updated.name == 'مرغ تازه'
        assert updated.brand == 'مرغ ایرانی'

    def test_create_by_non_admin_raises(self, regular_user, category, unit):
        with pytest.raises(PermissionError):
            self.service.create(
                name='محصول',
                category_id=category.id,
                unit_id=unit.id,
                requesting_user=regular_user
            )