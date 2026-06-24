"""
ProvinceOffice Selectors
"""
from typing import Optional
from django.db.models import QuerySet
from apps.common.base import BaseSelector
from apps.organizations.models import ProvinceOffice


class ProvinceOfficeSelector(BaseSelector):

    @staticmethod
    def get_all_active() -> QuerySet:
        """
        تمام دفاتر استانداری فعال با اطلاعات کامل.
        از select_related برای جلوگیری از N+1 استفاده می‌کند.
        """
        return ProvinceOffice.objects.select_related(
            'province',
            'manager',
        ).filter(
            is_active=True
        ).order_by('province__name')

    @staticmethod
    def get_by_id(office_id: int) -> Optional[ProvinceOffice]:
        """دریافت دفتر استانداری با ID"""
        try:
            return ProvinceOffice.objects.select_related(
                'province',
                'manager',
            ).get(id=office_id, is_active=True)
        except ProvinceOffice.DoesNotExist:
            return None

    @staticmethod
    def get_by_province(province_id: int) -> Optional[ProvinceOffice]:
        """دریافت دفتر استانداری یک استان"""
        try:
            return ProvinceOffice.objects.select_related(
                'province',
                'manager',
            ).get(province_id=province_id, is_active=True)
        except ProvinceOffice.DoesNotExist:
            return None

    @staticmethod
    def get_by_manager(user_id: int) -> Optional[ProvinceOffice]:
        """دریافت دفتر استانداری که یک کاربر مدیر آن است"""
        try:
            return ProvinceOffice.objects.select_related(
                'province',
                'manager',
            ).get(manager_id=user_id, is_active=True)
        except ProvinceOffice.DoesNotExist:
            return None

    @staticmethod
    def province_has_office(province_id: int) -> bool:
        """بررسی اینکه آیا استان دفتر استانداری دارد"""
        return ProvinceOffice.objects.filter(
            province_id=province_id
        ).exists()

    @staticmethod
    def get_all() -> QuerySet:
        """تمام دفاتر (برای ادمین)"""
        return ProvinceOffice.objects.select_related(
            'province',
            'manager',
        ).all().order_by('province__name')