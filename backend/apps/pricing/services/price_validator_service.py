"""
Price Validator Service

مهم‌ترین سرویس سیستم قیمت‌گذاری.
تمام قوانین کسب‌وکار مربوط به اعتبارسنجی قیمت اینجاست.

قوانین:
    1. قیمت فروشگاه باید >= 80% قیمت مصوب باشد
    2. قیمت فروشگاه باید <= 100% قیمت مصوب باشد
    3. فروشگاه باید active و تایید شده باشد
    4. برای محصول باید قیمت مصوب روز وجود داشته باشد
    5. اتحادیه فروشگاه باید همان اتحادیه صادرکننده قیمت مصوب باشد
"""
from decimal import Decimal
from dataclasses import dataclass
from typing import Optional
from apps.common.constants import (
    PRICE_MIN_RATIO,
    PRICE_MAX_RATIO,
    calculate_min_allowed_price,
    calculate_max_allowed_price,
    is_price_valid,
)
from apps.common.exceptions import PriceValidationError


@dataclass
class PriceValidationResult:
    """نتیجه اعتبارسنجی قیمت"""
    is_valid: bool
    store_price: Decimal
    official_price: Decimal
    min_allowed_price: Decimal
    max_allowed_price: Decimal
    errors: list

    @property
    def discount_percent(self) -> Decimal:
        if self.official_price == 0:
            return Decimal('0')
        return (
            (self.official_price - self.store_price)
            / self.official_price * 100
        ).quantize(Decimal('0.01'))

    @property
    def is_overpriced(self) -> bool:
        return self.store_price > self.max_allowed_price

    @property
    def is_underpriced(self) -> bool:
        return self.store_price < self.min_allowed_price


class PriceValidatorService:
    """
    سرویس اعتبارسنجی قیمت.

    این سرویس stateless است و هیچ وابستگی به دیتابیس ندارد.
    تمام منطق خالص اعتبارسنجی اینجاست.
    """

    def validate(
        self,
        store_price: Decimal,
        official_price: Decimal
    ) -> PriceValidationResult:
        """
        اعتبارسنجی قیمت فروشگاه در برابر قیمت مصوب.

        Args:
            store_price: قیمت پیشنهادی فروشگاه
            official_price: قیمت مصوب اتحادیه

        Returns:
            PriceValidationResult: نتیجه کامل اعتبارسنجی
        """
        min_price = calculate_min_allowed_price(official_price)
        max_price = calculate_max_allowed_price(official_price)
        errors = []

        # بررسی قیمت منفی یا صفر
        if store_price <= 0:
            errors.append('قیمت فروشگاه باید بزرگ‌تر از صفر باشد')

        # بررسی حداقل قیمت
        elif store_price < min_price:
            errors.append(
                f'قیمت فروشگاه ({store_price:,} ریال) '
                f'کمتر از حداقل مجاز ({min_price:,} ریال) است. '
                f'حداقل قیمت مجاز: {int(PRICE_MIN_RATIO * 100)}% '
                f'قیمت مصوب'
            )

        # بررسی حداکثر قیمت (گران‌فروشی)
        elif store_price > max_price:
            excess = store_price - max_price
            errors.append(
                f'قیمت فروشگاه ({store_price:,} ریال) '
                f'بیشتر از قیمت مصوب ({max_price:,} ریال) است. '
                f'مبلغ اضافه: {excess:,} ریال'
            )

        return PriceValidationResult(
            is_valid=len(errors) == 0,
            store_price=store_price,
            official_price=official_price,
            min_allowed_price=min_price,
            max_allowed_price=max_price,
            errors=errors,
        )

    def validate_and_raise(
        self,
        store_price: Decimal,
        official_price: Decimal
    ) -> PriceValidationResult:
        """
        اعتبارسنجی قیمت و raise کردن exception در صورت خطا.

        Raises:
            PriceValidationError: اگر قیمت در محدوده مجاز نباشد
        """
        result = self.validate(store_price, official_price)
        if not result.is_valid:
            raise PriceValidationError(
                message='. '.join(result.errors)
            )
        return result

    @staticmethod
    def calculate_price_range(official_price: Decimal) -> dict:
        """
        محاسبه محدوده مجاز قیمت.

        Returns:
            dict: {'min': ..., 'max': ..., 'official': ...}
        """
        return {
            'official': official_price,
            'min': calculate_min_allowed_price(official_price),
            'max': calculate_max_allowed_price(official_price),
            'min_ratio': PRICE_MIN_RATIO,
            'max_ratio': PRICE_MAX_RATIO,
        }

    @staticmethod
    def is_overpriced(
        store_price: Decimal,
        official_price: Decimal
    ) -> bool:
        """آیا قیمت گران‌فروشی محسوب می‌شود؟"""
        return store_price > official_price

    @staticmethod
    def calculate_violation_amount(
        store_price: Decimal,
        official_price: Decimal
    ) -> Decimal:
        """
        محاسبه مبلغ تخلف (گران‌فروشی).
        اگر گران‌فروشی نباشد، صفر برمی‌گرداند.
        """
        if store_price > official_price:
            return store_price - official_price
        return Decimal('0')