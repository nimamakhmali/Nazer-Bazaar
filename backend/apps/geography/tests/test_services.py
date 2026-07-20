"""
تست Service های Geography
"""
import pytest
from apps.common.exceptions import (
    ResourceNotFoundError,
    ResourceAlreadyExistsError,
)
from apps.geography.models import Province, City
from apps.geography.services import ProvinceService, CityService


@pytest.mark.django_db
class TestProvinceService:

    def setup_method(self):
        self.service = ProvinceService()

    def test_create_province_success(self):
        """ایجاد استان موفق"""
        province = self.service.create(name='تهران', code='01')
        assert province.name == 'تهران'
        assert province.code == '01'
        assert Province.objects.filter(name='تهران').exists()

    def test_create_province_duplicate_name(self):
        """ایجاد استان با نام تکراری باید خطا دهد"""
        self.service.create(name='تهران', code='01')
        with pytest.raises(ResourceAlreadyExistsError):
            self.service.create(name='تهران', code='02')

    def test_update_province_success(self):
        """ویرایش استان موفق"""
        province = self.service.create(name='تهران', code='01')
        updated = self.service.update(
            province_id=province.id,
            name='تهران بزرگ'
        )
        assert updated.name == 'تهران بزرگ'

    def test_update_province_not_found(self):
        """ویرایش استان ناموجود باید خطا دهد"""
        with pytest.raises(ResourceNotFoundError):
            self.service.update(province_id=9999, name='تست')

    def test_toggle_active(self):
        """تغییر وضعیت فعال/غیرفعال"""
        province = self.service.create(name='تهران', code='01')
        assert province.is_active is True

        toggled = self.service.toggle_active(province_id=province.id)
        assert toggled.is_active is False

        toggled_back = self.service.toggle_active(province_id=province.id)
        assert toggled_back.is_active is True


@pytest.mark.django_db
class TestCityService:

    def setup_method(self):
        self.service = CityService()
        self.province = Province.objects.create(name='تهران', code='01')

    def test_create_city_success(self):
        """ایجاد شهر موفق"""
        city = self.service.create(
            name='شهریار',
            province_id=self.province.id
        )
        assert city.name == 'شهریار'
        assert city.province == self.province

    def test_create_city_invalid_province(self):
        """ایجاد شهر با استان ناموجود باید خطا دهد"""
        with pytest.raises(ResourceNotFoundError):
            self.service.create(name='شهریار', province_id=9999)

    def test_create_city_duplicate_in_province(self):
        """ایجاد شهر تکراری در یک استان باید خطا دهد"""
        self.service.create(name='تهران', province_id=self.province.id)
        with pytest.raises(ResourceAlreadyExistsError):
            self.service.create(
                name='تهران',
                province_id=self.province.id
            )