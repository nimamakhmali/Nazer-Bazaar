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
        union_id: int,
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
        ادمین می‌تواند برای هر اتحادیه‌ای محصول ایجاد کند.
        رئیس اتحادیه فقط برای اتحادیه خودش می‌تواند محصول ایجاد کند.
        """
        from apps.organizations.models import Union

        # بررسی دسترسی
        self._check_create_permission(
            requesting_user=requesting_user,
            union_id=union_id
        )

        name = normalize_persian_text(name)

        # بررسی اتحادیه
        union = Union.objects.filter(
            id=union_id,
            is_active=True
        ).first()
        if not union:
            raise ResourceNotFoundError('اتحادیه مورد نظر یافت نشد')

        # بررسی دسته‌بندی
        category = ProductCategory.objects.filter(
            id=category_id,
            is_active=True
        ).first()
        if not category:
            raise ResourceNotFoundError('دسته‌بندی مورد نظر یافت نشد')

        # بررسی واحد
        unit = ProductUnit.objects.filter(
            id=unit_id,
            is_active=True
        ).first()
        if not unit:
            raise ResourceNotFoundError(
                'واحد اندازه‌گیری مورد نظر یافت نشد'
            )

        # بررسی تکراری نبودن نام در همان اتحادیه
        if ProductSelector.exists_by_name_in_union(name, union_id):
            raise ResourceAlreadyExistsError(
                f'محصولی با نام "{name}" '
                f'در این اتحادیه قبلاً ثبت شده است'
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
                union=union,
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
                union_id=union_id,
                category_id=category_id,
                by=requesting_user.id
            )
            return product

    def update(
        self,
        *,
        product_id: int,
        union_id: Optional[int] = None,
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
        product = Product.objects.select_related(
            'union',
            'category',
            'unit'
        ).filter(id=product_id).first()

        if not product:
            raise ResourceNotFoundError('محصول مورد نظر یافت نشد')

        # بررسی دسترسی
        self._check_update_permission(
            requesting_user=requesting_user,
            product=product
        )

        update_fields = ['updated_at']

        # تغییر اتحادیه (فقط ادمین)
        if union_id is not None and union_id != product.union_id:
            if not requesting_user.is_admin:
                raise PermissionError(
                    'فقط ادمین می‌تواند اتحادیه محصول را تغییر دهد'
                )
            from apps.organizations.models import Union
            union = Union.objects.filter(
                id=union_id,
                is_active=True
            ).first()
            if not union:
                raise ResourceNotFoundError('اتحادیه مورد نظر یافت نشد')
            product.union = union
            update_fields.append('union')

        # بررسی و تغییر دسته‌بندی
        if category_id is not None and category_id != product.category_id:
            category = ProductCategory.objects.filter(
                id=category_id,
                is_active=True
            ).first()
            if not category:
                raise ResourceNotFoundError('دسته‌بندی مورد نظر یافت نشد')
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
            target_union_id = (
                union_id if union_id is not None else product.union_id
            )
            if ProductSelector.exists_by_name_in_union(
                name,
                target_union_id,
                exclude_id=product_id
            ):
                raise ResourceAlreadyExistsError(
                    f'محصولی با نام "{name}" '
                    f'در این اتحادیه قبلاً ثبت شده است'
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
        product = Product.objects.select_related(
            'union'
        ).filter(id=product_id).first()
        if not product:
            raise ResourceNotFoundError('محصول مورد نظر یافت نشد')

        self._check_update_permission(
            requesting_user=requesting_user,
            product=product
        )

        from apps.common.utils import validate_image_file
        validate_image_file(image)

        if product.image:
            product.image.delete(save=False)

        with self.transaction():
            product.image = image
            product.save(update_fields=['image', 'updated_at'])

        return product

    # ─── Permission Helpers ──────────────────────────────────────────────────

    @staticmethod
    def _check_create_permission(requesting_user, union_id: int) -> None:
        """
        ادمین: می‌تواند برای هر اتحادیه‌ای محصول بسازد.
        رئیس اتحادیه: فقط برای اتحادیه خودش.
        """
        if requesting_user.is_admin:
            return

        if requesting_user.role == 'union_manager':
            from apps.organizations.models import Union
            is_manager = Union.objects.filter(
                id=union_id,
                manager=requesting_user
            ).exists()
            if not is_manager:
                raise PermissionError(
                    'شما فقط می‌توانید برای اتحادیه خودتان محصول ایجاد کنید'
                )
            return

        raise PermissionError('شما دسترسی لازم برای ایجاد محصول را ندارید')

    @staticmethod
    def _check_update_permission(requesting_user, product: Product) -> None:
        """
        ادمین: می‌تواند هر محصولی را ویرایش کند.
        رئیس اتحادیه: فقط محصولات اتحادیه خودش.
        """
        if requesting_user.is_admin:
            return

        if requesting_user.role == 'union_manager':
            from apps.organizations.models import Union
            is_manager = Union.objects.filter(
                id=product.union_id,
                manager=requesting_user
            ).exists()
            if not is_manager:
                raise PermissionError(
                    'شما فقط می‌توانید محصولات اتحادیه خودتان را ویرایش کنید'
                )
            return

        raise PermissionError('شما دسترسی لازم برای ویرایش محصول را ندارید')

    @staticmethod
    def _generate_unique_slug(name: str, exclude_id: int = None) -> str:
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