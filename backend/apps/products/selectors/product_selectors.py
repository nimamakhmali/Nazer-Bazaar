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
        return ProductCategory.objects.filter(
            is_active=True
        ).order_by('order', 'name')

    @staticmethod
    def get_root_categories() -> QuerySet:
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
        return ProductCategory.objects.filter(
            parent_id=parent_id,
            is_active=True
        ).order_by('order', 'name')

    @staticmethod
    def get_by_id(category_id: int) -> Optional[ProductCategory]:
        try:
            return ProductCategory.objects.select_related(
                'parent'
            ).get(id=category_id, is_active=True)
        except ProductCategory.DoesNotExist:
            return None

    @staticmethod
    def get_by_slug(slug: str) -> Optional[ProductCategory]:
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
        qs = ProductCategory.objects.filter(
            name=name,
            parent_id=parent_id
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    @staticmethod
    def get_all_with_products() -> QuerySet:
        return ProductCategory.objects.filter(
            is_active=True
        ).prefetch_related(
            Prefetch(
                'products',
                queryset=Product.objects.filter(
                    is_active=True
                ).select_related('unit', 'union')
            )
        ).order_by('order', 'name')

    @staticmethod
    def get_all() -> QuerySet:
        return ProductCategory.objects.select_related(
            'parent'
        ).all().order_by('order', 'name')


class ProductSelector(BaseSelector):

    @staticmethod
    def get_all_active() -> QuerySet:
        """تمام محصولات فعال"""
        return Product.objects.select_related(
            'union',
            'category',
            'unit',
        ).filter(
            is_active=True
        ).order_by('union__name', 'category__name', 'order', 'name')

    @staticmethod
    def get_by_id(product_id: int) -> Optional[Product]:
        """دریافت محصول با ID"""
        try:
            return Product.objects.select_related(
                'union',
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
                'union',
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
                'union',
                'category',
                'unit',
            ).get(barcode=barcode, is_active=True)
        except Product.DoesNotExist:
            return None

    @staticmethod
    def get_by_union(union_id: int) -> QuerySet:
        """
        محصولات یک اتحادیه مشخص.
        اصلی‌ترین selector برای رئیس اتحادیه.
        """
        return Product.objects.select_related(
            'union',
            'category',
            'unit',
        ).filter(
            union_id=union_id,
            is_active=True
        ).order_by('category__name', 'order', 'name')

    @staticmethod
    def get_by_category(
        category_id: int,
        include_children: bool = True
    ) -> QuerySet:
        """محصولات یک دسته‌بندی"""
        if include_children:
            category = ProductCategorySelector.get_by_id(category_id)
            if not category:
                return Product.objects.none()

            category_ids = [category_id]
            for child in category.get_descendants():
                category_ids.append(child.id)

            return Product.objects.select_related(
                'union',
                'category',
                'unit',
            ).filter(
                category_id__in=category_ids,
                is_active=True
            ).order_by('order', 'name')

        return Product.objects.select_related(
            'union',
            'category',
            'unit',
        ).filter(
            category_id=category_id,
            is_active=True
        ).order_by('order', 'name')

    @staticmethod
    def get_featured() -> QuerySet:
        """محصولات ویژه"""
        return Product.objects.select_related(
            'union',
            'category',
            'unit',
        ).filter(
            is_active=True,
            is_featured=True
        ).order_by('order', 'name')

    @staticmethod
    def search(query: str, union_id: int = None) -> QuerySet:
        """جستجو در محصولات"""
        qs = Product.objects.select_related(
            'union',
            'category',
            'unit',
        ).filter(is_active=True)

        if union_id:
            qs = qs.filter(union_id=union_id)

        return qs.filter(
            Q(name__icontains=query) |
            Q(brand__icontains=query) |
            Q(barcode__icontains=query) |
            Q(description__icontains=query) |
            Q(category__name__icontains=query) |
            Q(union__name__icontains=query)
        ).order_by('name')

    @staticmethod
    def exists_by_name_in_union(
        name: str,
        union_id: int,
        exclude_id: int = None
    ) -> bool:
        """بررسی تکراری نبودن نام در همان اتحادیه"""
        qs = Product.objects.filter(
            name=name,
            union_id=union_id
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    @staticmethod
    def exists_by_name(
        name: str,
        category_id: int,
        exclude_id: int = None
    ) -> bool:
        """
        بررسی تکراری نبودن نام در دسته‌بندی.
        برای سازگاری با کدهای قدیمی نگه داشته شده.
        """
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
            'union',
            'category',
            'unit',
        ).all().order_by('union__name', 'category__name', 'name')

    @staticmethod
    def get_for_pricing(union_id: int) -> QuerySet:
        """
        محصولات یک اتحادیه برای قیمت‌گذاری.
        فقط محصولات همان اتحادیه برگردانده می‌شود.
        """
        return Product.objects.select_related(
            'union',
            'category',
            'unit',
        ).filter(
            union_id=union_id,
            is_active=True
        ).order_by('category__name', 'name')


class ProductUnitSelector(BaseSelector):

    @staticmethod
    def get_all_active() -> QuerySet:
        return ProductUnit.objects.filter(
            is_active=True
        ).order_by('name')

    @staticmethod
    def get_by_id(unit_id: int) -> Optional[ProductUnit]:
        try:
            return ProductUnit.objects.get(id=unit_id, is_active=True)
        except ProductUnit.DoesNotExist:
            return None

    @staticmethod
    def get_by_symbol(symbol: str) -> Optional[ProductUnit]:
        try:
            return ProductUnit.objects.get(symbol=symbol)
        except ProductUnit.DoesNotExist:
            return None

    @staticmethod
    def get_all() -> QuerySet:
        return ProductUnit.objects.all().order_by('name')