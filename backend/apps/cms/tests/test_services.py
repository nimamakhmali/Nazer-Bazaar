import pytest
from apps.accounts.models import User
from apps.cms.services import CmsService
from apps.common.choices import UserRole

@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(phone_number='09120000000', password='admin123')

@pytest.mark.django_db
class TestCmsService:
    def setup_method(self):
        self.service = CmsService()

    def test_create_page_success(self, admin_user):
        page = self.service.create_page(
            title="قوانین سایت", 
            content="محتوای قوانین...", 
            requesting_user=admin_user
        )
        assert page.slug == "قوانین-سایت"
        assert page.is_published is True