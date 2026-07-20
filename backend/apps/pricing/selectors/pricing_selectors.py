"""
Pricing Selectors
"""
from typing import Optional
from datetime import date
from django.db.models import QuerySet, Q, Avg, Min, Max, Count
from django.utils import timezone
from apps.common.base import BaseSelector
from apps.pricing.models import (
    OfficialPrice,
    StorePrice,
    PriceHistory,
)


class OfficialPriceSelector(BaseSelector):

    @staticmethod
    def get_for_today(
        union_id: int,
        product_id: int,
        date: date = None
    ) -> Optional[OfficialPrice]:
        """
        قیمت مصوب یک محصول برای یک اتحادیه در یک روز خاص.
        این مهم‌ترین کوئری سیستم است.
        """
        if date is None:
            date = timezone.now().date()

        try:
            return OfficialPrice.objects.select_related(
                'union',
                'product',
                'product__unit',
                'created_by',
            ).get(
                union_id=union_id,
                product_id=product_id,
                effective_date=date,
                is_active=True
            )
        except OfficialPrice.DoesNotExist:
            return None

    @staticmethod
    def get_by_union_product_date(
        union_id: int,
        product_id: int,
        date: date
    ) -> Optional[OfficialPrice]:
        """دریافت قیمت مصوب با union+product+date"""
        return OfficialPriceSelector.get_for_today(
            union_id=union_id,
            product_id=product_id,
            date=date
        )

    @staticmethod
    def exists_for_date(
        union_id: int,
        product_id: int,
        date: date
    ) -> bool:
        """بررسی وجود قیمت مصوب برای یک روز"""
        return OfficialPrice.objects.filter(
            union_id=union_id,
            product_id=product_id,
            effective_date=date,
            is_active=True
        ).exists()

    @staticmethod
    def get_by_id(official_price_id: int) -> Optional[OfficialPrice]:
        """دریافت قیمت مصوب با ID"""
        try:
            return OfficialPrice.objects.select_related(
                'union',
                'product',
                'product__unit',
                'created_by',
            ).get(id=official_price_id)
        except OfficialPrice.DoesNotExist:
            return None

    @staticmethod
    def get_by_union_and_date(
        union_id: int,
        date: date = None
    ) -> QuerySet:
        """
        تمام قیمت‌های مصوب یک اتحادیه در یک روز.
        برای رئیس اتحادیه استفاده می‌شود.
        """
        if date is None:
            date = timezone.now().date()

        return OfficialPrice.objects.select_related(
            'product',
            'product__unit',
            'product__category',
            'created_by',
        ).filter(
            union_id=union_id,
            effective_date=date,
            is_active=True
        ).order_by('product__name')

    @staticmethod
    def get_latest_for_product(
        product_id: int,
        union_id: int = None
    ) -> Optional[OfficialPrice]:
        """آخرین قیمت مصوب یک محصول"""
        qs = OfficialPrice.objects.select_related(
            'union',
            'product',
            'product__unit',
        ).filter(
            product_id=product_id,
            is_active=True,
            effective_date__lte=timezone.now().date()
        )
        if union_id:
            qs = qs.filter(union_id=union_id)
        return qs.order_by('-effective_date').first()

    @staticmethod
    def get_by_date_range(
        union_id: int,
        product_id: int,
        start_date: date,
        end_date: date
    ) -> QuerySet:
        """قیمت‌های مصوب در یک بازه زمانی"""
        return OfficialPrice.objects.select_related(
            'product',
            'product__unit',
            'created_by',
        ).filter(
            union_id=union_id,
            product_id=product_id,
            effective_date__gte=start_date,
            effective_date__lte=end_date,
            is_active=True
        ).order_by('effective_date')

    @staticmethod
    def get_all_for_admin(
        union_id: int = None,
        product_id: int = None,
        date: date = None
    ) -> QuerySet:
        """تمام قیمت‌های مصوب برای ادمین"""
        qs = OfficialPrice.objects.select_related(
            'union',
            'union__chamber__city',
            'product',
            'product__unit',
            'created_by',
        ).all()

        if union_id:
            qs = qs.filter(union_id=union_id)
        if product_id:
            qs = qs.filter(product_id=product_id)
        if date:
            qs = qs.filter(effective_date=date)

        return qs.order_by('-effective_date', 'product__name')


