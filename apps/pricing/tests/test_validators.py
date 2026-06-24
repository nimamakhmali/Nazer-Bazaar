"""
تست اعتبارسنجی قیمت - مهم‌ترین تست‌های سیستم
"""
import pytest
from decimal import Decimal
from apps.pricing.services.price_validator_service import PriceValidatorService
from apps.common.exceptions import PriceValidationError


class TestPriceValidatorService:
    """
    تست قانون 80%-100%
    این تست‌ها مهم‌ترین تست‌های کل سیستم هستند.
    """

    def setup_method(self):
        self.validator = PriceValidatorService()
        self.official_price = Decimal('100000')  # 100,000 ریال

    def test_valid_price_at_minimum(self):
        """قیمت دقیقاً 80% قیمت مصوب - معتبر"""
        store_price = Decimal('80000')
        result = self.validator.validate(store_price, self.official_price)
        assert result.is_valid is True
        assert len(result.errors) == 0

    def test_valid_price_at_maximum(self):
        """قیمت دقیقاً 100% قیمت مصوب - معتبر"""
        store_price = Decimal('100000')
        result = self.validator.validate(store_price, self.official_price)
        assert result.is_valid is True

    def test_valid_price_in_middle(self):
        """قیمت در وسط محدوده - معتبر"""
        store_price = Decimal('90000')
        result = self.validator.validate(store_price, self.official_price)
        assert result.is_valid is True

    def test_invalid_price_too_low(self):
        """قیمت کمتر از 80% - نامعتبر"""
        store_price = Decimal('79999')
        result = self.validator.validate(store_price, self.official_price)
        assert result.is_valid is False
        assert len(result.errors) > 0
        assert result.is_underpriced is True

    def test_invalid_price_too_high(self):
        """قیمت بالاتر از قیمت مصوب - گران‌فروشی"""
        store_price = Decimal('100001')
        result = self.validator.validate(store_price, self.official_price)
        assert result.is_valid is False
        assert result.is_overpriced is True

    def test_invalid_price_zero(self):
        """قیمت صفر - نامعتبر"""
        store_price = Decimal('0')
        result = self.validator.validate(store_price, self.official_price)
        assert result.is_valid is False

    def test_discount_percent_calculation(self):
        """محاسبه درصد تخفیف"""
        store_price = Decimal('85000')
        result = self.validator.validate(store_price, self.official_price)
        assert result.discount_percent == Decimal('15.00')

    def test_validate_and_raise_valid(self):
        """اعتبارسنجی با raise - قیمت معتبر"""
        store_price = Decimal('90000')
        result = self.validator.validate_and_raise(
            store_price,
            self.official_price
        )
        assert result.is_valid is True

    def test_validate_and_raise_invalid(self):
        """اعتبارسنجی با raise - قیمت نامعتبر"""
        store_price = Decimal('110000')
        with pytest.raises(PriceValidationError):
            self.validator.validate_and_raise(
                store_price,
                self.official_price
            )

    def test_price_range_calculation(self):
        """محاسبه محدوده قیمت"""
        price_range = self.validator.calculate_price_range(
            self.official_price
        )
        assert price_range['min'] == Decimal('80000')
        assert price_range['max'] == Decimal('100000')
        assert price_range['official'] == Decimal('100000')

    def test_overpricing_detection(self):
        """تشخیص گران‌فروشی"""
        assert self.validator.is_overpriced(
            Decimal('100001'),
            self.official_price
        ) is True
        assert self.validator.is_overpriced(
            Decimal('100000'),
            self.official_price
        ) is False
        assert self.validator.is_overpriced(
            Decimal('90000'),
            self.official_price
        ) is False

    def test_violation_amount(self):
        """محاسبه مبلغ تخلف"""
        assert self.validator.calculate_violation_amount(
            Decimal('110000'),
            self.official_price
        ) == Decimal('10000')
        assert self.validator.calculate_violation_amount(
            Decimal('90000'),
            self.official_price
        ) == Decimal('0')

    def test_price_boundaries(self):
        """تست مرزها"""
        # دقیقاً 80% - باید معتبر باشد
        assert self.validator.validate(
            Decimal('80000'),
            Decimal('100000')
        ).is_valid is True

        # یک ریال کمتر از 80% - نامعتبر
        assert self.validator.validate(
            Decimal('79999'),
            Decimal('100000')
        ).is_valid is False

        # دقیقاً 100% - معتبر
        assert self.validator.validate(
            Decimal('100000'),
            Decimal('100000')
        ).is_valid is True

        # یک ریال بیشتر از 100% - نامعتبر
        assert self.validator.validate(
            Decimal('100001'),
            Decimal('100000')
        ).is_valid is False