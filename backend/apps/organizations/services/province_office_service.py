"""
ProvinceOffice Service
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
from apps.organizations.models import ProvinceOffice
from apps.organizations.selectors import ProvinceOfficeSelector

logger = logging.getLogger(__name__)


class ProvinceOfficeService(BaseService):

    def create(
        self,
        *,
        province_id: int,
        name: str,
        manager_id: int = None,
        address: str = '',
        phone: str = '',
        email: str = '',
        requesting_user
    ) -> ProvinceOffice:
        """
        ایجاد دفتر استانداری جدید.
        فقط ادمین می‌تواند این کار را انجام دهد.

        Raises:
            PermissionError: اگر درخواست‌کننده ادمین نباشد
            ResourceAlreadyExistsError: اگر استان قبلاً دفتر داشته باشد
            ResourceNotFoundError: اگر استان یا مدیر یافت نشود
        """
        if not requesting_user.is_admin:
            raise PermissionError(
                'فقط ادمین می‌تواند دفتر استانداری ایجاد کند'
            )

        # بررسی وجود استان
        from apps.geography.models import Province
        province = Province.objects.filter(
            id=province_id,
            is_active=True
        ).first()
        if not province:
            raise ResourceNotFoundError('استان مورد نظر یافت نشد')

        # بررسی تکراری نبودن
        if ProvinceOfficeSelector.province_has_office(province_id):
            raise ResourceAlreadyExistsError(
                f'استان "{province.name}" قبلاً دفتر استانداری دارد'
            )

        # بررسی مدیر
        manager = None
        if manager_id:
            manager = self._get_valid_manager(
                manager_id,
                UserRole.PROVINCE_MANAGER
            )

        with self.transaction():
            office = ProvinceOffice.objects.create(
                province=province,
                manager=manager,
                name=name,
                address=address,
                phone=phone,
                email=email,
            )
            self.log_info(
                f'ProvinceOffice created: {office.name}',
                office_id=office.id,
                province_id=province_id,
                by=requesting_user.id
            )
            return office

    def update(
        self,
        *,
        office_id: int,
        name: Optional[str] = None,
        manager_id: Optional[int] = None,
        address: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        is_active: Optional[bool] = None,
        requesting_user
    ) -> ProvinceOffice:
        """
        ویرایش دفتر استانداری.
        ادمین می‌تواند همه چیز را ویرایش کند.
        مدیر استانداری فقط می‌تواند اطلاعات تماس را ویرایش کند.

        Raises:
            ResourceNotFoundError: اگر دفتر یافت نشود
            UnauthorizedOrganizationAccess: اگر دسترسی نداشته باشد
        """
        office = ProvinceOffice.objects.select_related(
            'province', 'manager'
        ).filter(id=office_id).first()

        if not office:
            raise ResourceNotFoundError(
                'دفتر استانداری مورد نظر یافت نشد'
            )

        # بررسی دسترسی
        self._check_office_access(office, requesting_user)

        update_fields = ['updated_at']

        if name is not None:
            office.name = name
            update_fields.append('name')

        if address is not None:
            office.address = address
            update_fields.append('address')

        if phone is not None:
            office.phone = phone
            update_fields.append('phone')

        if email is not None:
            office.email = email
            update_fields.append('email')

        # فقط ادمین می‌تواند مدیر و وضعیت را تغییر دهد
        if requesting_user.is_admin:
            if manager_id is not None:
                manager = self._get_valid_manager(
                    manager_id,
                    UserRole.PROVINCE_MANAGER
                )
                office.manager = manager
                update_fields.append('manager')

            if is_active is not None:
                office.is_active = is_active
                update_fields.append('is_active')

        with self.transaction():
            office.save(update_fields=update_fields)
            self.log_info(
                f'ProvinceOffice updated: {office.name}',
                office_id=office_id,
                by=requesting_user.id
            )
            return office

    def assign_manager(
        self,
        *,
        office_id: int,
        manager_id: int,
        requesting_user
    ) -> ProvinceOffice:
        """
        تخصیص مدیر به دفتر استانداری.
        فقط ادمین.
        """
        if not requesting_user.is_admin:
            raise PermissionError(
                'فقط ادمین می‌تواند مدیر تعیین کند'
            )

        office = ProvinceOffice.objects.filter(id=office_id).first()
        if not office:
            raise ResourceNotFoundError(
                'دفتر استانداری مورد نظر یافت نشد'
            )

        manager = self._get_valid_manager(
            manager_id,
            UserRole.PROVINCE_MANAGER
        )

        with self.transaction():
            office.manager = manager
            office.save(update_fields=['manager', 'updated_at'])
            self.log_info(
                f'Manager assigned to ProvinceOffice: '
                f'{office.name} → {manager.full_name}',
                office_id=office_id,
                manager_id=manager_id,
                by=requesting_user.id
            )
            return office

    @staticmethod
    def _get_valid_manager(user_id: int, required_role: str):
        """
        دریافت و اعتبارسنجی کاربر برای نقش مدیریتی.
        """
        from apps.accounts.models import User
        user = User.objects.filter(
            id=user_id,
            is_active=True
        ).first()

        if not user:
            raise ResourceNotFoundError('کاربر مورد نظر یافت نشد')

        if user.role != required_role:
            raise ValueError(
                f'کاربر انتخاب‌شده نقش "{required_role}" ندارد'
            )
        return user

    @staticmethod
    def _check_office_access(office: ProvinceOffice, user) -> None:
        """بررسی دسترسی کاربر به دفتر استانداری"""
        if user.is_admin:
            return

        if (
            user.is_province_manager
            and office.manager_id == user.id
        ):
            return

        raise UnauthorizedOrganizationAccess()