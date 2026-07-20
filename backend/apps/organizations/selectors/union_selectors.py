"""
Union Selectors
"""
from typing import Optional
from django.db.models import QuerySet, Q
from apps.common.base import BaseSelector
from apps.organizations.models import Union


class UnionSelector(BaseSelector):

    @staticmethod
    def get_all_active() -> QuerySet:
        """تمام اتحادیه‌های فعال"""
        return Union.objects.select_related(
            'chamber',
            'chamber__city',
            'chamber__city__province',
            'manager',
        ).filter(
            is_active=True
        ).order_by('chamber__city__name', 'name')

    @staticmethod
    def get_by_id(union_id: int) -> Optional[Union]:
        """دریافت اتحادیه با ID"""
        try:
            return Union.objects.select_related(
                'chamber',
                'chamber__city',
                'chamber__city__province',
                'manager',
            ).get(id=union_id, is_active=True)
        except Union.DoesNotExist:
            return None

    @staticmethod
    def get_by_chamber(chamber_id: int) -> QuerySet:
        """تمام اتحادیه‌های یک اتاق اصناف"""
        return Union.objects.select_related(
            'chamber',
            'chamber__city',
            'manager',
        ).filter(
            chamber_id=chamber_id,
            is_active=True
        ).order_by('name')

    @staticmethod
    def get_by_city(city_id: int) -> QuerySet:
        """تمام اتحادیه‌های یک شهر"""
        return Union.objects.select_related(
            'chamber',
            'chamber__city',
            'manager',
        ).filter(
            chamber__city_id=city_id,
            is_active=True
        ).order_by('name')

    @staticmethod
    def get_by_province(province_id: int) -> QuerySet:
        """تمام اتحادیه‌های یک استان"""
        return Union.objects.select_related(
            'chamber',
            'chamber__city',
            'chamber__city__province',
            'manager',
        ).filter(
            chamber__city__province_id=province_id,
            is_active=True
        ).order_by('chamber__city__name', 'name')

    @staticmethod
    def get_by_manager(user_id: int) -> Optional[Union]:
        """دریافت اتحادیه‌ای که یک کاربر رئیس آن است"""
        try:
            return Union.objects.select_related(
                'chamber',
                'chamber__city',
                'chamber__city__province',
                'manager',
            ).get(manager_id=user_id, is_active=True)
        except Union.DoesNotExist:
            return None

    @staticmethod
    def search(query: str) -> QuerySet:
        """جستجو در نام اتحادیه، شهر یا استان"""
        return Union.objects.select_related(
            'chamber',
            'chamber__city',
            'chamber__city__province',
            'manager',
        ).filter(
            is_active=True
        ).filter(
            Q(name__icontains=query) |
            Q(chamber__city__name__icontains=query) |
            Q(chamber__city__province__name__icontains=query)
        ).order_by('name')

    @staticmethod
    def exists_in_chamber(
        name: str,
        chamber_id: int,
        exclude_id: int = None
    ) -> bool:
        """بررسی وجود اتحادیه با این نام در اتاق اصناف"""
        qs = Union.objects.filter(
            name=name,
            chamber_id=chamber_id
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    @staticmethod
    def get_all() -> QuerySet:
        """تمام اتحادیه‌ها (برای ادمین)"""
        return Union.objects.select_related(
            'chamber',
            'chamber__city',
            'chamber__city__province',
            'manager',
        ).all().order_by('chamber__city__name', 'name')