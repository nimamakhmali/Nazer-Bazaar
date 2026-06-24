"""
Document Serializers
"""
from rest_framework import serializers
from apps.stores.models import StoreDocument, StoreLicense, DocumentType


class StoreDocumentSerializer(serializers.ModelSerializer):
    """جزئیات مدرک فروشگاه"""
    document_type_display = serializers.CharField(
        source='get_document_type_display',
        read_only=True
    )
    is_expired = serializers.BooleanField(read_only=True)
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StoreDocument
        fields = [
            'id',
            'store',
            'document_type',
            'document_type_display',
            'title',
            'file',
            'description',
            'expire_date',
            'is_verified',
            'verified_by_name',
            'verified_at',
            'is_expired',
            'created_at',
        ]
        read_only_fields = [
            'is_verified',
            'verified_by',
            'verified_at',
        ]

    def get_verified_by_name(self, obj: StoreDocument) -> str:
        if obj.verified_by:
            return obj.verified_by.full_name
        return ''


class StoreDocumentUploadSerializer(serializers.Serializer):
    """آپلود مدرک"""
    document_type = serializers.ChoiceField(
        choices=DocumentType.choices
    )
    title = serializers.CharField(max_length=200)
    file = serializers.FileField()
    description = serializers.CharField(
        required=False,
        allow_blank=True
    )
    expire_date = serializers.DateField(
        required=False,
        allow_null=True
    )

    def validate_file(self, value):
        """بررسی حجم فایل"""
        from apps.common.constants import MAX_DOCUMENT_SIZE_MB
        max_size = MAX_DOCUMENT_SIZE_MB * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f'حجم فایل نباید بیشتر از '
                f'{MAX_DOCUMENT_SIZE_MB} مگابایت باشد'
            )
        return value


class StoreLicenseSerializer(serializers.ModelSerializer):
    """اطلاعات پروانه کسب"""
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    needs_renewal = serializers.BooleanField(read_only=True)

    class Meta:
        model = StoreLicense
        fields = [
            'id',
            'store',
            'license_number',
            'issue_date',
            'expire_date',
            'issuing_authority',
            'business_type',
            'is_valid',
            'is_expired',
            'days_until_expiry',
            'needs_renewal',
            'created_at',
            'updated_at',
        ]


class StoreLicenseCreateSerializer(serializers.Serializer):
    """ثبت پروانه کسب"""
    license_number = serializers.CharField(max_length=50)
    issue_date = serializers.DateField()
    expire_date = serializers.DateField()
    issuing_authority = serializers.CharField(max_length=200)
    business_type = serializers.CharField(max_length=200)

    def validate(self, attrs: dict) -> dict:
        """تاریخ صدور باید قبل از تاریخ انقضا باشد"""
        if attrs.get('issue_date') and attrs.get('expire_date'):
            if attrs['issue_date'] >= attrs['expire_date']:
                raise serializers.ValidationError(
                    'تاریخ صدور باید قبل از تاریخ انقضا باشد'
                )
        return attrs