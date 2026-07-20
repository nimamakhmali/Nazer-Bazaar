"""
تست Service های Stores
"""
import pytest
from apps.geography.models import Province, City
from apps.accounts.models import User
from apps.organizations.models import Chamber, Union
from apps.stores.models import Store
from apps.stores.services import StoreService
from apps.common.choices import StoreStatus, UserRole
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
def store_owner(db):
    return User.objects.create_user(
        phone_number='09111111111',
        role=UserRole.STORE_OWNER
    )


@pytest.fixture
def setup_org(db):
    province = Province.objects.create(name='تهران', code='08')
    city = City.objects.create(name='تهران', province=province)
    chamber = Chamber.objects.create(city=city, name='اتاق اصناف تهران')
    union = Union.objects.create(chamber=chamber, name='اتحادیه مرغ‌فروشان')
    return union


@pytest.mark.django_db
class TestStoreService:

    def setup_method(self):
        self.service = StoreService()

    def test_register_store_success(self, setup_org, store_owner, admin_user):
        store = self.service.register(
            union_id=setup_org.id,
            owner_id=store_owner.id,
            name='مرغ‌فروشی احمدی',
            license_number='LIC-001',
            address='تهران، خیابان ولیعصر',
            requesting_user=admin_user
        )
        assert store.id is not None
        assert store.status == StoreStatus.PENDING

    def test_register_duplicate_license(
        self, setup_org, store_owner, admin_user
    ):
        self.service.register(
            union_id=setup_org.id,
            owner_id=store_owner.id,
            name='فروشگاه اول',
            license_number='LIC-001',
            address='آدرس اول',
            requesting_user=admin_user
        )
        with pytest.raises(ResourceAlreadyExistsError):
            self.service.register(
                union_id=setup_org.id,
                owner_id=store_owner.id,
                name='فروشگاه دوم',
                license_number='LIC-001',
                address='آدرس دوم',
                requesting_user=admin_user
            )

    def test_approve_store(self, setup_org, store_owner, admin_user):
        store = self.service.register(
            union_id=setup_org.id,
            owner_id=store_owner.id,
            name='مرغ‌فروشی احمدی',
            license_number='LIC-001',
            address='تهران',
            requesting_user=admin_user
        )
        approved = self.service.approve(
            store_id=store.id,
            requesting_user=admin_user
        )
        assert approved.status == StoreStatus.ACTIVE
        assert approved.can_set_price is True

    def test_suspend_store(self, setup_org, store_owner, admin_user):
        store = self.service.register(
            union_id=setup_org.id,
            owner_id=store_owner.id,
            name='مرغ‌فروشی احمدی',
            license_number='LIC-001',
            address='تهران',
            requesting_user=admin_user
        )
        self.service.approve(
            store_id=store.id,
            requesting_user=admin_user
        )
        suspended = self.service.suspend(
            store_id=store.id,
            reason='گران‌فروشی مکرر',
            requesting_user=admin_user
        )
        assert suspended.status == StoreStatus.SUSPENDED
        assert suspended.rejection_reason == 'گران‌فروشی مکرر'

    def test_register_invalid_union(self, store_owner, admin_user):
        with pytest.raises(ResourceNotFoundError):
            self.service.register(
                union_id=9999,
                owner_id=store_owner.id,
                name='فروشگاه',
                license_number='LIC-001',
                address='آدرس',
                requesting_user=admin_user
            )