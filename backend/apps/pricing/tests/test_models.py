"""
تست مدل‌های Pricing
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from apps.geography.models import Province, City
from apps.accounts.models import User
from apps.organizations.models import Chamber, Union
from apps.products.models import ProductUnit, ProductCategory, Product
from apps.stores.models import Store
from apps.pricing.models import OfficialPrice, StorePrice, PriceHistory
from apps.common.choices import UserRole, StoreStatus


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        phone_number='09000000000',
        password='admin123'
    )


@pytest.fixture
def union_manager(db):
    return User.objects.create_user(
        phone_number='09100000001',
        role=UserRole.UNION_MANAGER
    )


@pytest.fixture
def store_owner(db):
    return User.objects.create_user(
        phone_number='09100000002',
        role=UserRole.STORE_OWNER
    )


@pytest.fixture
def setup_org(db, union_manager):
    province = Province.objects.create(name='تهران', code='08')
    city = City.objects.create(name='تهران', province=province)
    chamber = Chamber.objects.create(
        city=city,
        name='اتاق اصناف تهران'
    )
    union = Union.objects.create(
        chamber=chamber,
        manager=union_manager,
        name='اتحادیه مرغ‌فروشان'
    )
    return union


@pytest.fixture
def product(db):
    unit = ProductUnit.objects.create(name='کیلوگرم', symbol='kg')
    category = ProductCategory.objects.create(
        name='گوشت مرغ',
        slug='chicken'
    )
    return Product.objects.create(
        name='مرغ گرم',
        slug='warm-chicken',
        category=category,
        unit=unit,
    )


@pytest.fixture
def store(db, setup_org, store_owner):
    return Store.objects.create(
        union=setup_org,
        owner=store_owner,
        name='مرغ‌فروشی احمدی',
        license_number='LIC-001',
        address='تهران',
        status=StoreStatus.ACTIVE,
    )


@pytest.fixture
def official_price(db, setup_org, product, union_manager):
    return OfficialPrice.objects.create(
        union=setup_org,
        product=product,
        price=Decimal('100000'),
        effective_date=timezone.now().date(),
        created_by=union_manager,
    )


@pytest.mark.django_db
class TestOfficialPriceModel:

    def test_create_official_price(self, official_price):
        assert official_price.id is not None
        assert official_price.price == Decimal('100000')
        assert official_price.is_active is True

    def test_min_allowed_price(self, official_price):
        """حداقل قیمت مجاز = 80% قیمت مصوب"""
        assert official_price.min_allowed_price == Decimal('80000')

    def test_max_allowed_price(self, official_price):
        """حداکثر قیمت مجاز = 100% قیمت مصوب"""
        assert official_price.max_allowed_price == Decimal('100000')

    def test_is_today(self, official_price):
        assert official_price.is_today is True

    def test_validate_store_price_valid(self, official_price):
        assert official_price.validate_store_price(
            Decimal('90000')
        ) is True

    def test_validate_store_price_overpriced(self, official_price):
        assert official_price.validate_store_price(
            Decimal('110000')
        ) is False

    def test_unique_constraint(self, setup_org, product, union_manager):
        """فقط یک قیمت مصوب در روز"""
        today = timezone.now().date()
        OfficialPrice.objects.create(
            union=setup_org,
            product=product,
            price=Decimal('100000'),
            effective_date=today,
            created_by=union_manager,
        )
        with pytest.raises(Exception):
            OfficialPrice.objects.create(
                union=setup_org,
                product=product,
                price=Decimal('110000'),
                effective_date=today,
                created_by=union_manager,
            )

    def test_str_representation(self, official_price, product, setup_org):
        str_rep = str(official_price)
        assert product.name in str_rep
        assert setup_org.name in str_rep


@pytest.mark.django_db
class TestStorePriceModel:

    def test_create_store_price(
        self, store, product, official_price, store_owner
    ):
        store_price = StorePrice.objects.create(
            store=store,
            product=product,
            official_price=official_price,
            price=Decimal('90000'),
            official_price_amount=Decimal('100000'),
            min_allowed_price_amount=Decimal('80000'),
            price_date=timezone.now().date(),
            created_by=store_owner,
        )
        assert store_price.id is not None
        assert store_price.is_compliant is True

    def test_overpriced_detection(
        self, store, product, official_price, store_owner
    ):
        store_price = StorePrice.objects.create(
            store=store,
            product=product,
            official_price=official_price,
            price=Decimal('110000'),
            official_price_amount=Decimal('100000'),
            min_allowed_price_amount=Decimal('80000'),
            price_date=timezone.now().date(),
            created_by=store_owner,
        )
        assert store_price.is_overpriced is True
        assert store_price.is_compliant is False
        assert store_price.violation_amount == Decimal('10000')

    def test_discount_percent(
        self, store, product, official_price, store_owner
    ):
        store_price = StorePrice.objects.create(
            store=store,
            product=product,
            official_price=official_price,
            price=Decimal('85000'),
            official_price_amount=Decimal('100000'),
            min_allowed_price_amount=Decimal('80000'),
            price_date=timezone.now().date(),
            created_by=store_owner,
        )
        assert store_price.discount_percent == Decimal('15.00')

    def test_unique_constraint(
        self, store, product, official_price, store_owner
    ):
        today = timezone.now().date()
        StorePrice.objects.create(
            store=store,
            product=product,
            official_price=official_price,
            price=Decimal('90000'),
            official_price_amount=Decimal('100000'),
            min_allowed_price_amount=Decimal('80000'),
            price_date=today,
            created_by=store_owner,
        )
        with pytest.raises(Exception):
            StorePrice.objects.create(
                store=store,
                product=product,
                official_price=official_price,
                price=Decimal('95000'),
                official_price_amount=Decimal('100000'),
                min_allowed_price_amount=Decimal('80000'),
                price_date=today,
                created_by=store_owner,
            )