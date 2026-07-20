from django.db import models
from apps.common.base import BaseModel
from apps.common.choices import ViolationType


class Violation(BaseModel):
    """
    تخلف ثبت‌شده پس از یک بازرسی.
    """
    inspection = models.OneToOneField(
        'Inspection',
        on_delete=models.CASCADE,
        related_name='violation',
        verbose_name='بازرسی مرجع'
    )
    violation_type = models.CharField(
        max_length=30,
        choices=ViolationType.choices,
        verbose_name='نوع تخلف'
    )
    fine_amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        null=True,
        blank=True,
        verbose_name='مبلغ جریمه (ریال)'
    )
    details = models.TextField(verbose_name='جزئیات تخلف')

    class Meta:
        db_table = 'complaints_violation'
        verbose_name = 'تخلف'
        verbose_name_plural = 'تخلفات'

    def __str__(self) -> str:
        return f"تخلف: {self.get_violation_type_display()} برای بازرسی {self.inspection.id}"