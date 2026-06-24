from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from ..models import ActivityLog

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('actor', 'verb', 'linked_object', 'ip_address', 'created_at')
    list_filter = ('verb', 'content_type', 'created_at')
    search_fields = ('verb', 'actor__phone_number', 'ip_address')
    readonly_fields = ('actor', 'verb', 'ip_address', 'content_type', 'object_id', 'action_object', 'data', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def linked_object(self, obj):
        if obj.action_object:
            app_label = obj.content_type.app_label
            model = obj.content_type.model
            try:
                url = reverse(f'admin:{app_label}_{model}_change', args=[obj.object_id])
                return format_html('<a href="{}">{}</a>', url, obj.action_object)
            except:
                return obj.action_object
        return "—"
    linked_object.short_description = 'آبجکت مرتبط'