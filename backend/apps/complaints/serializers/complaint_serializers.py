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
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Complaint
        fields = ['uuid', 'title', 'store_name', 'status', 'status_display', 'created_at']

class ComplaintDetailSerializer(serializers.ModelSerializer):
    customer = UserBasicSerializer(read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    attachments = ComplaintAttachmentSerializer(many=True, read_only=True)
    responses = ComplaintResponseSerializer(many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = [
            'uuid', 'customer', 'store', 'store_name', 'product', 'product_name',
            'title', 'description', 'price_reported', 'price_proof',
            'status', 'status_display', 'assigned_to', 'resolution_note',
            'created_at', 'updated_at', 'attachments', 'responses'
        ]