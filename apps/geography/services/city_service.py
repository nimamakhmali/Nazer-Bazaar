
from typing import Optional
from apps.common.base import BaseService
from apps.common.exceptions import (
    ResourceNotFoundError,
    ResourceAlreadyExistsError,
)
from apps.geography.models import City, Province
from apps.geography.selectors import CitySelector


class CityService(BaseService):

    def __init__(self):
        self.selector = CitySelector()

    def create(
        self,
        *,
        name: str,
        province_id: int,
        is_active: bool = True
    ) -> City:
        """
        ایجاد شهر جدید.

        Args:
            name: نام شهر
            province_id: شناسه استان
            is_active: وضعیت فعال بودن

        Returns:
            City: شهر ایجاد شده

        Raises:
            ResourceNotFoundError: اگر استان یافت نشود
            ResourceAlreadyExistsError: اگر شهر تکراری باشد
        """
        # بررسی وجود استان
        province = Province.objects.filter(
            id=province_id,
            is_active=True
        ).first()
        if not province:
            raise ResourceNotFoundError('استان مورد نظر یافت نشد')

        # بررسی تکراری نبودن شهر در استان
        if self.selector.exists_in_province(name, province_id):
            raise ResourceAlreadyExistsError(
                f'شهری با نام "{name}" در استان "{province.name}" '
                f'قبلاً ثبت شده است'
            )

        with self.transaction():
            city = City.objects.create(
                name=name,
                province=province,
                is_active=is_active
            )
            self.log_info(
                f'City created: {city.name} in {province.name}',
                city_id=city.id,
                province_id=province_id
            )
            return city

    def update(
        self,
        *,
        city_id: int,
        name: Optional[str] = None,
        province_id: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> City:
        """
        ویرایش شهر.

        Raises:
            ResourceNotFoundError: اگر شهر یا استان یافت نشود
            ResourceAlreadyExistsError: اگر نام تکراری باشد
        """
        city = City.objects.select_related(
            'province'
        ).filter(id=city_id).first()

        if not city:
            raise ResourceNotFoundError('شهر مورد نظر یافت نشد')

        # تغییر استان
        if province_id and province_id != city.province_id:
            province = Province.objects.filter(
                id=province_id,
                is_active=True
            ).first()
            if not province:
                raise ResourceNotFoundError('استان مورد نظر یافت نشد')
            city.province = province

        # تغییر نام
        if name and name != city.name:
            target_province_id = province_id or city.province_id
            if self.selector.exists_in_province(
                name,
                target_province_id,
                exclude_id=city_id
            ):
                raise ResourceAlreadyExistsError(
                    f'شهری با نام "{name}" در این استان قبلاً ثبت شده است'
                )
            city.name = name

        if is_active is not None:
            city.is_active = is_active

        with self.transaction():
            city.save()
            self.log_info(
                f'City updated: {city.name}',
                city_id=city.id
            )
            return city

    def toggle_active(self, *, city_id: int) -> City:
        """تغییر وضعیت فعال/غیرفعال شهر"""
        city = City.objects.filter(id=city_id).first()
        if not city:
            raise ResourceNotFoundError('شهر مورد نظر یافت نشد')

        with self.transaction():
            city.is_active = not city.is_active
            city.save(update_fields=['is_active', 'updated_at'])
            self.log_info(
                f'City status toggled: {city.name}',
                city_id=city.id
            )
            return city