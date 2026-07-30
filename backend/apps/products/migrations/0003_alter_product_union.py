from django.db import migrations, models
import django.db.models.deletion


def set_default_union(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    Union = apps.get_model('organizations', 'Union')
    default_union = Union.objects.filter(id=2).first()
    if default_union:
        Product.objects.filter(union__isnull=True).update(union=default_union)


def reverse_set_default_union(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    Product.objects.filter(union_id=2).update(union=None)


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0001_initial"),
        ("products", "0002_product_union"),
    ]

    operations = [
        migrations.RunPython(
            set_default_union,
            reverse_set_default_union,
        ),
        migrations.AlterField(
            model_name="product",
            name="union",
            field=models.ForeignKey(
                help_text="اتحادیه\u200cای که این محصول را مدیریت می\u200cکند",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="products",
                to="organizations.union",
                verbose_name="اتحادیه",
            ),
        ),
    ]