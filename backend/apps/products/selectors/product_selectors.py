"""
Product Selectors
"""
from typing import Optional
from django.db.models import QuerySet, Q, Prefetch
from apps.common.base import BaseSelector
from apps.products.models import Product, ProductCategory, ProductUnit


class ProductCategorySelector(BaseSelector):

    @staticmethod
    def get_all_active() -> QuerySet:
        """تمام دسته‌بندی‌های فعال"""
        return ProductCategory.objects.filter(
            is_active=True
        ).order_by('order', 'name')

    @staticmethod
    def get_root_categories() -> QuerySet:
        """
        دسته‌بندی‌های ریشه (بدون والد).
        برای نمایش منوی اصلی.
        """
        return ProductCategory.objects.filter(
            parent__isnull=True,
            is_active=True
        ).prefetch_related(
            Prefetch(
                'children',
                queryset=ProductCategory.objects.filter(
                    is_active=True
                ).order_by('order', 'name')
            )
        ).order_by('order', 'name')

    @staticmethod
    def get_children(parent_id: int) -> QuerySet:
        """زیردسته‌های یک دسته"""
        return ProductCategory.objects.filter(
            parent_id=parent_id,
            is_active=True
        ).order_by('order', 'name')

    @staticmethod
    def get_by_id(category_id: int) -> Optional[ProductCategory]:
        """دریافت دسته‌بندی با ID"""
        try:
            return ProductCategory.objects.select_related(
                'parent'
            ).get(id=category_id, is_active=True)
        except ProductCategory.DoesNotExist:
            return None

    @staticmethod
    def get_by_slug(slug: str) -> Optional[ProductCategory]:
        """دریافت دسته‌بندی با slug"""
        try:
            return ProductCategory.objects.select_related(
                'parent'
            ).get(slug=slug, is_active=True)
        except ProductCategory.DoesNotExist:
            return None

    @staticmethod
    def exists_by_name(
        name: str,
        parent_id: int = None,
        exclude_id: int = None
    ) -> bool:
        """بررسی تکراری نبودن نام در همان سطح"""
        qs = ProductCategory.objects.filter(
            name=name,
            parent_id=parent_id
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    @staticmethod
    def get_all_with_products() -> QuerySet:
        """دسته‌بندی‌ها به همراه محصولاتشان"""
        return ProductCategory.objects.filter(
            is_active=True
        ).prefetch_related(
            Prefetch(
                'products',
                queryset=Product.objects.filter(
                    is_active=True
                ).select_related('unit')
            )
        ).order_by('order', 'name')

    @staticmethod
    def get_all() -> QuerySet:
        """تمام دسته‌بندی‌ها (برای ادمین)"""
        return ProductCategory.objects.select_related(
            'parent'
        ).all().order_by('order', 'name')


class ProductSelector(BaseSelector):

    @staticmethod
    def get_all_active() -> QuerySet:
        """تمام محصولات فعال"""
        return Product.objects.select_related(
            'category',
            'unit',
        ).filter(
            is_active=True
        ).order_by('category__name', 'order', 'name')

    @staticmethod
    def get_by_id(product_id: int) -> Optional[Product]:
        """دریافت محصول با ID"""
        try:
            return Product.objects.select_related(
                'category',
                'category__parent',
                'unit',
            ).get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return None

    @staticmethod
    def get_by_slug(slug: str) -> Optional[Product]:
        """دریافت محصول با slug"""
        try:
            return Product.objects.select_related(
                'category',
                'unit',
            ).get(slug=slug, is_active=True)
        except Product.DoesNotExist:
            return None

    @staticmethod
    def get_by_barcode(barcode: str) -> Optional[Product]:
        """دریافت محصول با بارکد"""
        try:
            return Product.objects.select_related(
                'category',
                'unit',
            ).get(barcode=barcode, is_active=True)
        except Product.DoesNotExist:
            return None

    @staticmethod
    def get_by_category(
        category_id: int,
        include_children: bool = True
    ) -> QuerySet:
        """
        محصولات یک دسته‌بندی.
        اگر include_children=True باشد، محصولات زیردسته‌ها هم شامل می‌شود.
        """
        if include_children:
            # دریافت تمام ID های زیردسته‌ها
            category = ProductCategorySelector.get_by_id(category_id)
            if not category:
                return Product.objects.none()

            category_ids = [category_id]
            for child in category.get_descendants():
                category_ids.append(child.id)

            return Product.objects.select_related(
                'category',
                'unit',
            ).filter(
                category_id__in=category_ids,
                is_active=True
            ).order_by('order', 'name')

        return Product.objects.select_related(
            'category',
            'unit',
        ).filter(
            category_id=category_id,
            is_active=True
        ).order_by('order', 'name')

    @staticmethod
    def get_featured() -> QuerySet:
        """محصولات ویژه (برای صفحه اصلی)"""
        return Product.objects.select_related(
            'category',
            'unit',
        ).filter(
            is_active=True,
            is_featured=True
        ).order_by('order', 'name')

    @staticmethod
    def search(query: str) -> QuerySet:
        """
        جستجو در محصولات.
        بر اساس نام، برند، بارکد، توضیحات
        """
        return Product.objects.select_related(
            'category',
            'unit',
        ).filter(
            is_active=True
        ).filter(
            Q(name__icontains=query) |
            Q(brand__icontains=query) |
            Q(barcode__icontains=query) |
            Q(description__icontains=query) |
            Q(category__name__icontains=query)
        ).order_by('name')

    @staticmethod
    def exists_by_name(
        name: str,
        category_id: int,
        exclude_id: int = None
    ) -> bool:
        """بررسی تکراری نبودن نام در دسته‌بندی"""
        qs = Product.objects.filter(
            name=name,
            category_id=category_id
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    @staticmethod
    def exists_by_barcode(
        barcode: str,
        exclude_id: int = None
    ) -> bool:
        """بررسی تکراری نبودن بارکد"""
        qs = Product.objects.filter(barcode=barcode)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    @staticmethod
    def get_all() -> QuerySet:
        """تمام محصولات (برای ادمین)"""
        return Product.objects.select_related(
            'category',
            'unit',
        ).all().order_by('category__name', 'name')

    @staticmethod
    def get_for_pricing(union_id: int) -> QuerySet:
        """
        محصولاتی که برای یک اتحادیه قابل قیمت‌گذاری هستند.
        بر اساس دسته‌بندی اتحادیه فیلتر می‌شود.
        """
        return Product.objects.select_related(
            'category',
            'unit',
        ).filter(
            is_active=True
        ).order_by('category__name', 'name')


class ProductUnitSelector(BaseSelector):

    @staticmethod
    def get_all_active() -> QuerySet:
        """تمام واحدهای اندازه‌گیری فعال"""
        return ProductUnit.objects.filter(
            is_active=True
        ).order_by('name')

    @staticmethod
    def get_by_id(unit_id: int) -> Optional[ProductUnit]:
        """دریافت واحد با ID"""
        try:
            return ProductUnit.objects.get(
                id=unit_id,
                is_active=True
            )
        except ProductUnit.DoesNotExist:
            return None

    @staticmethod
    def get_by_symbol(symbol: str) -> Optional[ProductUnit]:
        """دریافت واحد با نماد"""
        try:
            return ProductUnit.objects.get(symbol=symbol)
        except ProductUnit.DoesNotExist:
            return None

    @staticmethod
    def get_all() -> QuerySet:
        """تمام واحدها (برای ادمین)"""
        return ProductUnit.objects.all().order_by('name')