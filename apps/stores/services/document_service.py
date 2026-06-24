"""
Document Service - مدیریت مدارک فروشگاه
"""
import logging
from apps.common.base import BaseService
from apps.common.exceptions import (
    ResourceNotFoundError,
    UnauthorizedOrganizationAccess,
)
from apps.stores.models import StoreDocument, StoreLicense, DocumentType
from apps.stores.selectors import (
    StoreSelector,
    StoreDocumentSelector,
    StoreLicenseSelector,
)

logger = logging.getLogger(__name__)


class StoreDocumentService(BaseService):

    def upload_document(
        self,
        *,
        store_id: int,
        document_type: str,
        title: str,
        file,
        description: str = '',
        expire_date=None,
        requesting_user
    ) -> StoreDocument:
        """
        آپلود مدرک برای فروشگاه.

        مجاز: صاحب فروشگاه، مدیران سازمانی
        """
        store = StoreSelector.get_by_id(store_id)
        if not store:
            raise ResourceNotFoundError('فروشگاه مورد نظر یافت نشد')

        # بررسی دسترسی
        from apps.stores.services.store_service import StoreService
        StoreService._check_store_access(store, requesting_user)

        # اعتبارسنجی فایل
        from apps.common.utils import validate_image_file
        if document_type == DocumentType.STORE_IMAGE:
            validate_image_file(file)

        with self.transaction():
            document = StoreDocument.objects.create(
                store=store,
                document_type=document_type,
                title=title,
                file=file,
                description=description,
                expire_date=expire_date,
            )
            self.log_info(
                f'Document uploaded for store: {store.name}',
                store_id=store_id,
                document_type=document_type,
                by=requesting_user.id
            )
            return document

    def verify_document(
        self,
        *,
        document_id: int,
        requesting_user
    ) -> StoreDocument:
        """
        تایید مدرک فروشگاه.
        مجاز: ادمین، مدیر اتاق اصناف، رئیس اتحادیه
        """
        document = StoreDocumentSelector.get_by_id(document_id)
        if not document:
            raise ResourceNotFoundError('مدرک مورد نظر یافت نشد')

        # بررسی دسترسی
        self._check_verify_permission(document.store, requesting_user)

        if document.is_verified:
            raise ValueError('این مدرک قبلاً تایید شده است')

        with self.transaction():
            document.verify(verified_by=requesting_user)
            self.log_info(
                f'Document verified: {document.title}',
                document_id=document_id,
                store_id=document.store_id,
                by=requesting_user.id
            )
            return document

    def delete_document(
        self,
        *,
        document_id: int,
        requesting_user
    ) -> None:
        """حذف مدرک"""
        document = StoreDocumentSelector.get_by_id(document_id)
        if not document:
            raise ResourceNotFoundError('مدرک مورد نظر یافت نشد')

        if document.is_verified and not requesting_user.is_admin:
            raise ValueError('مدارک تایید شده را نمی‌توان حذف کرد')

        from apps.stores.services.store_service import StoreService
        StoreService._check_store_access(
            document.store,
            requesting_user
        )

        with self.transaction():
            # حذف فایل از storage
            if document.file:
                document.file.delete(save=False)
            document.delete()
            self.log_info(
                f'Document deleted: {document.title}',
                document_id=document_id,
                by=requesting_user.id
            )

    @staticmethod
    def _check_verify_permission(store, user) -> None:
        """بررسی دسترسی برای تایید مدرک"""
        if user.is_admin:
            return

        if user.is_chamber_manager:
            from apps.organizations.selectors import ChamberSelector
            user_chamber = ChamberSelector.get_by_manager(user.id)
            if user_chamber and (
                user_chamber.id == store.union.chamber_id
            ):
                return

        if user.is_union_manager:
            from apps.organizations.selectors import UnionSelector
            user_union = UnionSelector.get_by_manager(user.id)
            if user_union and user_union.id == store.union_id:
                return

        raise UnauthorizedOrganizationAccess()


class StoreLicenseService(BaseService):

    def create_license(
        self,
        *,
        store_id: int,
        license_number: str,
        issue_date,
        expire_date,
        issuing_authority: str,
        business_type: str,
        requesting_user
    ) -> StoreLicense:
        """ثبت پروانه کسب"""
        store = StoreSelector.get_by_id(store_id)
        if not store:
            raise ResourceNotFoundError('فروشگاه مورد نظر یافت نشد')

        # بررسی دسترسی
        from apps.stores.services.store_service import StoreService
        StoreService._check_store_access(store, requesting_user)

        # بررسی تکراری نبودن
        if StoreLicenseSelector.get_by_store(store_id):
            raise ValueError(
                'برای این فروشگاه قبلاً پروانه کسب ثبت شده است'
            )

        with self.transaction():
            license_obj = StoreLicense.objects.create(
                store=store,
                license_number=license_number,
                issue_date=issue_date,
                expire_date=expire_date,
                issuing_authority=issuing_authority,
                business_type=business_type,
            )
            self.log_info(
                f'License created for store: {store.name}',
                store_id=store_id,
                license_number=license_number,
                by=requesting_user.id
            )
            return license_obj

    def update_license(
        self,
        *,
        store_id: int,
        expire_date=None,
        is_valid: bool = None,
        requesting_user
    ) -> StoreLicense:
        """بروزرسانی پروانه کسب (مثلاً تمدید)"""
        license_obj = StoreLicenseSelector.get_by_store(store_id)
        if not license_obj:
            raise ResourceNotFoundError(
                'پروانه کسب برای این فروشگاه یافت نشد'
            )

        store = StoreSelector.get_by_id(store_id)
        from apps.stores.services.store_service import StoreService
        StoreService._check_store_access(store, requesting_user)

        update_fields = ['updated_at']

        if expire_date is not None:
            license_obj.expire_date = expire_date
            update_fields.append('expire_date')

        if is_valid is not None:
            license_obj.is_valid = is_valid
            update_fields.append('is_valid')

        with self.transaction():
            license_obj.save(update_fields=update_fields)
            self.log_info(
                f'License updated for store ID: {store_id}',
                store_id=store_id,
                by=requesting_user.id
            )
            return license_obj