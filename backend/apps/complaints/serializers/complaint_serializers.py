from rest_framework import serializers
from apps.complaints.models import Complaint, ComplaintAttachment, ComplaintResponse
from apps.accounts.serializers import UserBasicSerializer


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
    
    # ✅ NEW: اطلاعات ارجاع
    escalation_level = serializers.IntegerField(read_only=True)
    is_overdue = serializers.SerializerMethodField()
    hours_since_created = serializers.IntegerField(read_only=True)

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
    
    def get_is_overdue(self, obj):
        """آیا شکایت از زمان مقرر گذشته؟"""
        return obj.is_overdue_48h or obj.is_overdue_96h


class ComplaintDetailSerializer(serializers.ModelSerializer):
    customer = UserBasicSerializer(read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    attachments = ComplaintAttachmentSerializer(many=True, read_only=True)
    responses = ComplaintResponseSerializer(many=True, read_only=True)
    tracking_code = serializers.CharField(read_only=True)
    
    # ✅ قیمت فرمت شده
    price_reported_formatted = serializers.SerializerMethodField()
    
    # ✅ NEW: اطلاعات ارجاع
    assigned_union_manager_name = serializers.CharField(
        source='assigned_union_manager.full_name', 
        read_only=True, 
        allow_null=True
    )
    assigned_chamber_manager_name = serializers.CharField(
        source='assigned_chamber_manager.full_name', 
        read_only=True, 
        allow_null=True
    )
    assigned_province_manager_name = serializers.CharField(
        source='assigned_province_manager.full_name', 
        read_only=True, 
        allow_null=True
    )
    
    escalation_level = serializers.IntegerField(read_only=True)
    hours_since_created = serializers.IntegerField(read_only=True)
    is_overdue_48h = serializers.BooleanField(read_only=True)
    is_overdue_96h = serializers.BooleanField(read_only=True)

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
            'responses'
        ]
    
    def get_price_reported_formatted(self, obj):
        """فرمت قیمت با جداکننده هزارگان"""
        try:
            return f"{int(obj.price_reported):,}".replace(',', '٬')
        except:
            return str(obj.price_reported)