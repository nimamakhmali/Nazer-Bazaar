"""
تست مدل‌های Stores
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from apps.geography.models import Province, City
from apps.accounts.models import User
from apps.organizations.models import Chamber, Union
from apps.stores.models import Store, StoreDocument, StoreLicense
from apps.common.choices import StoreStatus, UserRole


@pytest.fixture
def setup_org(db):
    province = Province.objects.create(name='تهران', code='08')
    city = City.objects.create(name='تهران', province=province)
    chamber = Chamber.objects.create(city=city, name='اتاق اصناف تهران')
    union = Union.objects.create(
        chamber=chamber,
        name='اتحادیه مرغ‌فروشان'
    )
    return {'province': province, 'city': city, 'chamber': chamber, 'union': union}


@pytest.fixture
def store_owner(db):
    return User.objects.create_user(
        phone_number='09111111111',
        role=UserRole.STORE_OWNER
    )


@pytest.fixture
def store(db, setup_org, store_owner):
    return Store.objects.create(
        union=setup_org['union'],
        owner=store_owner,
        name='مرغ‌فروشی احمدی',
        license_number='LIC-001',
        address='تهران، خیابان ولیعصر',
    )


@pytest.mark.django_db
class TestStoreModel:

    def test_create_store(self, store):
        assert store.id is not None
        assert store.status == StoreStatus.PENDING
        assert store.is_active is True
        assert store.can_set_price is False

    def test_store_str(self, store):
        assert 'مرغ‌فروشی احمدی' in str(store)
        assert 'LIC-001' in str(store)

    def test_store_approve(self, store, store_owner):
        admin = User.objects.create_superuser(
            phone_number='09000000000',
            password='admin123'
        )
        store.approve(approved_by=admin)
        assert store.status == StoreStatus.ACTIVE
        assert store.can_set_price is True

    def test_store_suspend(self, store, store_owner):
        admin = User.objects.create_superuser(
            phone_number='09000000000',
            password='admin123'
        )
        store.approve(approved_by=admin)
        store.suspend(suspended_by=admin, reason='تست')
        assert store.status == StoreStatus.SUSPENDED
        assert store.can_set_price is False

    def test_store_city_name(self, store):
        assert store.city_name == 'تهران'

    def test_store_province_name(self, store):
        assert store.province_name == 'تهران'


@pytest.mark.django_db
class TestStoreDocumentModel:

    def test_create_document(self, store):
        from django.core.files.base import ContentFile
        doc = StoreDocument.objects.create(
            store=store,
            document_type='national_id',
            title='کارت ملی',
            file=ContentFile(b'test content', name='test.jpg'),
        )
        assert doc.id is not None
        assert doc.is_verified is False

    def test_document_verify(self, store):
        admin = User.objects.create_superuser(
            phone_number='09000000000',
            password='admin123'
        )
        from django.core.files.base import ContentFile
        doc = StoreDocument.objects.create(
            store=store,
            document_type='national_id',
            title='کارت ملی',
            file=ContentFile(b'test content', name='test.jpg'),
        )
        doc.verify(verified_by=admin)
        assert doc.is_verified is True
        assert doc.verified_by == admin

    def test_document_is_expired(self, store):
        from django.core.files.base import ContentFile
        past_date = timezone.now().date() - timedelta(days=1)
        doc = StoreDocument.objects.create(
            store=store,
            document_type='health_certificate',
            title='گواهی بهداشت',
            file=ContentFile(b'test', name='test.jpg'),
            expire_date=past_date,
        )
        assert doc.is_expired is True


@pytest.mark.django_db
class TestStoreLicenseModel:

    def test_create_license(self, store):
        from datetime import date
        license_obj = StoreLicense.objects.create(
            store=store,
            license_number='LIC-001',
            issue_date=date(2024, 1, 1),
            expire_date=date(2025, 1, 1),
            issuing_authority='اتاق اصناف تهران',
            business_type='مرغ‌فروشی',
        )
        assert license_obj.id is not None
        assert license_obj.is_valid is True

    def test_license_needs_renewal(self, store):
        from datetime import date
        soon_date = timezone.now().date() + timedelta(days=15)
        license_obj = StoreLicense.objects.create(
            store=store,
            license_number='LIC-001',
            issue_date=date(2024, 1, 1),
            expire_date=soon_date,
            issuing_authority='اتاق اصناف تهران',
            business_type='مرغ‌فروشی',
        )
        assert license_obj.needs_renewal is True