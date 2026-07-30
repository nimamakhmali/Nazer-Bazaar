"""
User Service - مدیریت کاربران
"""
import logging
from typing import Optional
from apps.common.base import BaseService
from apps.common.choices import UserRole
from apps.common.exceptions import (
    ResourceNotFoundError,
    ResourceAlreadyExistsError,
)
from apps.common.validators import normalize_mobile
from apps.accounts.models import User
from apps.accounts.selectors import UserSelector

logger = logging.getLogger(__name__)


class UserService(BaseService):

    def create_organization_user(
        self,
        *,
        phone_number: str,
        role: str,
        first_name: str = '',
        last_name: str = '',
        national_code: str = None,
        password: str = None,
        created_by: User
    ) -> User:
        """
        ایجاد کاربر سازمانی توسط ادمین.
        (ناظر استانداری، مدیر اتاق اصناف، رئیس اتحادیه، بازرس)

        Args:
            phone_number: شماره موبایل
            role: نقش کاربر
            first_name: نام
            last_name: نام خانوادگی
            national_code: کد ملی
            password: رمز عبور (اختیاری)
            created_by: کاربر ایجادکننده

        Raises:
            ResourceAlreadyExistsError: اگر موبایل یا کد ملی تکراری باشد
        """
        # فقط ادمین می‌تواند کاربر سازمانی ایجاد کند
        if not created_by.is_admin:
            raise PermissionError(
                'فقط ادمین می‌تواند کاربر سازمانی ایجاد کند'
            )

        # نقش‌های مجاز برای این متد
        allowed_roles = [
            UserRole.PROVINCE_MANAGER,
            UserRole.CHAMBER_MANAGER,
            UserRole.UNION_MANAGER,
            UserRole.STORE_OWNER,
            UserRole.INSPECTOR,
        ]
        if role not in allowed_roles:
            raise ValueError(f'نقش "{role}" مجاز نیست')

        phone_number = normalize_mobile(phone_number)

        # بررسی تکراری نبودن
        if UserSelector.phone_exists(phone_number):
            raise ResourceAlreadyExistsError(
                f'کاربری با شماره "{phone_number}" قبلاً ثبت شده است'
            )

        if national_code and UserSelector.national_code_exists(
            national_code
        ):
            raise ResourceAlreadyExistsError(
                f'کاربری با کد ملی "{national_code}" قبلاً ثبت شده است'
            )

        with self.transaction():
            user = User.objects.create_user(
                phone_number=phone_number,
                password=password,
                role=role,
                first_name=first_name,
                last_name=last_name,
                national_code=national_code,
                is_active=True,
                is_phone_verified=True,
            )

            self.log_info(
                f'Organization user created: {phone_number} ({role})',
                user_id=user.id,
                created_by=created_by.id
            )

            return user
        
    def update_profile(
        self,
        *,
        user_id: int,
        requesting_user: User,
        **kwargs  # هر فیلدی که ارسال شده
    ) -> User:
        """
        ویرایش پروفایل کاربر.
        """
        user = User.objects.filter(id=user_id).first()
        if not user:
            raise ResourceNotFoundError('کاربر مورد نظر یافت نشد')

        if not requesting_user.is_admin and requesting_user.id != user_id:
            raise PermissionError(
                'شما دسترسی به ویرایش این پروفایل ندارید'
            )

        national_code = kwargs.get('national_code')

        # بررسی کد ملی تکراری
        if national_code and national_code != user.national_code:
            if UserSelector.national_code_exists(
                national_code,
                exclude_id=user_id
            ):
                raise ResourceAlreadyExistsError(
                    'این کد ملی قبلاً ثبت شده است'
                )

        update_fields = ['updated_at']
        ALLOWED_FIELDS = ['first_name', 'last_name', 'email', 'national_code']

        for field in ALLOWED_FIELDS:
            if field in kwargs:
                setattr(user, field, kwargs[field])
                update_fields.append(field)

        with self.transaction():
            user.save(update_fields=update_fields)
            self.log_info(
                f'Profile updated: {user.phone_number}',
                user_id=user_id,
                fields=list(kwargs.keys()),
                by=requesting_user.id
            )

        return user

    def change_user_role(
        self,
        *,
        user_id: int,
        new_role: str,
        requesting_user: User
    ) -> User:
        """
        تغییر نقش کاربر - فقط ادمین

        Raises:
            PermissionError: اگر درخواست‌کننده ادمین نباشد
            ResourceNotFoundError: اگر کاربر یافت نشود
        """
        if not requesting_user.is_admin:
            raise PermissionError(
                'فقط ادمین می‌تواند نقش کاربران را تغییر دهد'
            )

        user = User.objects.filter(id=user_id).first()
        if not user:
            raise ResourceNotFoundError('کاربر مورد نظر یافت نشد')

        old_role = user.role
        user.role = new_role

        with self.transaction():
            user.save(update_fields=['role', 'updated_at'])
            self.log_info(
                f'User role changed: {user.phone_number} '
                f'{old_role} → {new_role}',
                user_id=user_id,
                changed_by=requesting_user.id
            )

        return user

    def deactivate_user(
        self,
        *,
        user_id: int,
        requesting_user: User
    ) -> User:
        """غیرفعال کردن کاربر - فقط ادمین"""
        if not requesting_user.is_admin:
            raise PermissionError(
                'فقط ادمین می‌تواند حساب کاربری را غیرفعال کند'
            )

        user = User.objects.filter(id=user_id).first()
        if not user:
            raise ResourceNotFoundError('کاربر مورد نظر یافت نشد')

        if user.id == requesting_user.id:
            raise ValueError('نمی‌توانید حساب خودتان را غیرفعال کنید')

        with self.transaction():
            user.deactivate()
            self.log_info(
                f'User deactivated: {user.phone_number}',
                user_id=user_id,
                by=requesting_user.id
            )

        return user