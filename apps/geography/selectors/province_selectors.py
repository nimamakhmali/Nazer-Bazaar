
from typing import Optional
from django.db.models import QuerySet, Prefetch
from apps.common.base import BaseSelector
from apps.geography.models import Province, City


class ProvinceSelector(BaseSelector):

    @staticmethod
    def get_all_active() -> QuerySet:
        """
        تمام استان‌های فعال.
        برای dropdown و لیست‌ها استفاده می‌شود.
        """
        return Province.objects.filter(
            is_active=True
        ).order_by('name')

    @staticmethod
    def get_all_with_cities() -> QuerySet:
        """
        تمام استان‌های فعال به همراه شهرهای فعالشان.
        از Prefetch برای جلوگیری از N+1 query استفاده می‌کند.
        """
        active_cities = City.objects.filter(is_active=True)
        return Province.objects.filter(
            is_active=True
        ).prefetch_related(
            Prefetch('cities', queryset=active_cities)
        ).order_by('name')

    @staticmethod
    def get_by_id(province_id: int) -> Optional[Province]:
        """دریافت استان با ID"""
        return ProvinceSelector.get_or_none(
            Province,
            id=province_id,
            is_active=True
        )

    @staticmethod
    def get_by_code(code: str) -> Optional[Province]:
        """دریافت استان با کد"""
        return ProvinceSelector.get_or_none(
            Province,
            code=code,
            is_active=True
        )

    @staticmethod
    def exists_by_name(name: str, exclude_id: int = None) -> bool:
        """
        بررسی وجود استان با این نام.
        برای جلوگیری از ثبت تکراری استفاده می‌شود.
        """
        qs = Province.objects.filter(name=name)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    @staticmethod
    def get_all() -> QuerySet:
        """تمام استان‌ها (برای ادمین)"""
        return Province.objects.all().order_by('name')