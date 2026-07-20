"""
Pagination استاندارد پروژه
"""
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsPagination(PageNumberPagination):
    """
    صفحه‌بندی استاندارد API.
    
    فرمت پاسخ:
    {
        "success": true,
        "data": {
            "count": 100,
            "total_pages": 5,
            "current_page": 1,
            "next": "http://...",
            "previous": null,
            "results": [...]
        }
    }
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'

    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'data': {
                'count': self.page.paginator.count,
                'total_pages': self.page.paginator.num_pages,
                'current_page': self.page.number,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
                'results': data,
            }
        })

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'success': {'type': 'boolean'},
                'data': {
                    'type': 'object',
                    'properties': {
                        'count': {'type': 'integer'},
                        'total_pages': {'type': 'integer'},
                        'current_page': {'type': 'integer'},
                        'next': {'type': 'string', 'nullable': True},
                        'previous': {'type': 'string', 'nullable': True},
                        'results': schema,
                    }
                }
            }
        }


class LargeResultsPagination(PageNumberPagination):
    """برای لیست‌های بزرگ مثل گزارش‌ها"""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
    