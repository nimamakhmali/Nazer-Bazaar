import random
from django.core.management.base import BaseCommand
from apps.complaints.models import Complaint


class Command(BaseCommand):
    help = 'تولید کد رهگیری برای شکایات قبلی'

    def handle(self, *args, **kwargs):
        complaints = Complaint.objects.filter(tracking_code__isnull=True)
        count = complaints.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('همه شکایات کد رهگیری دارند'))
            return
        
        self.stdout.write(f'در حال تولید کد برای {count} شکایت...')
        
        for complaint in complaints:
            # تولید کد یکتا
            while True:
                code = str(random.randint(10000000, 99999999))
                if not Complaint.objects.filter(tracking_code=code).exists():
                    complaint.tracking_code = code
                    complaint.save(update_fields=['tracking_code'])
                    break
        
        self.stdout.write(self.style.SUCCESS(f'✅ {count} کد رهگیری تولید شد'))