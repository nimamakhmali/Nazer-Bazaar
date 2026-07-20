import pytest
from apps.cms.models import Page, BlogCategory

@pytest.mark.django_db
class TestCmsModels:
    def test_create_page(self):
        page = Page.objects.create(title="درباره ما", slug="about-us", content="محتوای تست")
        assert page.id is not None
        assert page.is_published is True
        assert str(page) == "درباره ما"

    def test_create_blog_category(self):
        category = BlogCategory.objects.create(name="اخبار", slug="news")
        assert category.is_active is True