class StorePriceSelector(BaseSelector):

    @staticmethod
    def get_by_store_product_date(
        store_id: int,
        product_id: int,
        date: date
    ) -> Optional[StorePrice]:
        """
        قیمت فروشگاه برای یک محصول در یک روز.
        برای بررسی تکراری نبودن استفاده می‌شود.
        """
        try:
            return StorePrice.objects.select_related(
                'store',
                'product',
                'official_price',
            ).get(
                store_id=store_id,
                product_id=product_id,
                price_date=date,
                is_active=True
            )
        except StorePrice.DoesNotExist:
            return None

    @staticmethod
    def get_by_id(store_price_id: int) -> Optional[StorePrice]:
        """دریافت قیمت فروشگاه با ID"""
        try:
            return StorePrice.objects.select_related(
                'store',
                'store__union',
                'store__owner',
                'product',
                'product__unit',
                'official_price',
                'created_by',
            ).get(id=store_price_id)
        except StorePrice.DoesNotExist:
            return None

    @staticmethod
    def get_today_prices_for_store(
        store_id: int,
        date: date = None
    ) -> QuerySet:
        """
        قیمت‌های امروز یک فروشگاه.
        برای صاحب فروشگاه نمایش داده می‌شود.
        """
        if date is None:
            date = timezone.now().date()

        return StorePrice.objects.select_related(
            'product',
            'product__unit',
            'product__category',
            'official_price',
        ).filter(
            store_id=store_id,
            price_date=date,
            is_active=True
        ).order_by('product__name')

    @staticmethod
    def get_by_union_and_date(
        union_id: int,
        date: date = None
    ) -> QuerySet:
        """
        قیمت‌های تمام فروشگاه‌های یک اتحادیه در یک روز.
        برای رئیس اتحادیه و مقایسه قیمت‌ها استفاده می‌شود.
        """
        if date is None:
            date = timezone.now().date()

        return StorePrice.objects.select_related(
            'store',
            'store__owner',
            'product',
            'product__unit',
            'official_price',
        ).filter(
            store__union_id=union_id,
            price_date=date,
            is_active=True
        ).order_by('product__name', 'store__name')

    @staticmethod
    def get_overpriced_today(
        union_id: int = None,
        date: date = None
    ) -> QuerySet:
        """
        قیمت‌های بالاتر از قیمت مصوب (گران‌فروشی).
        برای شناسایی تخلفات استفاده می‌شود.
        """
        from django.db.models import F
        if date is None:
            date = timezone.now().date()

        qs = StorePrice.objects.select_related(
            'store',
            'store__union',
            'product',
            'official_price',
        ).filter(
            price_date=date,
            is_active=True,
            price__gt=F('official_price_amount')
        )

        if union_id:
            qs = qs.filter(store__union_id=union_id)

        return qs.order_by('-price')

    @staticmethod
    def get_price_comparison(
        product_id: int,
        city_id: int,
        date: date = None
    ) -> QuerySet:
        """
        مقایسه قیمت یک محصول در فروشگاه‌های مختلف یک شهر.
        برای مردم/مشتریان استفاده می‌شود.
        """
        if date is None:
            date = timezone.now().date()

        return StorePrice.objects.select_related(
            'store',
            'store__union',
            'store__union__chamber__city',
            'product',
            'product__unit',
            'official_price',
        ).filter(
            product_id=product_id,
            price_date=date,
            is_active=True,
            store__is_active=True,
            store__union__chamber__city_id=city_id,
        ).order_by('price')

    @staticmethod
    def get_price_stats(
        product_id: int,
        union_id: int,
        date: date = None
    ) -> dict:
        """
        آمار قیمت‌های یک محصول در فروشگاه‌های یک اتحادیه.
        """
        if date is None:
            date = timezone.now().date()

        stats = StorePrice.objects.filter(
            product_id=product_id,
            store__union_id=union_id,
            price_date=date,
            is_active=True
        ).aggregate(
            avg_price=Avg('price'),
            min_price=Min('price'),
            max_price=Max('price'),
            stores_count=Count('id'),
        )
        return stats

    @staticmethod
    def get_by_product_and_date_range(
        product_id: int,
        store_id: int,
        start_date: date,
        end_date: date
    ) -> QuerySet:
        """تاریخچه قیمت یک محصول در یک فروشگاه"""
        return StorePrice.objects.filter(
            product_id=product_id,
            store_id=store_id,
            price_date__gte=start_date,
            price_date__lte=end_date,
            is_active=True
        ).order_by('price_date')


class PriceHistorySelector(BaseSelector):

    @staticmethod
    def get_by_product(
        product_id: int,
        limit: int = 50
    ) -> QuerySet:
        """تاریخچه قیمت‌های یک محصول"""
        return PriceHistory.objects.select_related(
            'changed_by',
        ).filter(
            product_id=product_id
        ).order_by('-created_at')[:limit]

    @staticmethod
    def get_by_store(
        store_id: int,
        limit: int = 50
    ) -> QuerySet:
        """تاریخچه قیمت‌های یک فروشگاه"""
        return PriceHistory.objects.select_related(
            'changed_by',
        ).filter(
            store_id=store_id
        ).order_by('-created_at')[:limit]

    @staticmethod
    def get_by_union(
        union_id: int,
        date: date = None
    ) -> QuerySet:
        """تاریخچه قیمت‌های یک اتحادیه"""
        qs = PriceHistory.objects.filter(union_id=union_id)
        if date:
            qs = qs.filter(price_date=date)
        return qs.order_by('-created_at')