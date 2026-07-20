"""
Union Service
"""
import logging
from typing import Optional
from apps.common.base import BaseService
from apps.common.choices import UserRole
from apps.common.exceptions import (
    ResourceNotFoundError,
    ResourceAlreadyExistsError,
    UnauthorizedOrganizationAccess,
)
from apps.organizations.models import Union, Chamber
from apps.organizations.selectors import UnionSelector

logger = logging.getLogger(__name__)


class UnionService(BaseService):

    def create(
        self,
        *,
        chamber_id: int,
        name: str,
        manager_id: int = None,
        description: str = '',
        license_number: str = None,
        established_year: int = None,
        phone: str = '',
        address: str = '',
        requesting_user
    ) -> Union:
        """
        ایجاد اتحادیه جدید.

        مجاز:
            - ادمین
            - ناظر استانداری (در استان خودش)
            - مدیر اتاق اصناف (در شهر خودش)
        """
        chamber = Chamber.objects.select_related(
            'city', 'city__province'
        ).filter(id=chamber_id, is_active=True).first()

        if not chamber:
            raise ResourceNotFoundError('اتاق اصناف مورد نظر یافت نشد')

        # بررسی دسترسی
        self._check_create_permission(chamber, requesting_user)

        # بررسی تکراری نبودن
        if UnionSelector.exists_in_chamber(name, chamber_id):
            raise ResourceAlreadyExistsError(
                f'اتحادیه‌ای با نام "{name}" '
                f'در این اتاق اصناف قبلاً ثبت شده است'
            )

        # بررسی مدیر
        manager = None
        if manager_id:
            from apps.organizations.services.province_office_service import (
                ProvinceOfficeService
            )
            manager = ProvinceOfficeService._get_valid_manager(
                manager_id,
                UserRole.UNION_MANAGER
            )

        with self.transaction():
            union = Union.objects.create(
                chamber=chamber,
                manager=manager,
                name=name,
                description=description,
                license_number=license_number,
                established_year=established_year,
                phone=phone,
                address=address,
            )
            self.log_info(
                f'Union created: {union.name} '
                f'in chamber: {chamber.name}',
                union_id=union.id,
                chamber_id=chamber_id,
                by=requesting_user.id
            )
            return union

    def update(
        self,
        *,
        union_id: int,
        name: Optional[str] = None,
        manager_id: Optional[int] = None,
        description: Optional[str] = None,
        license_number: Optional[str] = None,
        established_year: Optional[int] = None,
        phone: Optional[str] = None,
        address: Optional[str] = None,
        is_active: Optional[bool] = None,
        requesting_user
    ) -> Union:
        """ویرایش اتحادیه"""
        union = Union.objects.select_related(
            'chamber',
            'chamber__city',
            'chamber__city__province',
            'manager',
        ).filter(id=union_id).first()

        if not union:
            raise ResourceNotFoundError('اتحادیه مورد نظر یافت نشد')

        # بررسی دسترسی
        self._check_union_access(union, requesting_user)

        # بررسی تکراری نبودن نام
        if name and name != union.name:
            if UnionSelector.exists_in_chamber(
                name,
                union.chamber_id,
                exclude_id=union_id
            ):
                raise ResourceAlreadyExistsError(
                    f'اتحادیه‌ای با نام "{name}" '
                    f'در این اتاق اصناف قبلاً ثبت شده است'
                )

        update_fields = ['updated_at']

        if name is not None:
            union.name = name
            update_fields.append('name')

        if description is not None:
            union.description = description
            update_fields.append('description')

        if license_number is not None:
            union.license_number = license_number
            update_fields.append('license_number')

        if established_year is not None:
            union.established_year = established_year
            update_fields.append('established_year')

        if phone is not None:
            union.phone = phone
            update_fields.append('phone')

        if address is not None:
            union.address = address
            update_fields.append('address')

        # مدیر و وضعیت: فقط ادمین، استانداری، اتاق اصناف
        can_manage = (
            requesting_user.is_admin
            or requesting_user.is_province_manager
            or requesting_user.is_chamber_manager
        )
        if can_manage:
            if manager_id is not None:
                from apps.organizations.services.province_office_service\
                    import ProvinceOfficeService
                manager = ProvinceOfficeService._get_valid_manager(
                    manager_id,
                    UserRole.UNION_MANAGER
                )
                union.manager = manager
                update_fields.append('manager')

            if is_active is not None:
                union.is_active = is_active
                update_fields.append('is_active')

        with self.transaction():
            union.save(update_fields=update_fields)
            self.log_info(
                f'Union updated: {union.name}',
                union_id=union_id,
                by=requesting_user.id
            )
            return union

    def assign_manager(
        self,
        *,
        union_id: int,
        manager_id: int,
        requesting_user
    ) -> Union:
        """تخصیص رئیس به اتحادیه"""
        allowed_roles = [
            requesting_user.is_admin,
            requesting_user.is_province_manager,
            requesting_user.is_chamber_manager,
        ]
        if not any(allowed_roles):
            raise PermissionError(
                'شما دسترسی لازم برای تعیین رئیس اتحادیه را ندارید'
            )

        union = Union.objects.select_related(
            'chamber',
            'chamber__city',
            'chamber__city__province',
        ).filter(id=union_id).first()

        if not union:
            raise ResourceNotFoundError('اتحادیه مورد نظر یافت نشد')

        # بررسی دسترسی سازمانی
        self._check_union_access(union, requesting_user)

        from apps.organizations.services.province_office_service import (
            ProvinceOfficeService
        )
        manager = ProvinceOfficeService._get_valid_manager(
            manager_id,
            UserRole.UNION_MANAGER
        )

        with self.transaction():
            union.manager = manager
            union.save(update_fields=['manager', 'updated_at'])
            self.log_info(
                f'Manager assigned to Union: '
                f'{union.name} → {manager.full_name}',
                union_id=union_id,
                manager_id=manager_id,
                by=requesting_user.id
            )
            return union

    def toggle_active(
        self,
        *,
        union_id: int,
        requesting_user
    ) -> Union:
        """فعال/غیرفعال کردن اتحادیه"""
        union = Union.objects.select_related(
            'chamber',
            'chamber__city',
            'chamber__city__province',
        ).filter(id=union_id).first()

        if not union:
            raise ResourceNotFoundError('اتحادیه مورد نظر یافت نشد')

        self._check_union_access(union, requesting_user)

        with self.transaction():
            union.is_active = not union.is_active
            union.save(update_fields=['is_active', 'updated_at'])
            self.log_info(
                f'Union status toggled: {union.name} '
                f'→ {"active" if union.is_active else "inactive"}',
                union_id=union_id,
                by=requesting_user.id
            )
            return union

    @staticmethod
    def _check_create_permission(chamber: Chamber, user) -> None:
        """بررسی دسترسی برای ایجاد اتحادیه"""
        if user.is_admin:
            return

        if user.is_province_manager:
            from apps.organizations.services.chamber_service import (
                ChamberService
            )
            ChamberService._check_province_authority(
                chamber.city.province_id, user
            )
            return

        if user.is_chamber_manager:
            from apps.organizations.selectors import ChamberSelector
            user_chamber = ChamberSelector.get_by_manager(user.id)
            if user_chamber and user_chamber.id == chamber.id:
                return

        raise PermissionError(
            'شما دسترسی لازم برای ایجاد اتحادیه را ندارید'
        )

    @staticmethod
    def _check_union_access(union: Union, user) -> None:
        """بررسی دسترسی کاربر به اتحادیه"""
        if user.is_admin:
            return

        if user.is_province_manager:
            from apps.organizations.services.chamber_service import (
                ChamberService
            )
            ChamberService._check_province_authority(
                union.chamber.city.province_id, user
            )
            return

        if user.is_chamber_manager:
            from apps.organizations.selectors import ChamberSelector
            user_chamber = ChamberSelector.get_by_manager(user.id)
            if user_chamber and user_chamber.id == union.chamber_id:
                return

        if (
            user.is_union_manager
            and union.manager_id == user.id
        ):
            return

        raise UnauthorizedOrganizationAccess()