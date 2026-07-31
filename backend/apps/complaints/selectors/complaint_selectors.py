from typing import Optional
from uuid import UUID
from django.db.models import QuerySet
from apps.common.base import BaseSelector
from apps.complaints.models import Complaint


class ComplaintSelector(BaseSelector):
    
    @staticmethod
    def get_by_id(complaint_id: int) -> Optional[Complaint]:
        try:
            return Complaint.objects.select_related(
                'customer', 'store', 'product', 'assigned_to'
            ).prefetch_related('attachments', 'responses').get(id=complaint_id)
        except Complaint.DoesNotExist:
            return None

    @staticmethod
    def get_by_uuid(uuid_or_str) -> Optional[Complaint]:
        """
        پشتیبانی از UUID object یا string
        """
        try:
            return Complaint.objects.select_related(
                'customer', 'store', 'product', 'assigned_to'
            ).prefetch_related('attachments', 'responses__user').get(uuid=uuid_or_str)
        except (Complaint.DoesNotExist, ValueError):
            return None

    @staticmethod
    def get_by_tracking_code(code: str) -> Optional[Complaint]:
        """
        جستجو با کد رهگیری عددی ۸ رقمی
        """
        try:
            return Complaint.objects.select_related(
                'customer', 'store', 'product', 'assigned_to'
            ).prefetch_related('attachments', 'responses__user').get(tracking_code=code)
        except Complaint.DoesNotExist:
            return None

    @staticmethod
    def get_by_customer(customer_id: int) -> QuerySet[Complaint]:
        return Complaint.objects.select_related(
            'store', 'product'
        ).filter(customer_id=customer_id).order_by('-created_at')

    @staticmethod
    def get_for_store(store_id: int) -> QuerySet[Complaint]:
        return Complaint.objects.select_related(
            'customer', 'product'
        ).filter(store_id=store_id).order_by('-created_at')

    @staticmethod
    def get_for_union(union_id: int) -> QuerySet[Complaint]:
        """
        شکایات مربوط به فروشگاه‌های یک اتحادیه
        """
        return Complaint.objects.select_related(
            'store', 'product', 'customer'
        ).filter(store__union_id=union_id).order_by('-created_at')
    
    @staticmethod
    def get_for_chamber(chamber_id: int) -> QuerySet[Complaint]:
        """
        شکایات مربوط به فروشگاه‌های اتحادیه‌های یک اتاق اصناف
        """
        return Complaint.objects.select_related(
            'store', 'product', 'customer'
        ).filter(store__union__chamber_id=chamber_id).order_by('-created_at')
    
    @staticmethod
    def get_for_province(province_id: int) -> QuerySet[Complaint]:
        """
        شکایات مربوط به یک استان
        """
        return Complaint.objects.select_related(
            'store', 'product', 'customer'
        ).filter(store__union__chamber__city__province_id=province_id).order_by('-created_at')
    
    @staticmethod
    def get_all() -> QuerySet[Complaint]:
        """
        تمام شکایات (برای ادمین)
        """
        return Complaint.objects.select_related(
            'store', 'product', 'customer'
        ).order_by('-created_at')