"""
Store Price Service
"""
import logging
from decimal import Decimal
from typing import Optional
from django.utils import timezone
from apps.common.base import BaseService
from apps.common.choices import StoreStatus
from apps.common.exceptions import (
    ResourceNotFoundError,
    DuplicatePriceError,
    UnauthorizedOrganizationAccess,
    PriceValidationError,
)
from apps.pricing.models import StorePrice, PriceHistory, PriceChangeType
from apps.pricing.selectors import OfficialPriceSelector, StorePriceSelector
from apps.pricing.services.price_validator_service import PriceValidatorService

logger = logging.getLogger(__name__)


class StorePriceService(BaseService):
    """
    سرویس مدیریت قیمت فروشگاه.

    مجاز به ثبت قیمت:
        - صاحب فروشگاه (فقط برای فروشگاه‌های خودش)
        - رئیس اتحادیه (برای فروشگاه‌های اتحادیه‌اش)
        - ادمین
    """

    def __init__(self):
        self.validator = PriceValidatorService()

    def set_price(
        self,
        *,
        store_id: int,
        product_id: int,
        price: Decimal,
        price_date=None,
        description: str = '',
        requesting_user
    ) -> StorePrice:
        """
        ثبت یا بروزرسانی قیمت فروشگاه برای یک محصول.

        این مهم‌ترین متد سیستم است.
        قانون 80%-100% اینجا اعمال می‌شود.

        Args:
            store_id:     شناسه فروشگاه
            product_id:   شناسه محصول
            price:        قیمت پیشنهادی فروشگاه
            price_date:   تاریخ قیمت (پیش‌فرض: امروز)
            description:  توضیحات
            requesting_user: کاربر ثبت‌کننده

        Returns:
            StorePrice: قیمت ثبت‌شده

        Raises:
            ResourceNotFoundError: اگر فروشگاه یا محصول یافت نشود
            UnauthorizedOrganizationAccess: اگر دسترسی نداشته باشد
            PriceValidationError: اگر قیمت در محدوده مجاز نباشد
            DuplicatePriceError: اگر امروز قبلاً قیمت ثبت شده باشد
        """
        # بررسی فروشگاه
        from apps.stores.models import Store
        store = Store.objects.select_related(
            'union',
            'union__chamber',
            'union__chamber__city',
            'owner',
        ).filter(id=store_id).first()

        if not store:
            raise ResourceNotFoundError('فروشگاه مورد نظر یافت نشد')

        # بررسی وضعیت فروشگاه
        if not store.can_set_price:
            raise PermissionError(
                f'فروشگاه "{store.name}" در وضعیت '
                f'"{store.get_status_display()}" است '
                f'و نمی‌تواند قیمت ثبت کند'
            )

        # بررسی دسترسی کاربر
        self._check_set_price_permission(store, requesting_user)

        # بررسی محصول
        from apps.products.models import Product
        product = Product.objects.filter(
            id=product_id,
            is_active=True
        ).first()
        if not product:
            raise ResourceNotFoundError('محصول مورد نظر یافت نشد')

        # تاریخ قیمت
        if price_date is None:
            price_date = timezone.now().date()

        # دریافت قیمت مصوب روز
        official_price_obj = OfficialPriceSelector.get_for_today(
            union_id=store.union_id,
            product_id=product_id,
            date=price_date
        )

        if not official_price_obj:
            raise ResourceNotFoundError(
                f'قیمت مصوب برای محصول "{product.name}" '
                f'در تاریخ {price_date} توسط اتحادیه '
                f'"{store.union.name}" ثبت نشده است. '
                f'لطفاً ابتدا قیمت مصوب را ثبت کنید.'
            )

        # ← اعمال قانون 80%-100% ←
        validation_result = self.validator.validate_and_raise(
            store_price=price,
            official_price=official_price_obj.price
        )

        # بررسی تکراری نبودن
        existing = StorePriceSelector.get_by_store_product_date(
            store_id=store_id,
            product_id=product_id,
            date=price_date
        )

        with self.transaction():
            if existing:
                # بروزرسانی قیمت موجود
                old_price = existing.price
                existing.price = price
                existing.description = description
                existing.save(update_fields=[
                    'price',
                    'description',
                    'updated_at'
                ])

                # ثبت تاریخچه
                PriceHistory.objects.create(
                    change_type=PriceChangeType.STORE_PRICE_UPDATED,
                    store_price=existing,
                    union_id=store.union_id,
                    union_name=store.union.name,
                    product_id=product_id,
                    product_name=product.name,
                    store_id=store_id,
                    store_name=store.name,
                    old_price=old_price,
                    new_price=price,
                    price_date=price_date,
                    changed_by=requesting_user,
                    changed_by_name=requesting_user.full_name,
                    changed_by_role=requesting_user.role,
                )

                self.log_info(
                    f'StorePrice updated: {store.name} | '
                    f'{product.name} | {price}',
                    store_price_id=existing.id,
                    by=requesting_user.id
                )
                return existing

            else:
                # ایجاد قیمت جدید
                store_price = StorePrice.objects.create(
                    store=store,
                    product=product,
                    official_price=official_price_obj,
                    price=price,
                    official_price_amount=official_price_obj.price,
                    min_allowed_price_amount=(
                        official_price_obj.min_allowed_price
                    ),
                    price_date=price_date,
                    description=description,
                    created_by=requesting_user,
                    is_active=True,
                )
                self.log_info(
                    f'StorePrice created: {store.name} | '
                    f'{product.name} | {price}',
                    store_price_id=store_price.id,
                    by=requesting_user.id
                )
                return store_price

    def bulk_set_prices(
        self,
        *,
        store_id: int,
        prices: list,
        price_date=None,
        requesting_user
    ) -> dict:
        """
        ثبت انبوه قیمت‌های یک فروشگاه برای چند محصول.

        Args:
            prices: لیست [{'product_id': int, 'price': Decimal}]

        Returns:
            dict: نتیجه عملیات
        """
        if price_date is None:
            price_date = timezone.now().date()

        result = {
            'success': [],
            'errors': [],
            'total': len(prices)
        }

        for item in prices:
            try:
                product_id = item.get('product_id')
                price = Decimal(str(item.get('price', 0)))

                store_price = self.set_price(
                    store_id=store_id,
                    product_id=product_id,
                    price=price,
                    price_date=price_date,
                    requesting_user=requesting_user
                )
                result['success'].append({
                    'product_id': product_id,
                    'price': float(price),
                    'store_price_id': store_price.id,
                })
            except Exception as e:
                result['errors'].append({
                    'product_id': item.get('product_id'),
                    'error': str(e)
                })

        return result

    def deactivate(
        self,
        *,
        store_price_id: int,
        requesting_user
    ) -> StorePrice:
        """غیرفعال کردن قیمت فروشگاه"""
        store_price = StorePrice.objects.select_related(
            'store',
            'store__union',
            'product',
        ).filter(id=store_price_id).first()

        if not store_price:
            raise ResourceNotFoundError('قیمت مورد نظر یافت نشد')

        self._check_set_price_permission(
            store_price.store,
            requesting_user
        )

        with self.transaction():
            store_price.is_active = False
            store_price.save(update_fields=['is_active', 'updated_at'])

            PriceHistory.objects.create(
                change_type=PriceChangeType.STORE_PRICE_DEACTIVATED,
                store_price=store_price,
                union_id=store_price.store.union_id,
                union_name=store_price.store.union.name,
                product_id=store_price.product_id,
                product_name=store_price.product.name,
                store_id=store_price.store_id,
                store_name=store_price.store.name,
                new_price=store_price.price,
                price_date=store_price.price_date,
                changed_by=requesting_user,
                changed_by_name=requesting_user.full_name,
                changed_by_role=requesting_user.role,
                note='قیمت غیرفعال شد'
            )
            return store_price

    @staticmethod
    def _check_set_price_permission(store, user) -> None:
        """بررسی دسترسی برای ثبت قیمت فروشگاه"""
        if user.is_admin:
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

        raise UnauthorizedOrganizationAccess(
            'شما دسترسی به ثبت قیمت برای این فروشگاه را ندارید'
        )