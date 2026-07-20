from typing import Optional
from uuid import UUID
from django.db.models import QuerySet
from apps.common.base import BaseSelector
from apps.complaints.models import Complaint, ComplaintAttachment

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
    def get_by_uuid(uuid: UUID) -> Optional[Complaint]:
        try:
            return Complaint.objects.select_related(
                'store', 'product'
            ).prefetch_related('responses').get(uuid=uuid)
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
        return Complaint.objects.select_related(
            'store', 'product', 'customer'
        ).filter(store__union_id=union_id).order_by('-created_at')