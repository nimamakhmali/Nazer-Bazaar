"""
تست مدل‌های Geography
"""
import pytest
from django.db import IntegrityError
from apps.geography.models import Province, City


@pytest.mark.django_db
class TestProvinceModel:

    def test_create_province_success(self):
        """ایجاد استان با داده‌های معتبر"""
        province = Province.objects.create(name='تهران', code='01')
        assert province.id is not None
        assert province.name == 'تهران'
        assert province.code == '01'
        assert province.is_active is True

    def test_province_str(self):
        """تست متد __str__"""
        province = Province.objects.create(name='اصفهان', code='04')
        assert str(province) == 'اصفهان'

    def test_province_unique_name(self):
        """نام استان باید یکتا باشد"""
        Province.objects.create(name='تهران', code='01')
        with pytest.raises(IntegrityError):
            Province.objects.create(name='تهران', code='02')

    def test_province_unique_code(self):
        """کد استان باید یکتا باشد"""
        Province.objects.create(name='تهران', code='01')
        with pytest.raises(IntegrityError):
            Province.objects.create(name='البرز', code='01')

    def test_province_cities_count(self):
        """تست property cities_count"""
        province = Province.objects.create(name='تهران', code='01')
        City.objects.create(name='تهران', province=province)
        City.objects.create(name='شهریار', province=province)
        assert province.cities_count == 2


@pytest.mark.django_db
class TestCityModel:

    def setup_method(self):
        self.province = Province.objects.create(
            name='تهران',
            code='01'
        )

    def test_create_city_success(self):
        """ایجاد شهر با داده‌های معتبر"""
        city = City.objects.create(
            name='تهران',
            province=self.province
        )
        assert city.id is not None
        assert city.name == 'تهران'
        assert city.province == self.province
        assert city.is_active is True

    def test_city_str(self):
        """تست متد __str__"""
        city = City.objects.create(
            name='شهریار',
            province=self.province
        )
        assert str(city) == 'شهریار - تهران'

    def test_city_full_name(self):
        """تست property full_name"""
        city = City.objects.create(
            name='تهران',
            province=self.province
        )
        assert city.full_name == 'تهران / تهران'

    def test_unique_city_per_province(self):
        """شهر تکراری در یک استان مجاز نیست"""
        City.objects.create(name='تهران', province=self.province)
        with pytest.raises(IntegrityError):
            City.objects.create(name='تهران', province=self.province)

    def test_same_city_name_different_province(self):
        """شهر با نام یکسان در استان‌های مختلف مجاز است"""
        province2 = Province.objects.create(name='البرز', code='02')
        city1 = City.objects.create(name='کرج', province=self.province)
        city2 = City.objects.create(name='کرج', province=province2)
        assert city1.id != city2.id