"""
تست مدل‌های Organizations
"""
import pytest
from apps.geography.models import Province, City
from apps.accounts.models import User
from apps.organizations.models import ProvinceOffice, Chamber, Union
from apps.common.choices import UserRole


@pytest.fixture
def province(db):
    return Province.objects.create(name='تهران', code='08')


@pytest.fixture
def city(db, province):
    return City.objects.create(name='تهران', province=province)


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
def province_office(db, province, province_manager):
    return ProvinceOffice.objects.create(
        province=province,
        manager=province_manager,
        name='استانداری تهران'
    )


@pytest.fixture
def chamber(db, city, chamber_manager):
    return Chamber.objects.create(
        city=city,
        manager=chamber_manager,
        name='اتاق اصناف تهران'
    )


@pytest.fixture
def union(db, chamber, union_manager):
    return Union.objects.create(
        chamber=chamber,
        manager=union_manager,
        name='اتحادیه مرغ‌فروشان'
    )


@pytest.mark.django_db
class TestProvinceOfficeModel:

    def test_create_province_office(self, province_office):
        assert province_office.id is not None
        assert province_office.province_name == 'تهران'
        assert province_office.is_active is True

    def test_str(self, province_office):
        assert str(province_office) == 'استانداری تهران'

    def test_one_office_per_province(self, province, province_manager):
        ProvinceOffice.objects.create(
            province=province,
            name='دفتر اول'
        )
        with pytest.raises(Exception):
            ProvinceOffice.objects.create(
                province=province,
                name='دفتر دوم'
            )


@pytest.mark.django_db
class TestChamberModel:

    def test_create_chamber(self, chamber):
        assert chamber.id is not None
        assert chamber.city_name == 'تهران'
        assert chamber.province_name == 'تهران'
        assert chamber.is_active is True

    def test_str(self, chamber):
        assert str(chamber) == 'اتاق اصناف تهران'

    def test_one_chamber_per_city(self, city):
        Chamber.objects.create(city=city, name='اتاق اول')
        with pytest.raises(Exception):
            Chamber.objects.create(city=city, name='اتاق دوم')


@pytest.mark.django_db
class TestUnionModel:

    def test_create_union(self, union):
        assert union.id is not None
        assert union.city_name == 'تهران'
        assert union.is_active is True

    def test_str(self, union):
        assert 'اتحادیه مرغ‌فروشان' in str(union)

    def test_full_path(self, union):
        path = union.full_path
        assert 'تهران' in path
        assert 'اتحادیه مرغ‌فروشان' in path

    def test_unique_union_in_chamber(self, chamber):
        Union.objects.create(chamber=chamber, name='اتحادیه مرغ‌فروشان')
        with pytest.raises(Exception):
            Union.objects.create(
                chamber=chamber,
                name='اتحادیه مرغ‌فروشان'
            )