from django.db import models
from apps.common.base import BaseModel
from apps.common.choices import InspectionResult


class Inspection(BaseModel):
    """
    بازرسی انجام‌شده در پی یک شکایت.
    """
    complaint = models.OneToOneField(
        'Complaint',
        on_delete=models.CASCADE,
        related_name='inspection',
        verbose_name='شکایت مرجع'
    )
    inspector = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='inspections',
        verbose_name='بازرس',
        limit_choices_to={'role': 'inspector'}
    )
    inspection_date = models.DateField(verbose_name='تاریخ بازرسی')
    result = models.CharField(
        max_length=30,
        choices=InspectionResult.choices,
        verbose_name='نتیجه بازرسی'
    )
    notes = models.TextField(verbose_name='گزارش و یادداشت‌های بازرسی')

    class Meta:
        db_table = 'complaints_inspection'
        verbose_name = 'بازرسی'
        verbose_name_plural = 'بازرسی‌ها'
        ordering = ['-inspection_date']

    def __str__(self) -> str:
        return f"بازرسی شکایت {self.complaint.id} توسط {self.inspector.get_full_name()}"