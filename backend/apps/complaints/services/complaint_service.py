import logging
from typing import Optional
from apps.common.base import BaseService
from apps.common.choices import UserRole, ComplaintStatus
from apps.common.exceptions import ResourceNotFoundError, UnauthorizedOrganizationAccess
from apps.complaints.models import Complaint, ComplaintAttachment, ComplaintResponse
from apps.complaints.selectors import ComplaintSelector

logger = logging.getLogger(__name__)

class ComplaintService(BaseService):

    def create(
        self,
        *,
        customer_id: int,
        store_id: int,
        product_id: int,
        title: str,
        description: str,
        price_reported: int,
        price_proof=None
    ) -> Complaint:
        """
        ایجاد شکایت جدید توسط مشتری.
        """
        from apps.accounts.models import User
        from apps.stores.models import Store
        from apps.products.models import Product

        customer = User.objects.filter(id=customer_id, role=UserRole.CUSTOMER).first()
        if not customer:
            raise ResourceNotFoundError("کاربر شاکی یافت نشد.")

        store = Store.objects.filter(id=store_id, is_active=True).first()
        if not store:
            raise ResourceNotFoundError("فروشگاه مورد نظر یافت نشد.")

        product = Product.objects.filter(id=product_id, is_active=True).first()
        if not product:
            raise ResourceNotFoundError("محصول مورد نظر یافت نشد.")

        with self.transaction():
            complaint = Complaint.objects.create(
                customer=customer,
                store=store,
                product=product,
                title=title,
                description=description,
                price_reported=price_reported,
                price_proof=price_proof,
                status=ComplaintStatus.SUBMITTED
            )

            # ارسال نوتیفیکیشن به مدیر اتحادیه مربوطه
            from ..tasks import notify_new_complaint
            notify_new_complaint.delay(complaint.id)

            self.log_info(
                f"New complaint created: {complaint.uuid} for store {store.name}",
                complaint_id=complaint.id,
                customer_id=customer_id,
                store_id=store_id
            )
            return complaint

    def add_response(
        self,
        *,
        complaint_id: int,
        user_id: int,
        response_text: str,
        is_internal_note: bool = False
    ) -> ComplaintResponse:
        """افزودن پاسخ یا یادداشت به شکایت"""
        complaint = ComplaintSelector.get_by_id(complaint_id)
        if not complaint:
            raise ResourceNotFoundError("شکایت مورد نظر یافت نشد.")

        from apps.accounts.models import User
        user = User.objects.filter(id=user_id).first()
        if not user:
            raise ResourceNotFoundError("کاربر پاسخ‌دهنده یافت نشد.")

        # TODO: Add permission check: only involved parties can add response

        with self.transaction():
            response = ComplaintResponse.objects.create(
                complaint=complaint,
                user=user,
                response_text=response_text,
                is_internal_note=is_internal_note
            )
            return response

    def change_status(
        self,
        *,
        complaint_id: int,
        new_status: str,
        requesting_user,
        note: str = None
    ) -> Complaint:
        """تغییر وضعیت شکایت"""
        complaint = ComplaintSelector.get_by_id(complaint_id)
        if not complaint:
            raise ResourceNotFoundError("شکایت مورد نظر یافت نشد.")

        # TODO: Add permission check for changing status

        old_status = complaint.status
        complaint.status = new_status
        if note:
            complaint.resolution_note = note
        
        with self.transaction():
            complaint.save()

            # ارسال نوتیفیکیشن به مشتری
            from ..tasks import send_complaint_status_update
            send_complaint_status_update.delay(complaint.id)

            self.log_info(
                f"Complaint status changed: {complaint.uuid} from {old_status} to {new_status}",
                complaint_id=complaint.id,
                by=requesting_user.id
            )
            return complaint