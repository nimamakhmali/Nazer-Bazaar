class ActivityLogMiddleware:
    """
    یک middleware ساده برای اضافه کردن IP و user به request.
    ثبت لاگ اصلی بهتر است در Service ها انجام شود.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Attach user and IP to the request for easier access in services
        request.user_ip = self.get_client_ip(request)
        response = self.get_response(request)
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')