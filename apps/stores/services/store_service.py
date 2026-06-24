"""
Store Service - منطق کسب‌وکار مربوط به فروشگاه
"""
import logging
from typing import Optional
from django.utils import timezone
from apps.common.base import BaseService
from apps.common.choices import StoreStatus, UserRole
from apps.common.exceptions import (
    ResourceNotFoundError,
    ResourceAlreadyExistsError,
    UnauthorizedOrganizationAccess,
)
from apps.common.validators import normalize_mobile
from apps.stores.models import Store
from apps.stores.selectors import StoreSelector

logger = logging.getLogger(__name__)


class StoreService(BaseService):

    def register(
        self,
        *,
        union_id: int,
        owner_id: int,
        name: str,
        license_number: str,
        address: str,
        phone: str = '',
        mobile: str = '',
        postal_code: str = '',
        latitude=None,
        longitude=None,
        description: str = '',
        requesting_user
    ) -> Store:
        """
        ثبت فروشگاه جدید.

        مجاز:
            - ادمین
            - رئیس اتحادیه (در اتحادیه خودش)
            - مدیر اتاق اصناف
            - صاحب فروشگاه (ثبت فروشگاه برای خودش)

        وضعیت اولیه: PENDING (در انتظار تایید)
        """
        # بررسی اتحادیه
        from apps.organizations.models import Union
        union = Union.objects.select_related(
            'chamber',
            'chamber__city',
            'chamber__city__province',
        ).filter(id=union_id, is_active=True).first()

        if not union:
            raise ResourceNotFoundError('اتحادیه مورد نظر یافت نشد')

        # بررسی دسترسی
        self._check_register_permission(union, requesting_user)

        # بررسی صاحب فروشگاه
        from apps.accounts.models import User
        owner = User.objects.filter(
            id=owner_id,
            is_active=True,
            role=UserRole.STORE_OWNER
        ).first()
        if not owner:
            raise ResourceNotFoundError(
                'کاربر مورد نظر یافت نشد یا نقش صاحب فروشگاه ندارد'
            )

        # بررسی تکراری نبودن شماره پروانه
        if StoreSelector.license_number_exists(license_number):
            raise ResourceAlreadyExistsError(
                f'شماره پروانه "{license_number}" قبلاً ثبت شده است'
            )

        # نرمال‌سازی موبایل
        if mobile:
            mobile = normalize_mobile(mobile)

        with self.transaction():
            store = Store.objects.create(
                union=union,
                owner=owner,
                name=name,
                license_number=license_number,
                address=address,
                phone=phone,
                mobile=mobile,
                postal_code=postal_code,
                latitude=latitude,
                longitude=longitude,
                description=description,
                status=StoreStatus.PENDING,
            )
            self.log_info(
                f'Store registered: {store.name} '
                f'in union: {union.name}',
                store_id=store.id,
                union_id=union_id,
                by=requesting_user.id
            )
            return store

    def update(
        self,
        *,
        store_id: int,
        name: Optional[str] = None,
        address: Optional[str] = None,
        phone: Optional[str] = None,
        mobile: Optional[str] = None,
        postal_code: Optional[str] = None,
        latitude=None,
        longitude=None,
        description: Optional[str] = None,
        requesting_user
    ) -> Store:
        """
        ویرایش اطلاعات فروشگاه.

        صاحب فروشگاه فقط اطلاعات پایه را می‌تواند ویرایش کند.
        مدیران سازمانی می‌توانند همه چیز را ویرایش کنند.
        """
        store = Store.objects.select_related(
            'union',
            'union__chamber',
            'union__chamber__city',
            'union__chamber__city__province',
            'owner',
        ).filter(id=store_id).first()

        if not store:
            raise ResourceNotFoundError('فروشگاه مورد نظر یافت نشد')

        # بررسی دسترسی
        self._check_store_access(store, requesting_user)

        update_fields = ['updated_at']

        if name is not None:
            store.name = name
            update_fields.append('name')

        if address is not None:
            store.address = address
            update_fields.append('address')

        if phone is not None:
            store.phone = phone
            update_fields.append('phone')

        if mobile is not None:
            store.mobile = normalize_mobile(mobile) if mobile else ''
            update_fields.append('mobile')

        if postal_code is not None:
            store.postal_code = postal_code
            update_fields.append('postal_code')

        if latitude is not None:
            store.latitude = latitude
            update_fields.append('latitude')

        if longitude is not None:
            store.longitude = longitude
            update_fields.append('longitude')

        if description is not None:
            store.description = description
            update_fields.append('description')

        with self.transaction():
            store.save(update_fields=update_fields)
            self.log_info(
                f'Store updated: {store.name}',
                store_id=store_id,
                by=requesting_user.id
            )
            return store

    def approve(
        self,
        *,
        store_id: int,
        requesting_user
    ) -> Store:
        """
        تایید فروشگاه.

        مجاز: ادمین، مدیر اتاق اصناف، رئیس اتحادیه
        """
        store = Store.objects.select_related(
            'union',
            'union__chamber',
            'union__chamber__city',
            'union__chamber__city__province',
            'owner',
        ).filter(id=store_id).first()

        if not store:
            raise ResourceNotFoundError('فروشگاه مورد نظر یافت نشد')

        if store.status == StoreStatus.ACTIVE:
            raise ValueError('فروشگاه قبلاً تایید شده است')

        # بررسی دسترسی
        self._check_approval_permission(store, requesting_user)

        with self.transaction():
            store.approve(approved_by=requesting_user)
            self.log_info(
                f'Store approved: {store.name}',
                store_id=store_id,
                by=requesting_user.id
            )
            return store

    def reject(
        self,
        *,
        store_id: int,
        reason: str = '',
        requesting_user
    ) -> Store:
        """رد فروشگاه"""
        store = Store.objects.select_related(
            'union',
            'union__chamber',
            'union__chamber__city__province',
        ).filter(id=store_id).first()

        if not store:
            raise ResourceNotFoundError('فروشگاه مورد نظر یافت نشد')

        self._check_approval_permission(store, requesting_user)

        with self.transaction():
            store.reject(rejected_by=requesting_user, reason=reason)
            self.log_info(
                f'Store rejected: {store.name}',
                store_id=store_id,
                reason=reason,
                by=requesting_user.id
            )
            return store

    def suspend(
        self,
        *,
        store_id: int,
        reason: str,
        requesting_user
    ) -> Store:
        """
        تعلیق فروشگاه.

        فروشگاه تعلیق شده نمی‌تواند قیمت ثبت کند.
        مشتریان می‌توانند شکایت ثبت کنند.
        """
        store = Store.objects.select_related(
            'union',
            'union__chamber',
            'union__chamber__city__province',
        ).filter(id=store_id).first()

        if not store:
            raise ResourceNotFoundError('فروشگاه مورد نظر یافت نشد')

        if store.status == StoreStatus.SUSPENDED:
            raise ValueError('فروشگاه قبلاً تعلیق شده است')

        self._check_approval_permission(store, requesting_user)

        with self.transaction():
            store.suspend(
                suspended_by=requesting_user,
                reason=reason
            )
            self.log_info(
                f'Store suspended: {store.name}',
                store_id=store_id,
                reason=reason,
                by=requesting_user.id
            )
            return store

    def reactivate(
        self,
        *,
        store_id: int,
        requesting_user
    ) -> Store:
        """
        بازگرداندن فروشگاه تعلیق‌شده به حالت فعال.
        """
        store = Store.objects.filter(id=store_id).first()
        if not store:
            raise ResourceNotFoundError('فروشگاه مورد نظر یافت نشد')

        if store.status != StoreStatus.SUSPENDED:
            raise ValueError(
                'فقط فروشگاه‌های تعلیق‌شده را می‌توان بازگرداند'
            )

        self._check_approval_permission(store, requesting_user)

        with self.transaction():
            store.approve(approved_by=requesting_user)
            self.log_info(
                f'Store reactivated: {store.name}',
                store_id=store_id,
                by=requesting_user.id
            )
            return store

    def close(
        self,
        *,
        store_id: int,
        requesting_user
    ) -> Store:
        """تعطیل دائم فروشگاه"""
        store = Store.objects.filter(id=store_id).first()
        if not store:
            raise ResourceNotFoundError('فروشگاه مورد نظر یافت نشد')

        self._check_approval_permission(store, requesting_user)

        with self.transaction():
            store.close(closed_by=requesting_user)
            self.log_info(
                f'Store closed: {store.name}',
                store_id=store_id,
                by=requesting_user.id
            )
            return store

    # ─── Permission Checks ───────────────────────────────────────────────────

    @staticmethod
    def _check_register_permission(union, user) -> None:
        """بررسی دسترسی برای ثبت فروشگاه"""
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

        if user.is_union_manager:
            from apps.organizations.selectors import UnionSelector
            user_union = UnionSelector.get_by_manager(user.id)
            if user_union and user_union.id == union.id:
                return

        if user.is_store_owner:
            return

        raise PermissionError(
            'شما دسترسی لازم برای ثبت فروشگاه را ندارید'
        )

    @staticmethod
    def _check_store_access(store: Store, user) -> None:
        """بررسی دسترسی کاربر به فروشگاه"""
        if user.is_admin:
            return

        if user.is_province_manager:
            from apps.organizations.services.chamber_service import (
                ChamberService
            )
            ChamberService._check_province_authority(
                store.union.chamber.city.province_id, user
            )
            return

        if user.is_chamber_manager:
            from apps.organizations.selectors import ChamberSelector
            user_chamber = ChamberSelector.get_by_manager(user.id)
            if user_chamber and (
                user_chamber.id == store.union.chamber_id
            ):
                return

        if user.is_union_manager:
            from apps.organizations.selectors import UnionSelector
            user_union = UnionSelector.get_by_manager(user.id)
            if user_union and user_union.id == store.union_id:
                return

        if (
            user.is_store_owner
            and store.owner_id == user.id
        ):
            return

        raise UnauthorizedOrganizationAccess()

    @staticmethod
    def _check_approval_permission(store: Store, user) -> None:
        """بررسی دسترسی برای تایید/رد/تعلیق فروشگاه"""
        if user.is_admin:
            return

        if user.is_province_manager:
            from apps.organizations.services.chamber_service import (
                ChamberService
            )
            ChamberService._check_province_authority(
                store.union.chamber.city.province_id, user
            )
            return

        if user.is_chamber_manager:
            from apps.organizations.selectors import ChamberSelector
            user_chamber = ChamberSelector.get_by_manager(user.id)
            if user_chamber and (
                user_chamber.id == store.union.chamber_id
            ):
                return

        if user.is_union_manager:
            from apps.organizations.selectors import UnionSelector
            user_union = UnionSelector.get_by_manager(user.id)
            if user_union and user_union.id == store.union_id:
                return

        raise UnauthorizedOrganizationAccess()