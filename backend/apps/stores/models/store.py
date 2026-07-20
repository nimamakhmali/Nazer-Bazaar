"""
مدل فروشگاه (Store)

هر فروشگاه عضو یک اتحادیه است و توسط یک صاحب فروشگاه
مدیریت می‌شود. فروشگاه‌ها موظف هستند قیمت محصولات را
در محدوده مصوب اتحادیه ثبت کنند.

سلسله‌مراتب:
    Union (اتحادیه)
        └── Store (فروشگاه)
                └── StorePrice (قیمت‌گذاری)
                └── Complaint (شکایت)

قوانین کسب‌وکار:
    - هر فروشگاه باید پروانه کسب معتبر داشته باشد
    - قیمت فروشگاه باید بین 80% تا 100% قیمت مصوب باشد
    - فروشگاه‌های تعلیق‌شده نمی‌توانند قیمت ثبت کنند
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.common.base import BaseModel
from apps.common.choices import StoreStatus


class Store(BaseModel):
    """
    فروشگاه عضو اتحادیه.

    روابط:
        union:  اتحادیه‌ای که فروشگاه عضو آن است (ForeignKey)
        owner:  صاحب فروشگاه با نقش store_owner (ForeignKey)
        prices: قیمت‌های ثبت‌شده (در app pricing)
        complaints: شکایات دریافت‌شده (در app complaints)
    """
    union = models.ForeignKey(
        'organizations.Union',
        on_delete=models.PROTECT,
        related_name='stores',
        verbose_name='اتحادیه'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_stores',
        verbose_name='صاحب فروشگاه',
        limit_choices_to={'role': 'store_owner'}
    )
    name = models.CharField(
        max_length=200,
        verbose_name='نام فروشگاه'
    )
    license_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='شماره پروانه کسب',
        help_text='شماره پروانه کسب صادر شده از اتاق اصناف'
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='تلفن'
    )
    mobile = models.CharField(
        max_length=15,
        blank=True,
        verbose_name='موبایل'
    )
    address = models.TextField(
        verbose_name='آدرس'
    )
    postal_code = models.CharField(
        max_length=10,
        blank=True,
        verbose_name='کد پستی'
    )

    # ─── موقعیت جغرافیایی ───────────────────────────────────────────────────
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name='عرض جغرافیایی',
        validators=[
            MinValueValidator(-90),
            MaxValueValidator(90)
        ]
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name='طول جغرافیایی',
        validators=[
            MinValueValidator(-180),
            MaxValueValidator(180)
        ]
    )

    # ─── وضعیت ──────────────────────────────────────────────────────────────
    status = models.CharField(
        max_length=20,
        choices=StoreStatus.choices,
        default=StoreStatus.PENDING,
        verbose_name='وضعیت',
        db_index=True
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        db_index=True
    )

    # ─── تصویر ──────────────────────────────────────────────────────────────
    image = models.ImageField(
        upload_to='stores/images/%Y/%m/',
        null=True,
        blank=True,
        verbose_name='تصویر فروشگاه'
    )

    # ─── توضیحات ────────────────────────────────────────────────────────────
    description = models.TextField(
        blank=True,
        verbose_name='توضیحات'
    )

    # ─── تاریخ تعلیق/رد ─────────────────────────────────────────────────────
    status_changed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='تاریخ تغییر وضعیت'
    )
    status_changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='status_changed_stores',
        verbose_name='تغییر وضعیت توسط'
    )
    rejection_reason = models.TextField(
        blank=True,
        verbose_name='دلیل رد یا تعلیق'
    )

    class Meta:
        db_table = 'stores_store'
        verbose_name = 'فروشگاه'
        verbose_name_plural = 'فروشگاه‌ها'
        ordering = ['-created_at']
        indexes = [
            models.Index(
                fields=['union', 'status'],
                name='idx_store_union_status'
            ),
            models.Index(
                fields=['owner', 'status'],
                name='idx_store_owner_status'
            ),
        ]

    def __str__(self) -> str:
        return f'{self.name} ({self.license_number})'

    # ─── Properties ─────────────────────────────────────────────────────────
    @property
    def is_approved(self) -> bool:
        """آیا فروشگاه تایید شده است؟"""
        return self.status == StoreStatus.ACTIVE

    @property
    def can_set_price(self) -> bool:
        """
        آیا فروشگاه می‌تواند قیمت ثبت کند؟
        فقط فروشگاه‌های فعال و تایید شده می‌توانند قیمت ثبت کنند.
        """
        return (
            self.is_active
            and self.status == StoreStatus.ACTIVE
        )

    @property
    def city_name(self) -> str:
        return self.union.chamber.city_name

    @property
    def province_name(self) -> str:
        return self.union.chamber.province_name

    @property
    def union_name(self) -> str:
        return self.union.name

    @property
    def owner_name(self) -> str:
        return self.owner.full_name

    @property
    def has_location(self) -> bool:
        """آیا مختصات جغرافیایی دارد؟"""
        return (
            self.latitude is not None
            and self.longitude is not None
        )

    @property
    def complaints_count(self) -> int:
        """تعداد کل شکایات"""
        return self.complaints.count()

    @property
    def pending_complaints_count(self) -> int:
        """تعداد شکایات در انتظار بررسی"""
        from apps.common.choices import ComplaintStatus
        return self.complaints.filter(
            status=ComplaintStatus.SUBMITTED
        ).count()

    # ─── Methods ────────────────────────────────────────────────────────────
    def approve(self, approved_by) -> None:
        """تایید فروشگاه"""
        from django.utils import timezone
        self.status = StoreStatus.ACTIVE
        self.status_changed_at = timezone.now()
        self.status_changed_by = approved_by
        self.rejection_reason = ''
        self.save(update_fields=[
            'status',
            'status_changed_at',
            'status_changed_by',
            'rejection_reason',
            'updated_at'
        ])

    def reject(self, rejected_by, reason: str = '') -> None:
        """رد فروشگاه"""
        from django.utils import timezone
        self.status = StoreStatus.REJECTED
        self.status_changed_at = timezone.now()
        self.status_changed_by = rejected_by
        self.rejection_reason = reason
        self.save(update_fields=[
            'status',
            'status_changed_at',
            'status_changed_by',
            'rejection_reason',
            'updated_at'
        ])

    def suspend(self, suspended_by, reason: str = '') -> None:
        """تعلیق فروشگاه"""
        from django.utils import timezone
        self.status = StoreStatus.SUSPENDED
        self.status_changed_at = timezone.now()
        self.status_changed_by = suspended_by
        self.rejection_reason = reason
        self.save(update_fields=[
            'status',
            'status_changed_at',
            'status_changed_by',
            'rejection_reason',
            'updated_at'
        ])

    def close(self, closed_by) -> None:
        """تعطیل فروشگاه"""
        from django.utils import timezone
        self.status = StoreStatus.CLOSED
        self.is_active = False
        self.status_changed_at = timezone.now()
        self.status_changed_by = closed_by
        self.save(update_fields=[
            'status',
            'is_active',
            'status_changed_at',
            'status_changed_by',
            'updated_at'
        ])