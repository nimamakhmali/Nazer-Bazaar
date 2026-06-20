"""
مدل کاربر سفارشی

نکات مهم طراحی:
1. احراز هویت با شماره موبایل (نه username یا email)
2. نقش کاربر در همین مدل ذخیره می‌شود (role field)
3. هر نقش به یک لایه سازمانی متصل می‌شود (در organizations تعریف می‌شود)
4. از AbstractBaseUser استفاده می‌کنیم تا کنترل کامل داشته باشیم
"""
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils import timezone

from apps.common.base import BaseModel
from apps.common.choices import UserRole
from apps.common.validators import (
    validate_iranian_mobile,
    validate_iranian_national_id,
)
from apps.accounts.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """
    مدل کاربر مرکزی سیستم.

    تمام کاربران سیستم (ادمین، ناظر استانداری، مدیر اتاق اصناف،
    رئیس اتحادیه، صاحب فروشگاه، شهروند) از این مدل استفاده می‌کنند.
    نقش آن‌ها از طریق فیلد role مشخص می‌شود.

    روابط با سایر App ها:
        - ProvinceOffice.manager     → User (province_manager)
        - Chamber.manager            → User (chamber_manager)
        - Union.manager              → User (union_manager)
        - Store.owner                → User (store_owner)
        - Complaint.customer         → User (customer)
    """

    # ─── اطلاعات شخصی ───────────────────────────────────────────────────────
    phone_number = models.CharField(
        max_length=15,
        unique=True,
        verbose_name='شماره موبایل',
        validators=[validate_iranian_mobile],
        db_index=True,
        help_text='مثال: 09123456789'
    )
    national_code = models.CharField(
        max_length=10,
        unique=True,
        null=True,
        blank=True,
        verbose_name='کد ملی',
        validators=[validate_iranian_national_id],
    )
    first_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='نام'
    )
    last_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='نام خانوادگی'
    )
    email = models.EmailField(
        blank=True,
        null=True,
        verbose_name='ایمیل'
    )
    avatar = models.ImageField(
        upload_to='users/avatars/%Y/%m/',
        null=True,
        blank=True,
        verbose_name='تصویر پروفایل'
    )

    # ─── نقش و دسترسی ───────────────────────────────────────────────────────
    role = models.CharField(
        max_length=30,
        choices=UserRole.choices,
        default=UserRole.CUSTOMER,
        verbose_name='نقش',
        db_index=True
    )

    # ─── وضعیت حساب ─────────────────────────────────────────────────────────
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        db_index=True
    )
    is_staff = models.BooleanField(
        default=False,
        verbose_name='دسترسی به پنل ادمین'
    )
    is_phone_verified = models.BooleanField(
        default=False,
        verbose_name='موبایل تایید شده'
    )

    # ─── زمان‌ها ─────────────────────────────────────────────────────────────
    last_login_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='آخرین ورود'
    )
    date_joined = models.DateTimeField(
        default=timezone.now,
        verbose_name='تاریخ عضویت'
    )

    # ─── تنظیمات احراز هویت ─────────────────────────────────────────────────
    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'accounts_user'
        verbose_name = 'کاربر'
        verbose_name_plural = 'کاربران'
        ordering = ['-date_joined']

    def __str__(self) -> str:
        if self.get_full_name():
            return f'{self.get_full_name()} ({self.phone_number})'
        return self.phone_number

    # ─── Properties ─────────────────────────────────────────────────────────
    def get_full_name(self) -> str:
        """نام کامل کاربر"""
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def full_name(self) -> str:
        return self.get_full_name() or self.phone_number

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    @property
    def is_province_manager(self) -> bool:
        return self.role == UserRole.PROVINCE_MANAGER

    @property
    def is_chamber_manager(self) -> bool:
        return self.role == UserRole.CHAMBER_MANAGER

    @property
    def is_union_manager(self) -> bool:
        return self.role == UserRole.UNION_MANAGER

    @property
    def is_store_owner(self) -> bool:
        return self.role == UserRole.STORE_OWNER

    @property
    def is_inspector(self) -> bool:
        return self.role == UserRole.INSPECTOR

    @property
    def is_customer(self) -> bool:
        return self.role == UserRole.CUSTOMER

    @property
    def is_organization_user(self) -> bool:
        """
        آیا کاربر بخشی از ساختار سازمانی است؟
        (ادمین، استانداری، اتاق اصناف، اتحادیه)
        """
        return self.role in [
            UserRole.ADMIN,
            UserRole.PROVINCE_MANAGER,
            UserRole.CHAMBER_MANAGER,
            UserRole.UNION_MANAGER,
            UserRole.INSPECTOR,
        ]

    # ─── Methods ────────────────────────────────────────────────────────────
    def update_last_login(self) -> None:
        """به‌روزرسانی زمان آخرین ورود"""
        self.last_login_at = timezone.now()
        self.save(update_fields=['last_login_at'])

    def verify_phone(self) -> None:
        """تایید شماره موبایل"""
        self.is_phone_verified = True
        self.save(update_fields=['is_phone_verified', 'updated_at'])

    def deactivate(self) -> None:
        """غیرفعال کردن حساب"""
        self.is_active = False
        self.save(update_fields=['is_active', 'updated_at'])

    def activate(self) -> None:
        """فعال کردن حساب"""
        self.is_active = True
        self.save(update_fields=['is_active', 'updated_at'])