"""
Chamber Selectors
"""
from typing import Optional
from django.db.models import QuerySet, Prefetch
from apps.common.base import BaseSelector
from apps.organizations.models import Chamber, Union


class ChamberSelector(BaseSelector):

    @staticmethod
    def get_all_active() -> QuerySet:
        """تمام اتاق‌های اصناف فعال"""
        return Chamber.objects.select_related(
            'city',
            'city__province',
            'manager',
        ).filter(
            is_active=True
        ).order_by('city__province__name', 'city__name')

    @staticmethod
    def get_by_id(chamber_id: int) -> Optional[Chamber]:
        """دریافت اتاق اصناف با ID"""
        try:
            return Chamber.objects.select_related(
                'city',
                'city__province',
                'manager',
            ).get(id=chamber_id, is_active=True)
        except Chamber.DoesNotExist:
            return None

    @staticmethod
    def get_by_city(city_id: int) -> Optional[Chamber]:
        """دریافت اتاق اصناف یک شهر"""
        try:
            return Chamber.objects.select_related(
                'city',
                'city__province',
                'manager',
            ).get(city_id=city_id, is_active=True)
        except Chamber.DoesNotExist:
            return None

    @staticmethod
    def get_by_province(province_id: int) -> QuerySet:
        """تمام اتاق‌های اصناف یک استان"""
        return Chamber.objects.select_related(
            'city',
            'city__province',
            'manager',
        ).filter(
            city__province_id=province_id,
            is_active=True
        ).order_by('city__name')

    @staticmethod
    def get_by_manager(user_id: int) -> Optional[Chamber]:
        """دریافت اتاق اصنافی که یک کاربر مدیر آن است"""
        try:
            return Chamber.objects.select_related(
                'city',
                'city__province',
                'manager',
            ).get(manager_id=user_id, is_active=True)
        except Chamber.DoesNotExist:
            return None

    @staticmethod
    def get_with_unions(chamber_id: int) -> Optional[Chamber]:
        """دریافت اتاق اصناف به همراه اتحادیه‌هایش"""
        active_unions = Union.objects.filter(
            is_active=True
        ).select_related('manager')

        try:
            return Chamber.objects.select_related(
                'city',
                'city__province',
                'manager',
            ).prefetch_related(
                Prefetch('unions', queryset=active_unions)
            ).get(id=chamber_id, is_active=True)
        except Chamber.DoesNotExist:
            return None

    @staticmethod
    def city_has_chamber(city_id: int) -> bool:
        """بررسی اینکه آیا شهر اتاق اصناف دارد"""
        return Chamber.objects.filter(
            city_id=city_id
        ).exists()

    @staticmethod
    def get_all() -> QuerySet:
        """تمام اتاق‌های اصناف (برای ادمین)"""
        return Chamber.objects.select_related(
            'city',
            'city__province',
            'manager',
        ).all().order_by('city__province__name', 'city__name')