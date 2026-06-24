"""
Document Admin
"""
from django.contrib import admin
from apps.stores.models import StoreDocument, StoreLicense


@admin.register(StoreDocument)
class StoreDocumentAdmin(admin.ModelAdmin):
    list_display = [
        'store',
        'document_type',
        'title',
        'is_verified',
        'is_expired',
        'expire_date',
        'created_at',
    ]
    list_filter = [
        'document_type',
        'is_verified',
    ]
    search_fields = [
        'store__name',
        'title',
    ]
    readonly_fields = [
        'created_at',
        'updated_at',
        'verified_at',
    ]
    autocomplete_fields = ['store']

    def is_expired(self, obj: StoreDocument) -> bool:
        return obj.is_expired
    is_expired.boolean = True
    is_expired.short_description = 'منقضی'


@admin.register(StoreLicense)
class StoreLicenseAdmin(admin.ModelAdmin):
    list_display = [
        'store',
        'license_number',
        'business_type',
        'expire_date',
        'is_expired',
        'needs_renewal',
        'is_valid',
    ]
    list_filter = ['is_valid', 'business_type']
    search_fields = [
        'store__name',
        'license_number',
    ]
    readonly_fields = ['created_at', 'updated_at']

    def is_expired(self, obj: StoreLicense) -> bool:
        return obj.is_expired
    is_expired.boolean = True
    is_expired.short_description = 'منقضی'

    def needs_renewal(self, obj: StoreLicense) -> bool:
        return obj.needs_renewal
    needs_renewal.boolean = True
    needs_renewal.short_description = 'نیاز به تمدید'