from django.contrib import admin
from django.utils.html import format_html
from apps.complaints.models import (
    Complaint,
    ComplaintAttachment,
    ComplaintResponse,
    Inspection,
    Violation
)
from apps.common.choices import ComplaintStatus

class ComplaintAttachmentInline(admin.TabularInline):
    model = ComplaintAttachment
    extra = 0
    readonly_fields = ['created_at', 'uploaded_by']

class ComplaintResponseInline(admin.TabularInline):
    model = ComplaintResponse
    extra = 0
    readonly_fields = ['created_at', 'user']

class InspectionInline(admin.StackedInline):
    model = Inspection
    extra = 0
    readonly_fields = ['created_at']

@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'store',
        'product',
        'customer',
        'status_badge',
        'created_at',
    ]
    list_filter = ['status', 'store__union', 'created_at']
    search_fields = [
        'title',
        'description',
        'uuid',
        'store__name',
        'product__name',
        'customer__phone_number',
    ]
    readonly_fields = ['uuid', 'created_at', 'updated_at']
    autocomplete_fields = ['customer', 'store', 'product', 'assigned_to']
    inlines = [ComplaintAttachmentInline, ComplaintResponseInline, InspectionInline]
    date_hierarchy = 'created_at'

    def status_badge(self, obj: Complaint) -> str:
        colors = {
            ComplaintStatus.SUBMITTED: '#007bff',
            ComplaintStatus.REVIEWING: '#ffc107',
            ComplaintStatus.REFERRED: '#6f42c1',
            ComplaintStatus.INSPECTING: '#fd7e14',
            ComplaintStatus.CONFIRMED: '#28a745',
            ComplaintStatus.REJECTED: '#6c757d',
            ComplaintStatus.CLOSED: '#343a40',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;'
            'border-radius:4px;font-size:11px">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'وضعیت'

@admin.register(Violation)
class ViolationAdmin(admin.ModelAdmin):
    list_display = ['inspection', 'violation_type', 'fine_amount', 'created_at']
    list_filter = ['violation_type']
    search_fields = ['inspection__complaint__title', 'details']
    autocomplete_fields = ['inspection']