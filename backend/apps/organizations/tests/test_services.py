"""
تست Service های Organizations
"""
import pytest
from apps.geography.models import Province, City
from apps.accounts.models import User
from apps.organizations.models import ProvinceOffice, Chamber, Union
from apps.organizations.services import (
    ProvinceOfficeService,
    ChamberService,
    UnionService,
)
from apps.common.choices import UserRole
from apps.common.exceptions import (
    ResourceNotFoundError,
    ResourceAlreadyExistsError,
    UnauthorizedOrganizationAccess,
)


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        phone_number='09000000000',
        password='admin123'
    )


@pytest.fixture
def province_manager(db):
    return User.objects.create_user(
        phone_number='09100000001',
        role=UserRole.PROVINCE_MANAGER
    )


@pytest.fixture
def chamber_manager(db):
    return User.objects.create_user(
        phone_number='09100000002',
        role=UserRole.CHAMBER_MANAGER
    )


@pytest.fixture
def union_manager(db):
    return User.objects.create_user(
        phone_number='09100000003',
        role=UserRole.UNION_MANAGER
    )


@pytest.fixture
def province(db):
    return Province.objects.create(name='تهران', code='08')


@pytest.fixture
def city(db, province):
    return City.objects.create(name='تهران', province=province)


@pytest.fixture
def province_office(db, province, province_manager, admin_user):
    service = ProvinceOfficeService()
    return service.create(
        province_id=province.id,
        name='استانداری تهران',
        manager_id=province_manager.id,
        requesting_user=admin_user
    )


@pytest.fixture
def chamber(db, city, chamber_manager, admin_user):
    service = ChamberService()
    return service.create(
        city_id=city.id,
        name='اتاق اصناف تهران',
        manager_id=chamber_manager.id,
        requesting_user=admin_user
    )


@pytest.mark.django_db
class TestProvinceOfficeService:

    def test_create_success(self, province, admin_user):
        service = ProvinceOfficeService()
        office = service.create(
            province_id=province.id,
            name='استانداری تهران',
            requesting_user=admin_user
        )
        assert office.id is not None
        assert office.province == province

    def test_create_duplicate_province(
        self, province, admin_user, province_office
    ):
        service = ProvinceOfficeService()
        with pytest.raises(ResourceAlreadyExistsError):
            service.create(
                province_id=province.id,
                name='استانداری دیگر',
                requesting_user=admin_user
            )

    def test_create_non_admin_raises_error(
        self, province, province_manager
    ):
        service = ProvinceOfficeService()
        with pytest.raises(PermissionError):
            service.create(
                province_id=province.id,
                name='استانداری تهران',
                requesting_user=province_manager
            )

    def test_update_success(self, province_office, admin_user):
        service = ProvinceOfficeService()
        updated = service.update(
            office_id=province_office.id,
            name='استانداری تهران بزرگ',
            requesting_user=admin_user
        )
        assert updated.name == 'استانداری تهران بزرگ'


@pytest.mark.django_db
class TestChamberService:

    def test_create_success(self, city, admin_user):
        service = ChamberService()
        chamber = service.create(
            city_id=city.id,
            name='اتاق اصناف تهران',
            requesting_user=admin_user
        )
        assert chamber.id is not None
        assert chamber.city == city

    def test_create_duplicate_city(self, city, admin_user, chamber):
        service = ChamberService()
        with pytest.raises(ResourceAlreadyExistsError):
            service.create(
                city_id=city.id,
                name='اتاق اصناف دیگر',
                requesting_user=admin_user
            )

    def test_create_invalid_city(self, admin_user):
        service = ChamberService()
        with pytest.raises(ResourceNotFoundError):
            service.create(
                city_id=9999,
                name='اتاق اصناف',
                requesting_user=admin_user
            )


@pytest.mark.django_db
class TestUnionService:

    def test_create_success(self, chamber, admin_user):
        service = UnionService()
        union = service.create(
            chamber_id=chamber.id,
            name='اتحادیه مرغ‌فروشان',
            requesting_user=admin_user
        )
        assert union.id is not None
        assert union.chamber == chamber

    def test_create_duplicate_name_in_chamber(
        self, chamber, admin_user
    ):
        service = UnionService()
        service.create(
            chamber_id=chamber.id,
            name='اتحادیه مرغ‌فروشان',
            requesting_user=admin_user
        )
        with pytest.raises(ResourceAlreadyExistsError):
            service.create(
                chamber_id=chamber.id,
                name='اتحادیه مرغ‌فروشان',
                requesting_user=admin_user
            )

    def test_toggle_active(self, chamber, admin_user):
        service = UnionService()
        union = service.create(
            chamber_id=chamber.id,
            name='اتحادیه مرغ‌فروشان',
            requesting_user=admin_user
        )
        assert union.is_active is True

        toggled = service.toggle_active(
            union_id=union.id,
            requesting_user=admin_user
        )
        assert toggled.is_active is False