"""
Category Service
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
from apps.products.models import ProductCategory
from apps.products.selectors import ProductCategorySelector

logger = logging.getLogger(__name__)


class ProductCategoryService(BaseService):

    def create(
        self,
        *,
        name: str,
        parent_id: int = None,
        description: str = '',
        icon: str = '',
        order: int = 0,
        requesting_user
    ) -> ProductCategory:
        """
        ایجاد دسته‌بندی محصول.
        فقط ادمین می‌تواند این کار را انجام دهد.
        """
        if not requesting_user.is_admin:
            raise PermissionError(
                'فقط ادمین می‌تواند دسته‌بندی محصول ایجاد کند'
            )

        name = normalize_persian_text(name)

        # بررسی والد
        parent = None
        if parent_id:
            parent = ProductCategory.objects.filter(
                id=parent_id,
                is_active=True
            ).first()
            if not parent:
                raise ResourceNotFoundError(
                    'دسته‌بندی والد مورد نظر یافت نشد'
                )

        # بررسی تکراری نبودن
        if ProductCategorySelector.exists_by_name(name, parent_id):
            raise ResourceAlreadyExistsError(
                f'دسته‌بندی با نام "{name}" '
                f'در این سطح قبلاً ثبت شده است'
            )

        # تولید slug یکتا
        slug = self._generate_unique_slug(name)

        with self.transaction():
            category = ProductCategory.objects.create(
                name=name,
                parent=parent,
                slug=slug,
                description=description,
                icon=icon,
                order=order,
            )
            self.log_info(
                f'ProductCategory created: {category.name}',
                category_id=category.id,
                by=requesting_user.id
            )
            return category

    def update(
        self,
        *,
        category_id: int,
        name: Optional[str] = None,
        parent_id: Optional[int] = None,
        description: Optional[str] = None,
        icon: Optional[str] = None,
        order: Optional[int] = None,
        is_active: Optional[bool] = None,
        requesting_user
    ) -> ProductCategory:
        """ویرایش دسته‌بندی"""
        if not requesting_user.is_admin:
            raise PermissionError(
                'فقط ادمین می‌تواند دسته‌بندی محصول ویرایش کند'
            )

        category = ProductCategory.objects.select_related(
            'parent'
        ).filter(id=category_id).first()

        if not category:
            raise ResourceNotFoundError(
                'دسته‌بندی مورد نظر یافت نشد'
            )

        update_fields = ['updated_at']

        if name is not None:
            name = normalize_persian_text(name)
            target_parent_id = (
                parent_id
                if parent_id is not None
                else category.parent_id
            )
            if ProductCategorySelector.exists_by_name(
                name,
                target_parent_id,
                exclude_id=category_id
            ):
                raise ResourceAlreadyExistsError(
                    f'دسته‌بندی با نام "{name}" '
                    f'در این سطح قبلاً ثبت شده است'
                )
            category.name = name
            category.slug = self._generate_unique_slug(
                name,
                exclude_id=category_id
            )
            update_fields.extend(['name', 'slug'])

        if parent_id is not None:
            if parent_id == 0:
                # تبدیل به دسته ریشه
                category.parent = None
            else:
                parent = ProductCategory.objects.filter(
                    id=parent_id,
                    is_active=True
                ).first()
                if not parent:
                    raise ResourceNotFoundError(
                        'دسته‌بندی والد مورد نظر یافت نشد'
                    )
                # بررسی جلوگیری از حلقه در درخت
                if parent_id == category_id:
                    raise ValueError(
                        'یک دسته‌بندی نمی‌تواند والد خودش باشد'
                    )
                category.parent = parent
            update_fields.append('parent')

        if description is not None:
            category.description = description
            update_fields.append('description')

        if icon is not None:
            category.icon = icon
            update_fields.append('icon')

        if order is not None:
            category.order = order
            update_fields.append('order')

        if is_active is not None:
            category.is_active = is_active
            update_fields.append('is_active')

        with self.transaction():
            category.save(update_fields=update_fields)
            self.log_info(
                f'ProductCategory updated: {category.name}',
                category_id=category_id,
                by=requesting_user.id
            )
            return category

    @staticmethod
    def _generate_unique_slug(
        name: str,
        exclude_id: int = None
    ) -> str:
        """تولید slug یکتا از نام"""
        base_slug = slugify(name, allow_unicode=True)
        slug = base_slug
        counter = 1

        while True:
            qs = ProductCategory.objects.filter(slug=slug)
            if exclude_id:
                qs = qs.exclude(id=exclude_id)
            if not qs.exists():
                break
            slug = f'{base_slug}-{counter}'
            counter += 1

        return slug