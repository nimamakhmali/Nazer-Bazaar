"""
Official Price Service
"""
import logging
from decimal import Decimal
from typing import Optional
from django.utils import timezone
from apps.common.base import BaseService
from apps.common.choices import UserRole
from apps.common.exceptions import (
    ResourceNotFoundError,
    ResourceAlreadyExistsError,
    DuplicatePriceError,
    UnauthorizedOrganizationAccess,
    PriceValidationError,
)
from apps.pricing.models import OfficialPrice, PriceHistory, PriceChangeType
from apps.pricing.selectors import OfficialPriceSelector
from apps.pricing.services.price_validator_service import PriceValidatorService

logger = logging.getLogger(__name__)


class OfficialPriceService(BaseService):
    """
    سرویس مدیریت قیمت مصوب اتحادیه.

    مجاز به ثبت قیمت:
        - ادمین
        - رئیس اتحادیه (فقط برای اتحادیه خودش)
    """

    def __init__(self):
        self.validator = PriceValidatorService()

    def create(
        self,
        *,
        union_id: int,
        product_id: int,
        price: Decimal,
        effective_date=None,
        expire_date=None,
        description: str = '',
        requesting_user
    ) -> OfficialPrice:
        """
        ثبت قیمت مصوب جدید.

        Args:
            union_id:       شناسه اتحادیه
            product_id:     شناسه محصول
            price:          قیمت مصوب (ریال)
            effective_date: تاریخ اعتبار (پیش‌فرض: امروز)
            expire_date:    تاریخ انقضا (اختیاری)
            description:    توضیحات
            requesting_user: کاربر ثبت‌کننده

        Returns:
            OfficialPrice: قیمت مصوب ثبت‌شده

        Raises:
            PermissionError: اگر دسترسی نداشته باشد
            ResourceNotFoundError: اگر اتحادیه یا محصول یافت نشود
            DuplicatePriceError: اگر قبلاً برای امروز قیمت ثبت شده باشد
            PriceValidationError: اگر قیمت منفی یا صفر باشد
        """
        # بررسی دسترسی
        self._check_create_permission(union_id, requesting_user)

        # بررسی اتحادیه
        from apps.organizations.models import Union
        union = Union.objects.filter(
            id=union_id,
            is_active=True
        ).first()
        if not union:
            raise ResourceNotFoundError('اتحادیه مورد نظر یافت نشد')

        # بررسی محصول
        from apps.products.models import Product
        product = Product.objects.filter(
            id=product_id,
            is_active=True
        ).first()
        if not product:
            raise ResourceNotFoundError('محصول مورد نظر یافت نشد')

        # تاریخ اعتبار
        if effective_date is None:
            effective_date = timezone.now().date()

        # بررسی تکراری نبودن
        if OfficialPriceSelector.exists_for_date(
            union_id=union_id,
            product_id=product_id,
            date=effective_date
        ):
            raise DuplicatePriceError(
                f'قیمت مصوب برای محصول "{product.name}" '
                f'در تاریخ {effective_date} قبلاً ثبت شده است'
            )

        # اعتبارسنجی قیمت
        if price <= 0:
            raise PriceValidationError(
                'قیمت مصوب باید بزرگ‌تر از صفر باشد'
            )

        with self.transaction():
            official_price = OfficialPrice.objects.create(
                union=union,
                product=product,
                price=price,
                effective_date=effective_date,
                expire_date=expire_date,
                description=description,
                created_by=requesting_user,
                is_active=True,
            )
            self.log_info(
                f'OfficialPrice created: {product.name} '
                f'for {union.name} '
                f'price={price} '
                f'date={effective_date}',
                official_price_id=official_price.id,
                by=requesting_user.id
            )
            return official_price

    def update(
        self,
        *,
        official_price_id: int,
        price: Optional[Decimal] = None,
        expire_date=None,
        description: Optional[str] = None,
        requesting_user
    ) -> OfficialPrice:
        """
        ویرایش قیمت مصوب.

        نکته: فقط قیمت، تاریخ انقضا و توضیحات قابل ویرایش هستند.
        اتحادیه، محصول و تاریخ اعتبار قابل تغییر نیستند.
        """
        official_price = OfficialPrice.objects.select_related(
            'union',
            'product',
            'created_by',
        ).filter(id=official_price_id).first()

        if not official_price:
            raise ResourceNotFoundError('قیمت مصوب مورد نظر یافت نشد')

        # بررسی دسترسی
        self._check_update_permission(official_price, requesting_user)

        old_price = official_price.price
        update_fields = ['updated_at']

        if price is not None and price != official_price.price:
            if price <= 0:
                raise PriceValidationError(
                    'قیمت مصوب باید بزرگ‌تر از صفر باشد'
                )
            official_price.price = price
            update_fields.append('price')

        if expire_date is not None:
            official_price.expire_date = expire_date
            update_fields.append('expire_date')

        if description is not None:
            official_price.description = description
            update_fields.append('description')

        with self.transaction():
            official_price.save(update_fields=update_fields)

            # ثبت تاریخچه ویرایش (فقط اگر قیمت تغییر کرده)
            if price is not None and price != old_price:
                PriceHistory.objects.create(
                    change_type=PriceChangeType.OFFICIAL_PRICE_UPDATED,
                    official_price=official_price,
                    union_id=official_price.union_id,
                    union_name=official_price.union.name,
                    product_id=official_price.product_id,
                    product_name=official_price.product.name,
                    old_price=old_price,
                    new_price=price,
                    price_date=official_price.effective_date,
                    changed_by=requesting_user,
                    changed_by_name=requesting_user.full_name,
                    changed_by_role=requesting_user.role,
                    note=f'قیمت از {old_price:,} به {price:,} ریال تغییر کرد'
                )

            self.log_info(
                f'OfficialPrice updated: id={official_price_id}',
                by=requesting_user.id
            )
            return official_price

    def deactivate(
        self,
        *,
        official_price_id: int,
        requesting_user
    ) -> OfficialPrice:
        """
        غیرفعال کردن قیمت مصوب.
        قیمت‌های مصوب حذف نمی‌شوند.
        """
        official_price = OfficialPrice.objects.select_related(
            'union',
            'product',
        ).filter(id=official_price_id).first()

        if not official_price:
            raise ResourceNotFoundError('قیمت مصوب مورد نظر یافت نشد')

        self._check_update_permission(official_price, requesting_user)

        with self.transaction():
            official_price.deactivate()
            PriceHistory.objects.create(
                change_type=PriceChangeType.OFFICIAL_PRICE_DEACTIVATED,
                official_price=official_price,
                union_id=official_price.union_id,
                union_name=official_price.union.name,
                product_id=official_price.product_id,
                product_name=official_price.product.name,
                new_price=official_price.price,
                price_date=official_price.effective_date,
                changed_by=requesting_user,
                changed_by_name=requesting_user.full_name,
                changed_by_role=requesting_user.role,
                note='قیمت مصوب غیرفعال شد'
            )
            return official_price

    def bulk_create(
        self,
        *,
        union_id: int,
        prices: list,
        effective_date=None,
        requesting_user
    ) -> dict:
        """
        ثبت انبوه قیمت‌های مصوب.

        Args:
            prices: لیست دیکشنری‌های {'product_id': int, 'price': Decimal}
            effective_date: تاریخ اعتبار (پیش‌فرض: امروز)

        Returns:
            dict: {'created': int, 'skipped': int, 'errors': list}
        """
        self._check_create_permission(union_id, requesting_user)

        if effective_date is None:
            effective_date = timezone.now().date()

        result = {
            'created': 0,
            'skipped': 0,
            'updated': 0,
            'errors': []
        }

        for item in prices:
            try:
                product_id = item.get('product_id')
                price = Decimal(str(item.get('price', 0)))

                if price <= 0:
                    result['errors'].append({
                        'product_id': product_id,
                        'error': 'قیمت باید بزرگ‌تر از صفر باشد'
                    })
                    continue

                # بررسی تکراری
                existing = OfficialPriceSelector.get_by_union_product_date(
                    union_id=union_id,
                    product_id=product_id,
                    date=effective_date
                )

                if existing:
                    result['skipped'] += 1
                    continue

                self.create(
                    union_id=union_id,
                    product_id=product_id,
                    price=price,
                    effective_date=effective_date,
                    requesting_user=requesting_user
                )
                result['created'] += 1

            except Exception as e:
                result['errors'].append({
                    'product_id': item.get('product_id'),
                    'error': str(e)
                })

        return result

    @staticmethod
    def _check_create_permission(union_id: int, user) -> None:
        """بررسی دسترسی برای ثبت قیمت مصوب"""
        if user.is_admin:
            return

        if user.is_union_manager:
            from apps.organizations.selectors import UnionSelector
            user_union = UnionSelector.get_by_manager(user.id)
            if user_union and user_union.id == union_id:
                return
            raise UnauthorizedOrganizationAccess(
                'شما فقط می‌توانید برای اتحادیه خودتان قیمت ثبت کنید'
            )

        raise PermissionError(
            'فقط ادمین و رئیس اتحادیه می‌توانند قیمت مصوب ثبت کنند'
        )

    @staticmethod
    def _check_update_permission(
        official_price: OfficialPrice,
        user
    ) -> None:
        """بررسی دسترسی برای ویرایش قیمت مصوب"""
        if user.is_admin:
            return

        if user.is_union_manager:
            from apps.organizations.selectors import UnionSelector
            user_union = UnionSelector.get_by_manager(user.id)
            if user_union and (
                user_union.id == official_price.union_id
            ):
                return

        raise UnauthorizedOrganizationAccess(
            'شما دسترسی به ویرایش این قیمت را ندارید'
        )