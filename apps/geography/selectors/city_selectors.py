"""
City Selectors - تمام کوئری‌های مربوط به شهر
"""
from typing import Optional
from django.db.models import QuerySet
from apps.common.base import BaseSelector
from apps.geography.models import City


class CitySelector(BaseSelector):

    @staticmethod
    def get_by_province(province_id: int) -> QuerySet:
        """
        شهرهای فعال یک استان.
        برای dropdown شهر بعد از انتخاب استان استفاده می‌شود.
        """
        return City.objects.filter(
            province_id=province_id,
            is_active=True
        ).order_by('name')

    @staticmethod
    def get_by_id(city_id: int) -> Optional[City]:
        """دریافت شهر با ID"""
        return CitySelector.get_or_none(
            City,
            id=city_id,
            is_active=True
        )

    @staticmethod
    def get_by_id_with_province(city_id: int) -> Optional[City]:
        """
        دریافت شهر به همراه اطلاعات استان.
        از select_related برای جلوگیری از query اضافه استفاده می‌کند.
        """
        try:
            return City.objects.select_related(
                'province'
            ).get(
                id=city_id,
                is_active=True
            )
        except City.DoesNotExist:
            return None

    @staticmethod
    def exists_in_province(
        name: str,
        province_id: int,
        exclude_id: int = None
    ) -> bool:
        """
        بررسی وجود شهر با این نام در استان.
        برای جلوگیری از ثبت تکراری استفاده می‌شود.
        """
        qs = City.objects.filter(
            name=name,
            province_id=province_id
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    @staticmethod
    def get_all_active() -> QuerySet:
        """تمام شهرهای فعال با اطلاعات استان"""
        return City.objects.select_related(
            'province'
        ).filter(
            is_active=True
        ).order_by('province__name', 'name')

    @staticmethod
    def search(query: str) -> QuerySet:
        """جستجو در نام شهر و استان"""
        return City.objects.select_related(
            'province'
        ).filter(
            is_active=True
        ).filter(
            models.Q(name__icontains=query) |
            models.Q(province__name__icontains=query)
        ).order_by('name')