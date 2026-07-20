"""
تست مدل‌های Accounts
"""
import pytest
from django.utils import timezone
from apps.accounts.models import User, VerifyCode
from apps.common.choices import UserRole


@pytest.mark.django_db
class TestUserModel:

    def test_create_user_success(self):
        user = User.objects.create_user(
            phone_number='09123456789',
            role=UserRole.CUSTOMER
        )
        assert user.id is not None
        assert user.phone_number == '09123456789'
        assert user.role == UserRole.CUSTOMER
        assert user.is_active is True
        assert user.is_phone_verified is False

    def test_user_str(self):
        user = User.objects.create_user(
            phone_number='09123456789',
            first_name='علی',
            last_name='احمدی'
        )
        assert 'علی احمدی' in str(user)
        assert '09123456789' in str(user)

    def test_user_role_properties(self):
        admin = User.objects.create_user(
            phone_number='09000000001',
            role=UserRole.ADMIN
        )
        customer = User.objects.create_user(
            phone_number='09000000002',
            role=UserRole.CUSTOMER
        )
        assert admin.is_admin is True
        assert admin.is_customer is False
        assert customer.is_customer is True
        assert customer.is_admin is False

    def test_user_verify_phone(self):
        user = User.objects.create_user(
            phone_number='09123456789'
        )
        assert user.is_phone_verified is False
        user.verify_phone()
        assert user.is_phone_verified is True

    def test_create_superuser(self):
        user = User.objects.create_superuser(
            phone_number='09123456789',
            password='testpassword123'
        )
        assert user.is_staff is True
        assert user.is_superuser is True
        assert user.role == UserRole.ADMIN


@pytest.mark.django_db
class TestVerifyCodeModel:

    def test_create_verify_code(self):
        vc = VerifyCode.create_for_phone('09123456789')
        assert vc.code is not None
        assert len(vc.code) == 6
        assert vc.is_used is False
        assert vc.is_expired is False
        assert vc.is_valid is True

    def test_verify_code_expires(self):
        vc = VerifyCode.objects.create(
            phone_number='09123456789',
            code='123456',
            expires_at=timezone.now() - timezone.timedelta(seconds=1)
        )
        assert vc.is_expired is True
        assert vc.is_valid is False

    def test_previous_codes_invalidated(self):
        """کد جدید، کدهای قبلی را غیرفعال می‌کند"""
        vc1 = VerifyCode.create_for_phone('09123456789')
        vc2 = VerifyCode.create_for_phone('09123456789')

        vc1.refresh_from_db()
        assert vc1.is_used is True
        assert vc2.is_used is False