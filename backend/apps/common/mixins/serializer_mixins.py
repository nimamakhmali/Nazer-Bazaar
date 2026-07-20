"""
Serializer Mixins - قابلیت‌های مشترک Serializer ها
"""


class DynamicFieldsMixin:
    """
    امکان انتخاب فیلدهای مورد نیاز از طریق query parameter.
    
    مثال:
        GET /api/v1/products/?fields=id,name,price
    """
    def __init__(self, *args, **kwargs):
        fields = kwargs.pop('fields', None)
        super().__init__(*args, **kwargs)

        if fields is not None:
            allowed = set(fields)
            existing = set(self.fields)
            for field_name in existing - allowed:
                self.fields.pop(field_name)


class ReadOnlyMixin:
    """تبدیل همه فیلدها به read-only"""
    def get_fields(self):
        fields = super().get_fields()
        for field in fields.values():
            field.read_only = True
        return fields
    
    