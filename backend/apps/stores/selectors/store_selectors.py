"""
Store Selectors - تمام کوئری‌های مربوط به فروشگاه
"""
from typing import Optional
from django.db.models import QuerySet, Q, Count
from apps.common.base import BaseSelector
from apps.common.choices import StoreStatus
from apps.stores.models import Store, StoreDocument, StoreLicense


class StoreSelector(BaseSelector):

    @staticmethod
    def get_all_active() -> QuerySet:
        """
        تمام فروشگاه‌های فعال و تایید شده.
        برای نمایش عمومی به مردم استفاده می‌شود.
        """
        return Store.objects.select_related(
            'union',
            'union__chamber',
            'union__chamber__city',
            'union__chamber__city__province',
            'owner',
        ).filter(
            is_active=True,
            status=StoreStatus.ACTIVE
        ).order_by('name')

    @staticmethod
    def get_by_id(store_id: int) -> Optional[Store]:
        """دریافت فروشگاه با ID"""
        try:
            return Store.objects.select_related(
                'union',
                'union__chamber',
                'union__chamber__city',
                'union__chamber__city__province',
                'owner',
                'status_changed_by',
            ).get(id=store_id)
        except Store.DoesNotExist:
            return None

    @staticmethod
    def get_by_union(union_id: int) -> QuerySet:
        """
        فروشگاه‌های یک اتحادیه.
        برای رئیس اتحادیه استفاده می‌شود.
        """
        return Store.objects.select_related(
            'union',
            'owner',
        ).filter(
            union_id=union_id,
            is_active=True
        ).order_by('name')

    @staticmethod
    def get_by_union_active(union_id: int) -> QuerySet:
        """فروشگاه‌های فعال و تایید‌شده یک اتحادیه"""
        return Store.objects.select_related(
            'union',
            'owner',
        ).filter(
            union_id=union_id,
            is_active=True,
            status=StoreStatus.ACTIVE
        ).order_by('name')

    @staticmethod
    def get_by_owner(user_id: int) -> QuerySet:
        """
        فروشگاه‌های یک صاحب فروشگاه.
        یک کاربر می‌تواند چند فروشگاه داشته باشد.
        """
        return Store.objects.select_related(
            'union',
            'union__chamber',
            'union__chamber__city',
        ).filter(
            owner_id=user_id
        ).order_by('name')

    @staticmethod
    def get_by_city(city_id: int) -> QuerySet:
        """فروشگاه‌های یک شهر"""
        return Store.objects.select_related(
            'union',
            'union__chamber',
            'owner',
        ).filter(
            union__chamber__city_id=city_id,
            is_active=True,
            status=StoreStatus.ACTIVE
        ).order_by('name')

    @staticmethod
    def get_by_province(province_id: int) -> QuerySet:
        """فروشگاه‌های یک استان"""
        return Store.objects.select_related(
            'union',
            'union__chamber',
            'union__chamber__city',
            'owner',
        ).filter(
            union__chamber__city__province_id=province_id,
            is_active=True,
            status=StoreStatus.ACTIVE
        ).order_by('union__chamber__city__name', 'name')

    @staticmethod
    def get_pending_approval() -> QuerySet:
        """
        فروشگاه‌های در انتظار تایید.
        برای مدیران اتاق اصناف و اتحادیه استفاده می‌شود.
        """
        return Store.objects.select_related(
            'union',
            'union__chamber',
            'owner',
        ).filter(
            status=StoreStatus.PENDING
        ).order_by('created_at')

    @staticmethod
    def get_pending_by_union(union_id: int) -> QuerySet:
        """فروشگاه‌های در انتظار تایید یک اتحادیه"""
        return Store.objects.select_related(
            'union',
            'owner',
        ).filter(
            union_id=union_id,
            status=StoreStatus.PENDING
        ).order_by('created_at')

    @staticmethod
    def get_suspended() -> QuerySet:
        """فروشگاه‌های تعلیق‌شده"""
        return Store.objects.select_related(
            'union',
            'owner',
            'status_changed_by',
        ).filter(
            status=StoreStatus.SUSPENDED
        ).order_by('-status_changed_at')

    @staticmethod
    def search(
        query: str,
        city_id: int = None,
        union_id: int = None
    ) -> QuerySet:
        """
        جستجو در فروشگاه‌ها.
        بر اساس نام، شماره پروانه، آدرس
        """
        qs = Store.objects.select_related(
            'union',
            'union__chamber',
            'union__chamber__city',
            'owner',
        ).filter(
            is_active=True,
            status=StoreStatus.ACTIVE
        )

        if city_id:
            qs = qs.filter(union__chamber__city_id=city_id)

        if union_id:
            qs = qs.filter(union_id=union_id)

        return qs.filter(
            Q(name__icontains=query) |
            Q(license_number__icontains=query) |
            Q(address__icontains=query) |
            Q(owner__first_name__icontains=query) |
            Q(owner__last_name__icontains=query)
        ).order_by('name')

    @staticmethod
    def get_with_stats(store_id: int) -> Optional[Store]:
        """
        دریافت فروشگاه با آمار.
        تعداد شکایات و قیمت‌ها
        """
        try:
            return Store.objects.select_related(
                'union',
                'union__chamber',
                'union__chamber__city',
                'union__chamber__city__province',
                'owner',
            ).annotate(
                total_complaints=Count('complaints', distinct=True),
            ).get(id=store_id)
        except Store.DoesNotExist:
            return None

    @staticmethod
    def get_all_for_admin() -> QuerySet:
        """تمام فروشگاه‌ها برای ادمین"""
        return Store.objects.select_related(
            'union',
            'union__chamber',
            'union__chamber__city',
            'owner',
        ).all().order_by('-created_at')

    @staticmethod
    def license_number_exists(
        license_number: str,
        exclude_id: int = None
    ) -> bool:
        """بررسی تکراری نبودن شماره پروانه"""
        qs = Store.objects.filter(license_number=license_number)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()


