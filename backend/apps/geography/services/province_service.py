"""
Province Service - منطق کسب‌وکار مربوط به استان

قانون: تمام عملیات نوشتن (create/update/delete) از اینجا می‌گذرند.
"""
from typing import Optional
from apps.common.base import BaseService
from apps.common.exceptions import (
    ResourceNotFoundError,
    ResourceAlreadyExistsError,
)
from apps.geography.models import Province
from apps.geography.selectors import ProvinceSelector


class ProvinceService(BaseService):

    def __init__(self):
        self.selector = ProvinceSelector()

    def create(
        self,
        *,
        name: str,
        code: str,
        is_active: bool = True
    ) -> Province:
        """
        ایجاد استان جدید.

        Args:
            name: نام استان
            code: کد یکتای استان
            is_active: وضعیت فعال بودن

        Returns:
            Province: استان ایجاد شده

        Raises:
            ResourceAlreadyExistsError: اگر نام یا کد تکراری باشد
        """
        if self.selector.exists_by_name(name):
            raise ResourceAlreadyExistsError(
                f'استانی با نام "{name}" قبلاً ثبت شده است'
            )

        if Province.objects.filter(code=code).exists():
            raise ResourceAlreadyExistsError(
                f'استانی با کد "{code}" قبلاً ثبت شده است'
            )

        with self.transaction():
            province = Province.objects.create(
                name=name,
                code=code,
                is_active=is_active
            )
            self.log_info(
                f'Province created: {province.name}',
                province_id=province.id
            )
            return province

    def update(
        self,
        *,
        province_id: int,
        name: Optional[str] = None,
        code: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Province:
        """
        ویرایش استان.

        Args:
            province_id: شناسه استان
            name: نام جدید (اختیاری)
            code: کد جدید (اختیاری)
            is_active: وضعیت جدید (اختیاری)

        Returns:
            Province: استان ویرایش شده

        Raises:
            ResourceNotFoundError: اگر استان یافت نشود
            ResourceAlreadyExistsError: اگر نام تکراری باشد
        """
        province = Province.objects.filter(id=province_id).first()
        if not province:
            raise ResourceNotFoundError('استان مورد نظر یافت نشد')

        if name and name != province.name:
            if self.selector.exists_by_name(name, exclude_id=province_id):
                raise ResourceAlreadyExistsError(
                    f'استانی با نام "{name}" قبلاً ثبت شده است'
                )
            province.name = name

        if code and code != province.code:
            if Province.objects.filter(code=code).exclude(
                id=province_id
            ).exists():
                raise ResourceAlreadyExistsError(
                    f'استانی با کد "{code}" قبلاً ثبت شده است'
                )
            province.code = code

        if is_active is not None:
            province.is_active = is_active

        with self.transaction():
            province.save()
            self.log_info(
                f'Province updated: {province.name}',
                province_id=province.id
            )
            return province

    def toggle_active(self, *, province_id: int) -> Province:
        """
        تغییر وضعیت فعال/غیرفعال استان.

        Raises:
            ResourceNotFoundError: اگر استان یافت نشود
        """
        province = Province.objects.filter(id=province_id).first()
        if not province:
            raise ResourceNotFoundError('استان مورد نظر یافت نشد')

        with self.transaction():
            province.is_active = not province.is_active
            province.save(update_fields=['is_active', 'updated_at'])
            self.log_info(
                f'Province status toggled: {province.name} '
                f'→ {"active" if province.is_active else "inactive"}',
                province_id=province.id
            )
            return province