
from django.db import models
from apps.common.base import BaseModel


class City(BaseModel):

    province = models.ForeignKey(
        'Province',
        on_delete=models.PROTECT,
        related_name='cities',
        verbose_name='استان'
    )
    name = models.CharField(
        max_length=100,
        verbose_name='نام شهر'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        db_index=True
    )

    class Meta:
        db_table = 'geography_city'
        verbose_name = 'شهر'
        verbose_name_plural = 'شهرها'
        ordering = ['province__name', 'name']
        # هر شهر در هر استان باید نام یکتا داشته باشد
        constraints = [
            models.UniqueConstraint(
                fields=['province', 'name'],
                name='unique_city_per_province'
            )
        ]

    def __str__(self) -> str:
        return f'{self.name} - {self.province.name}'

    @property
    def full_name(self) -> str:
        return f'{self.province.name} / {self.name}'