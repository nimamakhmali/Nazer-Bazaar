from rest_framework import serializers
from apps.complaints.models import Complaint, ComplaintAttachment, ComplaintResponse
from apps.accounts.serializers import UserBasicSerializer
from apps.common.choices import ComplaintStatus


class ComplaintAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintAttachment
        fields = ['id', 'file', 'description', 'uploaded_by', 'created_at']


class ComplaintResponseSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = ComplaintResponse
        fields = ['id', 'user', 'response_text', 'is_internal_note', 'created_at']


class ComplaintCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = [
            'store',
            'product',
            'title',
            'description',
            'price_reported',
            'price_proof',
        ]


class ComplaintListSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    tracking_code = serializers.CharField(read_only=True)

    escalation_level = serializers.IntegerField(read_only=True)
    is_overdue = serializers.SerializerMethodField()
    hours_since_created = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = [
            'uuid',
            'tracking_code',
            'title',
            'store_name',
            'product_name',
            'status',
            'status_display',
            'escalation_level',
            'is_overdue',
            'hours_since_created',
            'created_at',
            'updated_at',
        ]

    def get_is_overdue(self, obj) -> bool:
        try:
            return bool(obj.is_overdue_48h or obj.is_overdue_96h)
        except Exception:
            return False

    def get_hours_since_created(self, obj) -> int:
        try:
            return int(obj.hours_since_created)
        except Exception:
            return 0


class ComplaintDetailSerializer(serializers.ModelSerializer):
    customer = UserBasicSerializer(read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    attachments = ComplaintAttachmentSerializer(many=True, read_only=True)
    responses = ComplaintResponseSerializer(many=True, read_only=True)
    tracking_code = serializers.CharField(read_only=True)

    price_reported_formatted = serializers.SerializerMethodField()

    assigned_union_manager_name = serializers.SerializerMethodField()
    assigned_chamber_manager_name = serializers.SerializerMethodField()
    assigned_province_manager_name = serializers.SerializerMethodField()

    escalation_level = serializers.IntegerField(read_only=True)
    hours_since_created = serializers.SerializerMethodField()
    is_overdue_48h = serializers.SerializerMethodField()
    is_overdue_96h = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = [
            'uuid',
            'tracking_code',
            'customer',
            'store',
            'store_name',
            'product',
            'product_name',
            'title',
            'description',
            'price_reported',
            'price_reported_formatted',
            'price_proof',
            'status',
            'status_display',
            'assigned_to',
            'assigned_union_manager_name',
            'assigned_chamber_manager_name',
            'assigned_province_manager_name',
            'escalation_level',
            'hours_since_created',
            'is_overdue_48h',
            'is_overdue_96h',
            'escalated_at_48h',
            'escalated_at_96h',
            'resolution_note',
            'created_at',
            'updated_at',
            'attachments',
            'responses',
        ]

    def get_price_reported_formatted(self, obj) -> str:
        try:
            return f"{int(obj.price_reported):,}".replace(',', '٬')
        except Exception:
            return str(obj.price_reported)

    def get_assigned_union_manager_name(self, obj) -> str | None:
        try:
            if obj.assigned_union_manager_id:
                return obj.assigned_union_manager.full_name
            return None
        except Exception:
            return None

    def get_assigned_chamber_manager_name(self, obj) -> str | None:
        try:
            if obj.assigned_chamber_manager_id:
                return obj.assigned_chamber_manager.full_name
            return None
        except Exception:
            return None

    def get_assigned_province_manager_name(self, obj) -> str | None:
        try:
            if obj.assigned_province_manager_id:
                return obj.assigned_province_manager.full_name
            return None
        except Exception:
            return None

    def get_hours_since_created(self, obj) -> int:
        try:
            return int(obj.hours_since_created)
        except Exception:
            return 0

    def get_is_overdue_48h(self, obj) -> bool:
        try:
            return bool(obj.is_overdue_48h)
        except Exception:
            return False

    def get_is_overdue_96h(self, obj) -> bool:
        try:
            return bool(obj.is_overdue_96h)
        except Exception:
            return False


# ✅ NEW: سریالایزر تغییر وضعیت شکایت
class ComplaintStatusChangeSerializer(serializers.Serializer):
    """
    استفاده در endpoint تغییر وضعیت شکایت توسط مدیران.
    وضعیت SUBMITTED در لیست مجاز نیست چون آن وضعیت اولیه‌ی خودکار سیستم است.
    """
    ALLOWED_STATUSES = [
        ComplaintStatus.REVIEWING,
        ComplaintStatus.REFERRED,
        ComplaintStatus.INSPECTING,
        ComplaintStatus.CONFIRMED,
        ComplaintStatus.REJECTED,
        ComplaintStatus.CLOSED,
    ]

    status = serializers.ChoiceField(choices=ComplaintStatus.choices)
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000
    )

    def validate_status(self, value):
        if value not in self.ALLOWED_STATUSES:
            raise serializers.ValidationError(
                'این وضعیت برای تغییر مجاز نیست.'
            )
        return value