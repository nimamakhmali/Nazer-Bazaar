"""
Product Service
"""
import logging
from typing import Optional
from django.utils.text import slugify
from apps.common.base import BaseService
from apps.common.exceptions import (
    ResourceNotFoundError,
    ResourceAlreadyExistsError,
)
from apps.common.utils import normalize_persian_text
from apps.products.models import Product, ProductCategory, ProductUnit
from apps.products.selectors import ProductSelector, ProductCategorySelector

logger = logging.getLogger(__name__)


class ProductService(BaseService):

    def create(
        self,
        *,
        name: str,
        category_id: int,
        unit_id: int,
        description: str = '',
        brand: str = '',
        origin: str = '',
        barcode: str = None,
        order: int = 0,
        is_featured: bool = False,
        specifications: dict = None,
        requesting_user
    ) -> Product:
        """
        ایجاد محصول جدید.
        فقط ادمین می‌تواند محصول ایجاد کند.
        """
        if not requesting_user.is_admin:
            raise PermissionError(
                'فقط ادمین می‌تواند محصول ایجاد کند'
            )

        name = normalize_persian_text(name)

        # بررسی دسته‌بندی
        category = ProductCategory.objects.filter(
            id=category_id,
            is_active=True
        ).first()
        if not category:
            raise ResourceNotFoundError(
                'دسته‌بندی مورد نظر یافت نشد'
            )

        # بررسی واحد
        unit = ProductUnit.objects.filter(
            id=unit_id,
            is_active=True
        ).first()
        if not unit:
            raise ResourceNotFoundError(
                'واحد اندازه‌گیری مورد نظر یافت نشد'
            )

        # بررسی تکراری نبودن نام در دسته‌بندی
        if ProductSelector.exists_by_name(name, category_id):
            raise ResourceAlreadyExistsError(
                f'محصولی با نام "{name}" '
                f'در این دسته‌بندی قبلاً ثبت شده است'
            )

        # بررسی تکراری نبودن بارکد
        if barcode and ProductSelector.exists_by_barcode(barcode):
            raise ResourceAlreadyExistsError(
                f'محصولی با بارکد "{barcode}" قبلاً ثبت شده است'
            )

        # تولید slug
        slug = self._generate_unique_slug(name)

        with self.transaction():
            product = Product.objects.create(
                name=name,
                category=category,
                unit=unit,
                slug=slug,
                description=description,
                brand=brand,
                origin=origin,
                barcode=barcode or None,
                order=order,
                is_featured=is_featured,
                specifications=specifications or {},
            )
            self.log_info(
                f'Product created: {product.name}',
                product_id=product.id,
                category_id=category_id,
                by=requesting_user.id
            )
            return product

    def update(
        self,
        *,
        product_id: int,
        name: Optional[str] = None,
        category_id: Optional[int] = None,
        unit_id: Optional[int] = None,
        description: Optional[str] = None,
        brand: Optional[str] = None,
        origin: Optional[str] = None,
        barcode: Optional[str] = None,
        order: Optional[int] = None,
        is_featured: Optional[bool] = None,
        is_active: Optional[bool] = None,
        specifications: Optional[dict] = None,
        requesting_user
    ) -> Product:
        """ویرایش محصول"""
        if not requesting_user.is_admin:
            raise PermissionError(
                'فقط ادمین می‌تواند محصول ویرایش کند'
            )

        product = Product.objects.select_related(
            'category',
            'unit'
        ).filter(id=product_id).first()

        if not product:
            raise ResourceNotFoundError('محصول مورد نظر یافت نشد')

        update_fields = ['updated_at']

        # بررسی و تغییر دسته‌بندی
        if category_id is not None and category_id != product.category_id:
            category = ProductCategory.objects.filter(
                id=category_id,
                is_active=True
            ).first()
            if not category:
                raise ResourceNotFoundError(
                    'دسته‌بندی مورد نظر یافت نشد'
                )
            product.category = category
            update_fields.append('category')

        # بررسی و تغییر واحد
        if unit_id is not None and unit_id != product.unit_id:
            unit = ProductUnit.objects.filter(
                id=unit_id,
                is_active=True
            ).first()
            if not unit:
                raise ResourceNotFoundError(
                    'واحد اندازه‌گیری مورد نظر یافت نشد'
                )
            product.unit = unit
            update_fields.append('unit')

        # تغییر نام
        if name is not None and name != product.name:
            name = normalize_persian_text(name)
            target_category_id = (
                category_id
                if category_id is not None
                else product.category_id
            )
            if ProductSelector.exists_by_name(
                name,
                target_category_id,
                exclude_id=product_id
            ):
                raise ResourceAlreadyExistsError(
                    f'محصولی با نام "{name}" '
                    f'در این دسته‌بندی قبلاً ثبت شده است'
                )
            product.name = name
            product.slug = self._generate_unique_slug(
                name,
                exclude_id=product_id
            )
            update_fields.extend(['name', 'slug'])

        # بررسی بارکد
        if barcode is not None and barcode != product.barcode:
            if barcode and ProductSelector.exists_by_barcode(
                barcode,
                exclude_id=product_id
            ):
                raise ResourceAlreadyExistsError(
                    f'محصولی با بارکد "{barcode}" قبلاً ثبت شده است'
                )
            product.barcode = barcode or None
            update_fields.append('barcode')

        if description is not None:
            product.description = description
            update_fields.append('description')

        if brand is not None:
            product.brand = brand
            update_fields.append('brand')

        if origin is not None:
            product.origin = origin
            update_fields.append('origin')

        if order is not None:
            product.order = order
            update_fields.append('order')

        if is_featured is not None:
            product.is_featured = is_featured
            update_fields.append('is_featured')

        if is_active is not None:
            product.is_active = is_active
            update_fields.append('is_active')

        if specifications is not None:
            product.specifications = specifications
            update_fields.append('specifications')

        with self.transaction():
            product.save(update_fields=update_fields)
            self.log_info(
                f'Product updated: {product.name}',
                product_id=product_id,
                by=requesting_user.id
            )
            return product

    def upload_image(
        self,
        *,
        product_id: int,
        image,
        requesting_user
    ) -> Product:
        """آپلود تصویر محصول"""
        if not requesting_user.is_admin:
            raise PermissionError(
                'فقط ادمین می‌تواند تصویر محصول را تغییر دهد'
            )

        product = Product.objects.filter(id=product_id).first()
        if not product:
            raise ResourceNotFoundError('محصول مورد نظر یافت نشد')

        from apps.common.utils import validate_image_file
        validate_image_file(image)

        # حذف تصویر قبلی
        if product.image:
            product.image.delete(save=False)

        with self.transaction():
            product.image = image
            product.save(update_fields=['image', 'updated_at'])

        return product

    @staticmethod
    def _generate_unique_slug(
        name: str,
        exclude_id: int = None
    ) -> str:
        """تولید slug یکتا"""
        base_slug = slugify(name, allow_unicode=True)
        slug = base_slug
        counter = 1

        while True:
            qs = Product.objects.filter(slug=slug)
            if exclude_id:
                qs = qs.exclude(id=exclude_id)
            if not qs.exists():
                break
            slug = f'{base_slug}-{counter}'
            counter += 1

        return slug