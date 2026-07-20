"""
تست Service های Pricing
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from apps.geography.models import Province, City
from apps.accounts.models import User
from apps.organizations.models import Chamber, Union
from apps.products.models import ProductUnit, ProductCategory, Product
from apps.stores.models import Store
from apps.pricing.services import OfficialPriceService, StorePriceService
from apps.common.choices import UserRole, StoreStatus
from apps.common.exceptions import (
    DuplicatePriceError,
    PriceValidationError,
    ResourceNotFoundError,
)


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
        role=UserRole.UNION_MANAGER,
        first_name='رئیس',
        last_name='اتحادیه'
    )


@pytest.fixture
def store_owner_user(db):
    return User.objects.create_user(
        phone_number='09100000002',
        role=UserRole.STORE_OWNER,
        first_name='صاحب',
        last_name='فروشگاه'
    )


@pytest.fixture
def setup(db, union_manager, store_owner_user):
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
    unit = ProductUnit.objects.create(name='کیلوگرم', symbol='kg')
    category = ProductCategory.objects.create(
        name='گوشت مرغ',
        slug='chicken'
    )
    product = Product.objects.create(
        name='مرغ گرم',
        slug='warm-chicken',
        category=category,
        unit=unit,
    )
    store = Store.objects.create(
        union=union,
        owner=store_owner_user,
        name='مرغ‌فروشی احمدی',
        license_number='LIC-001',
        address='تهران',
        status=StoreStatus.ACTIVE,
    )
    return {
        'union': union,
        'product': product,
        'store': store,
        'unit': unit,
    }


@pytest.mark.django_db
class TestOfficialPriceService:

    def setup_method(self):
        self.service = OfficialPriceService()

    def test_create_official_price_success(self, setup, union_manager):
        official_price = self.service.create(
            union_id=setup['union'].id,
            product_id=setup['product'].id,
            price=Decimal('100000'),
            requesting_user=union_manager
        )
        assert official_price.id is not None
        assert official_price.price == Decimal('100000')
        assert official_price.min_allowed_price == Decimal('80000')

    def test_create_by_admin_success(self, setup, admin_user):
        official_price = self.service.create(
            union_id=setup['union'].id,
            product_id=setup['product'].id,
            price=Decimal('150000'),
            requesting_user=admin_user
        )
        assert official_price.id is not None

    def test_create_duplicate_price_same_day(self, setup, union_manager):
        """ثبت دو قیمت مصوب برای یک محصول در یک روز"""
        self.service.create(
            union_id=setup['union'].id,
            product_id=setup['product'].id,
            price=Decimal('100000'),
            requesting_user=union_manager
        )
        with pytest.raises(DuplicatePriceError):
            self.service.create(
                union_id=setup['union'].id,
                product_id=setup['product'].id,
                price=Decimal('110000'),
                requesting_user=union_manager
            )

    def test_create_invalid_price_zero(self, setup, admin_user):
        with pytest.raises(PriceValidationError):
            self.service.create(
                union_id=setup['union'].id,
                product_id=setup['product'].id,
                price=Decimal('0'),
                requesting_user=admin_user
            )

    def test_create_by_unauthorized_user_raises(self, setup, store_owner_user):
        with pytest.raises(PermissionError):
            self.service.create(
                union_id=setup['union'].id,
                product_id=setup['product'].id,
                price=Decimal('100000'),
                requesting_user=store_owner_user
            )

    def test_history_created_on_create(self, setup, union_manager):
        """بررسی ثبت تاریخچه هنگام ایجاد قیمت مصوب"""
        from apps.pricing.models import PriceHistory, PriceChangeType
        official_price = self.service.create(
            union_id=setup['union'].id,
            product_id=setup['product'].id,
            price=Decimal('100000'),
            requesting_user=union_manager
        )
        history = PriceHistory.objects.filter(
            official_price=official_price,
            change_type=PriceChangeType.OFFICIAL_PRICE_CREATED
        ).first()
        assert history is not None
        assert history.new_price == Decimal('100000')


@pytest.mark.django_db
class TestStorePriceService:

    def setup_method(self):
        self.service = StorePriceService()
        self.official_service = OfficialPriceService()

    def _create_official_price(self, setup, union_manager):
        return self.official_service.create(
            union_id=setup['union'].id,
            product_id=setup['product'].id,
            price=Decimal('100000'),
            requesting_user=union_manager
        )

    def test_set_price_success(
        self, setup, union_manager, store_owner_user
    ):
        self._create_official_price(setup, union_manager)

        store_price = self.service.set_price(
            store_id=setup['store'].id,
            product_id=setup['product'].id,
            price=Decimal('90000'),
            requesting_user=store_owner_user
        )
        assert store_price.id is not None
        assert store_price.price == Decimal('90000')
        assert store_price.is_compliant is True

    def test_set_price_at_minimum(
        self, setup, union_manager, store_owner_user
    ):
        """ثبت قیمت دقیقاً 80% قیمت مصوب"""
        self._create_official_price(setup, union_manager)

        store_price = self.service.set_price(
            store_id=setup['store'].id,
            product_id=setup['product'].id,
            price=Decimal('80000'),
            requesting_user=store_owner_user
        )
        assert store_price.is_compliant is True

    def test_set_price_overpriced_raises(
        self, setup, union_manager, store_owner_user
    ):
        """قیمت بالاتر از مصوب باید خطا دهد"""
        self._create_official_price(setup, union_manager)

        with pytest.raises(PriceValidationError):
            self.service.set_price(
                store_id=setup['store'].id,
                product_id=setup['product'].id,
                price=Decimal('110000'),
                requesting_user=store_owner_user
            )

    def test_set_price_below_minimum_raises(
        self, setup, union_manager, store_owner_user
    ):
        """قیمت کمتر از 80% باید خطا دهد"""
        self._create_official_price(setup, union_manager)

        with pytest.raises(PriceValidationError):
            self.service.set_price(
                store_id=setup['store'].id,
                product_id=setup['product'].id,
                price=Decimal('79000'),
                requesting_user=store_owner_user
            )

    def test_set_price_without_official_price_raises(
        self, setup, store_owner_user
    ):
        """بدون قیمت مصوب نباید بتوان قیمت ثبت کرد"""
        with pytest.raises(ResourceNotFoundError):
            self.service.set_price(
                store_id=setup['store'].id,
                product_id=setup['product'].id,
                price=Decimal('90000'),
                requesting_user=store_owner_user
            )

    def test_update_price_same_day(
        self, setup, union_manager, store_owner_user
    ):
        """ثبت قیمت مجدد در همان روز - باید بروزرسانی شود"""
        self._create_official_price(setup, union_manager)

        store_price_1 = self.service.set_price(
            store_id=setup['store'].id,
            product_id=setup['product'].id,
            price=Decimal('90000'),
            requesting_user=store_owner_user
        )

        store_price_2 = self.service.set_price(
            store_id=setup['store'].id,
            product_id=setup['product'].id,
            price=Decimal('85000'),
            requesting_user=store_owner_user
        )

        assert store_price_1.id == store_price_2.id
        assert store_price_2.price == Decimal('85000')

    def test_suspended_store_cannot_set_price(
        self, setup, union_manager, store_owner_user
    ):
        """فروشگاه تعلیق‌شده نمی‌تواند قیمت ثبت کند"""
        from apps.common.choices import StoreStatus
        setup['store'].status = StoreStatus.SUSPENDED
        setup['store'].save()

        self._create_official_price(setup, union_manager)

        with pytest.raises(PermissionError):
            self.service.set_price(
                store_id=setup['store'].id,
                product_id=setup['product'].id,
                price=Decimal('90000'),
                requesting_user=store_owner_user
            )