class StoreDocumentSelector(BaseSelector):

    @staticmethod
    def get_by_store(store_id: int) -> QuerySet:
        """تمام مدارک یک فروشگاه"""
        return StoreDocument.objects.select_related(
            'store',
            'verified_by',
        ).filter(store_id=store_id).order_by('-created_at')

    @staticmethod
    def get_by_id(document_id: int) -> Optional[StoreDocument]:
        """دریافت مدرک با ID"""
        try:
            return StoreDocument.objects.select_related(
                'store',
                'verified_by',
            ).get(id=document_id)
        except StoreDocument.DoesNotExist:
            return None

    @staticmethod
    def get_unverified_by_store(store_id: int) -> QuerySet:
        """مدارک تایید نشده یک فروشگاه"""
        return StoreDocument.objects.filter(
            store_id=store_id,
            is_verified=False
        ).order_by('-created_at')


class StoreLicenseSelector(BaseSelector):

    @staticmethod
    def get_by_store(store_id: int) -> Optional[StoreLicense]:
        """پروانه کسب یک فروشگاه"""
        try:
            return StoreLicense.objects.select_related(
                'store'
            ).get(store_id=store_id)
        except StoreLicense.DoesNotExist:
            return None

    @staticmethod
    def get_expiring_soon(days: int = 30) -> QuerySet:
        """
        پروانه‌هایی که به زودی منقضی می‌شوند.
        برای ارسال هشدار تمدید استفاده می‌شود.
        """
        from django.utils import timezone
        from datetime import timedelta
        expiry_threshold = timezone.now().date() + timedelta(days=days)

        return StoreLicense.objects.select_related(
            'store',
            'store__owner',
        ).filter(
            expire_date__lte=expiry_threshold,
            expire_date__gte=timezone.now().date(),
            is_valid=True
        ).order_by('expire_date')