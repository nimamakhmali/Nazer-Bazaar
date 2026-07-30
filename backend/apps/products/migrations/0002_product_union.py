"""
Migration: اضافه کردن فیلد union به مدل Product
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0001_initial'),
        ('organizations', '0001_initial'),
    ]

    operations = [
        # مرحله ۱: اضافه کردن فیلد union با null=True موقت
        migrations.AddField(
            model_name='product',
            name='union',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='products',
                to='organizations.union',
                verbose_name='اتحادیه',
                help_text='اتحادیه‌ای که این محصول را مدیریت می‌کند'
            ),
        ),

        # مرحله ۲: حذف index قدیمی category_active که با index جدید تداخل ندارد
        # و اضافه کردن index جدید برای union
        migrations.AddIndex(
            model_name='product',
            index=models.Index(
                fields=['union', 'is_active'],
                name='idx_product_union_active'
            ),
        ),

        # مرحله ۳: اضافه کردن UniqueConstraint
        migrations.AddConstraint(
            model_name='product',
            constraint=models.UniqueConstraint(
                fields=['union', 'name'],
                name='unique_product_name_per_union'
            ),
        ),

        # مرحله ۴: تغییر ordering
        migrations.AlterModelOptions(
            name='product',
            options={
                'ordering': ['union', 'category', 'order', 'name'],
                'verbose_name': 'محصول',
                'verbose_name_plural': 'محصولات',
            },
        ),
    ]