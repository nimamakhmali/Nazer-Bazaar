import logging
from django.utils.text import slugify
from django.utils import timezone
from apps.common.base import BaseService
from apps.common.exceptions import ResourceNotFoundError, ResourceAlreadyExistsError
from apps.common.utils import normalize_persian_text
from apps.cms.models import Page, BlogCategory, Blog, Slider, Gallery, Advertisement
from apps.cms.selectors import CmsSelector

logger = logging.getLogger(__name__)

class CmsService(BaseService):

    # ─── Page Services ───────────────────────────────────────────────────────
    def create_page(self, *, title: str, content: str, is_published: bool = True, requesting_user) -> Page:
        title = normalize_persian_text(title)
        slug = self._generate_unique_slug(Page, title)
        
        with self.transaction():
            page = Page.objects.create(title=title, slug=slug, content=content, is_published=is_published)
            self.log_info(f"Page created: {page.title}", by=requesting_user.id)
            return page

    def update_page(self, *, page_id: int, title: str = None, content: str = None, is_published: bool = None, requesting_user) -> Page:
        page = CmsSelector.get_or_none(Page, id=page_id)
        if not page:
            raise ResourceNotFoundError("صفحه مورد نظر یافت نشد.")

        if title is not None:
            title = normalize_persian_text(title)
            page.title = title
            page.slug = self._generate_unique_slug(Page, title, exclude_id=page_id)
        if content is not None:
            page.content = content
        if is_published is not None:
            page.is_published = is_published

        with self.transaction():
            page.save()
            self.log_info(f"Page updated: {page.title}", by=requesting_user.id)
            return page

    # ─── Blog Services ───────────────────────────────────────────────────────
    def create_blog(self, *, title: str, category_id: int, summary: str, content: str, image, is_published: bool = False, requesting_user) -> Blog:
        category = CmsSelector.get_or_none(BlogCategory, id=category_id)
        if not category:
            raise ResourceNotFoundError("دسته‌بندی یافت نشد.")

        title = normalize_persian_text(title)
        slug = self._generate_unique_slug(Blog, title)
        published_at = timezone.now() if is_published else None

        with self.transaction():
            blog = Blog.objects.create(
                title=title, slug=slug, author=requesting_user, category=category,
                summary=summary, content=content, image=image,
                is_published=is_published, published_at=published_at
            )
            self.log_info(f"Blog created: {blog.title}", by=requesting_user.id)
            return blog

    def publish_blog(self, *, blog_id: int, requesting_user) -> Blog:
        blog = CmsSelector.get_or_none(Blog, id=blog_id)
        if not blog:
            raise ResourceNotFoundError("مطلب یافت نشد.")
        
        with self.transaction():
            blog.is_published = True
            blog.published_at = timezone.now()
            blog.save(update_fields=['is_published', 'published_at', 'updated_at'])
            return blog

    # ─── Helper ──────────────────────────────────────────────────────────────
    @staticmethod
    def _generate_unique_slug(model, name: str, exclude_id: int = None) -> str:
        base_slug = slugify(name, allow_unicode=True)
        slug = base_slug
        counter = 1
        while True:
            qs = model.objects.filter(slug=slug)
            if exclude_id:
                qs = qs.exclude(id=exclude_id)
            if not qs.exists():
                break
            slug = f'{base_slug}-{counter}'
            counter += 1
        return slug