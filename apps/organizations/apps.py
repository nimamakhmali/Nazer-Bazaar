from django.apps import AppConfig

class OrganizationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.organizations'
    verbose_name = 'سازمان‌ها و اتحادیه‌ها'
    
    def ready(self):
        import apps.organizations.signals
        
        
    