"""
تست مدل‌های Products
"""
import pytest
from apps.products.models import Product, ProductCategory, ProductUnit


@pytest.fixture
def unit(db):
    return ProductUnit.objects.create(
        name='کیلوگرم',
        symbol='kg'
    )


@pytest.fixture
def root_category(db):
    return ProductCategory.objects.create(
        name='مواد غذایی',
        slug='food'
    )


@pytest.fixture
def child_category(db, root_category):
    return ProductCategory.objects.create(
        name='گوشت مرغ',
        slug='chicken',
        parent=root_category
    )


@pytest.fixture
def product(db, child_category, unit):
    return Product.objects.create(
        name='مرغ گرم',
        slug='warm-chicken',
        category=child_category,
        unit=unit,
    )


@pytest.mark.django_db
class TestProductCategoryModel:

    def test_create_root_category(self, root_category):
        assert root_category.id is not None
        assert root_category.is_root is True
        assert root_category.level == 0

    def test_create_child_category(self, child_category, root_category):
        assert child_category.parent == root_category
        assert child_category.is_root is False
        assert child_category.level == 1

    def test_category_str(self, child_category):
        assert 'مواد غذایی' in str(child_category)
        assert 'گوشت مرغ' in str(child_category)

    def test_full_path(self, child_category):
        path = child_category.full_path
        assert 'مواد غذایی' in path
        assert 'گوشت مرغ' in path

    def test_get_ancestors(self, child_category, root_category):
        ancestors = child_category.get_ancestors()
        assert len(ancestors) == 1
        assert ancestors[0] == root_category

    def test_get_descendants(self, root_category, child_category):
        descendants = root_category.get_descendants()
        assert len(descendants) == 1
        assert child_category in descendants

    def test_unique_name_per_parent(self, root_category):
        ProductCategory.objects.create(
            name='لبنیات',
            slug='dairy',
            parent=root_category
        )
        with pytest.raises(Exception):
            ProductCategory.objects.create(
                name='لبنیات',
                slug='dairy-2',
                parent=root_category
            )


@pytest.mark.django_db
class TestProductModel:

    def test_create_product(self, product):
        assert product.id is not None
        assert product.is_active is True
        assert product.is_featured is False

    def test_product_str(self, product):
        assert 'مرغ گرم' in str(product)
        assert 'kg' in str(product)

    def test_product_full_name(self, product):
        assert 'مرغ گرم' in product.full_name
        assert 'کیلوگرم' in product.full_name

    def test_product_category_name(self, product):
        assert product.category_name == 'گوشت مرغ'

    def test_product_unit_properties(self, product):
        assert product.unit_name == 'کیلوگرم'
        assert product.unit_symbol == 'kg'

    def test_unique_slug(self, db, child_category, unit):
        Product.objects.create(
            name='محصول اول',
            slug='product-1',
            category=child_category,
            unit=unit,
        )
        with pytest.raises(Exception):
            Product.objects.create(
                name='محصول دوم',
                slug='product-1',
                category=child_category,
                unit=unit,
            )


@pytest.mark.django_db
class TestProductUnitModel:

    def test_create_unit(self, unit):
        assert unit.id is not None
        assert unit.is_active is True

    def test_unit_str(self, unit):
        assert 'کیلوگرم' in str(unit)
        assert 'kg' in str(unit)