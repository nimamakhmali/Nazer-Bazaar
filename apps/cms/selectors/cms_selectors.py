from typing import Optional
from django.db.models import QuerySet
from django.utils import timezone
from apps.common.base import BaseSelector
from apps.cms.models import Page, BlogCategory, Blog, Slider, Gallery, Advertisement

class CmsSelector(BaseSelector):

    # ─── Pages ───────────────────────────────────────────────────────────────
    @staticmethod
    def get_published_pages() -> QuerySet:
        return Page.objects.filter(is_published=True)

    @staticmethod
    def get_page_by_slug(slug: str) -> Optional[Page]:
        return CmsSelector.get_or_none(Page, slug=slug, is_published=True)

    # ─── Blog ────────────────────────────────────────────────────────────────
    @staticmethod
    def get_active_blog_categories() -> QuerySet:
        return BlogCategory.objects.filter(is_active=True)

    @staticmethod
    def get_published_blogs() -> QuerySet:
        return Blog.objects.select_related('author', 'category').filter(
            is_published=True,
            published_at__lte=timezone.now()
        )

    @staticmethod
    def get_blog_by_slug(slug: str) -> Optional[Blog]:
        return CmsSelector.get_or_none(
            Blog.objects.select_related('author', 'category'), 
            slug=slug, 
            is_published=True
        )

    # ─── Slider & Gallery ────────────────────────────────────────────────────
    @staticmethod
    def get_active_sliders() -> QuerySet:
        return Slider.objects.filter(is_active=True)

    @staticmethod
    def get_active_gallery_images() -> QuerySet:
        return Gallery.objects.filter(is_active=True)

    # ─── Advertisements ──────────────────────────────────────────────────────
    @staticmethod
    def get_active_ads(position: str = None) -> QuerySet:
        now = timezone.now()
        qs = Advertisement.objects.filter(is_active=True).filter(
            models.Q(start_date__isnull=True) | models.Q(start_date__lte=now)
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=now)
        )
        if position:
            qs = qs.filter(position=position)
        return qs