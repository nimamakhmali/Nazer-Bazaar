"""
Chamber Service
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
from apps.organizations.models import Chamber
from apps.organizations.selectors import ChamberSelector

logger = logging.getLogger(__name__)


class ChamberService(BaseService):

    def create(
        self,
        *,
        city_id: int,
        name: str,
        manager_id: int = None,
        address: str = '',
        phone: str = '',
        email: str = '',
        established_year: int = None,
        requesting_user
    ) -> Chamber:
        """
        ایجاد اتاق اصناف برای یک شهر.
        فقط ادمین یا ناظر استانداری همان استان.
        """
        # بررسی دسترسی
        self._check_create_permission(city_id, requesting_user)

        # بررسی وجود شهر
        from apps.geography.models import City
        city = City.objects.select_related(
            'province'
        ).filter(id=city_id, is_active=True).first()

        if not city:
            raise ResourceNotFoundError('شهر مورد نظر یافت نشد')

        # بررسی تکراری نبودن
        if ChamberSelector.city_has_chamber(city_id):
            raise ResourceAlreadyExistsError(
                f'شهر "{city.name}" قبلاً اتاق اصناف دارد'
            )

        # بررسی مدیر
        manager = None
        if manager_id:
            from apps.organizations.services.province_office_service import (
                ProvinceOfficeService
            )
            manager = ProvinceOfficeService._get_valid_manager(
                manager_id,
                UserRole.CHAMBER_MANAGER
            )

        with self.transaction():
            chamber = Chamber.objects.create(
                city=city,
                manager=manager,
                name=name,
                address=address,
                phone=phone,
                email=email,
                established_year=established_year,
            )
            self.log_info(
                f'Chamber created: {chamber.name} '
                f'in city: {city.name}',
                chamber_id=chamber.id,
                city_id=city_id,
                by=requesting_user.id
            )
            return chamber

    def update(
        self,
        *,
        chamber_id: int,
        name: Optional[str] = None,
        manager_id: Optional[int] = None,
        address: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        established_year: Optional[int] = None,
        is_active: Optional[bool] = None,
        requesting_user
    ) -> Chamber:
        """ویرایش اتاق اصناف"""
        chamber = Chamber.objects.select_related(
            'city', 'city__province', 'manager'
        ).filter(id=chamber_id).first()

        if not chamber:
            raise ResourceNotFoundError('اتاق اصناف مورد نظر یافت نشد')

        # بررسی دسترسی
        self._check_chamber_access(chamber, requesting_user)

        update_fields = ['updated_at']

        if name is not None:
            chamber.name = name
            update_fields.append('name')

        if address is not None:
            chamber.address = address
            update_fields.append('address')

        if phone is not None:
            chamber.phone = phone
            update_fields.append('phone')

        if email is not None:
            chamber.email = email
            update_fields.append('email')

        if established_year is not None:
            chamber.established_year = established_year
            update_fields.append('established_year')

        # فقط ادمین یا ناظر استانداری
        if requesting_user.is_admin or requesting_user.is_province_manager:
            if manager_id is not None:
                from apps.organizations.services.province_office_service\
                    import ProvinceOfficeService
                manager = ProvinceOfficeService._get_valid_manager(
                    manager_id,
                    UserRole.CHAMBER_MANAGER
                )
                chamber.manager = manager
                update_fields.append('manager')

            if is_active is not None:
                chamber.is_active = is_active
                update_fields.append('is_active')

        with self.transaction():
            chamber.save(update_fields=update_fields)
            self.log_info(
                f'Chamber updated: {chamber.name}',
                chamber_id=chamber_id,
                by=requesting_user.id
            )
            return chamber

    def assign_manager(
        self,
        *,
        chamber_id: int,
        manager_id: int,
        requesting_user
    ) -> Chamber:
        """تخصیص مدیر به اتاق اصناف"""
        if not (
            requesting_user.is_admin
            or requesting_user.is_province_manager
        ):
            raise PermissionError(
                'فقط ادمین یا ناظر استانداری می‌تواند مدیر تعیین کند'
            )

        chamber = Chamber.objects.select_related(
            'city', 'city__province'
        ).filter(id=chamber_id).first()

        if not chamber:
            raise ResourceNotFoundError('اتاق اصناف مورد نظر یافت نشد')

        # بررسی اینکه ناظر استانداری فقط در استان خودش عمل کند
        if requesting_user.is_province_manager:
            self._check_province_authority(
                chamber.city.province_id,
                requesting_user
            )

        from apps.organizations.services.province_office_service import (
            ProvinceOfficeService
        )
        manager = ProvinceOfficeService._get_valid_manager(
            manager_id,
            UserRole.CHAMBER_MANAGER
        )

        with self.transaction():
            chamber.manager = manager
            chamber.save(update_fields=['manager', 'updated_at'])
            self.log_info(
                f'Manager assigned to Chamber: '
                f'{chamber.name} → {manager.full_name}',
                chamber_id=chamber_id,
                manager_id=manager_id,
                by=requesting_user.id
            )
            return chamber

    @staticmethod
    def _check_create_permission(city_id: int, user) -> None:
        """بررسی دسترسی برای ایجاد اتاق اصناف"""
        if user.is_admin:
            return

        if user.is_province_manager:
            ChamberService._check_province_authority_by_city(
                city_id, user
            )
            return

        raise PermissionError(
            'فقط ادمین یا ناظر استانداری می‌تواند اتاق اصناف ایجاد کند'
        )

    @staticmethod
    def _check_chamber_access(chamber: Chamber, user) -> None:
        """بررسی دسترسی کاربر به اتاق اصناف"""
        if user.is_admin:
            return

        if user.is_province_manager:
            ChamberService._check_province_authority(
                chamber.city.province_id, user
            )
            return

        if (
            user.is_chamber_manager
            and chamber.manager_id == user.id
        ):
            return

        raise UnauthorizedOrganizationAccess()

    @staticmethod
    def _check_province_authority(province_id: int, user) -> None:
        """بررسی اینکه ناظر استانداری در استان خودش عمل می‌کند"""
        from apps.organizations.selectors import ProvinceOfficeSelector
        office = ProvinceOfficeSelector.get_by_manager(user.id)
        if not office or office.province_id != province_id:
            raise UnauthorizedOrganizationAccess(
                'شما فقط در محدوده استان خود دسترسی دارید'
            )

    @staticmethod
    def _check_province_authority_by_city(city_id: int, user) -> None:
        """بررسی دسترسی استانداری از طریق شناسه شهر"""
        from apps.geography.models import City
        city = City.objects.select_related(
            'province'
        ).filter(id=city_id).first()

        if city:
            ChamberService._check_province_authority(
                city.province_id, user
            )