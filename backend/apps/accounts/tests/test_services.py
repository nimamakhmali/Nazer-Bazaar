"""
تست Service های Accounts
"""
import pytest
from unittest.mock import patch
from apps.accounts.models import User, VerifyCode
from apps.accounts.services import AuthService, OTPService
from apps.common.choices import UserRole
from apps.common.exceptions import (
    OTPInvalidError,
    OTPExpiredError,
    AuthenticationError,
)


@pytest.mark.django_db
class TestOTPService:

    def setup_method(self):
        self.service = OTPService()

    @patch.object(OTPService, '_send_sms')
    def test_send_otp_success(self, mock_sms):
        """ارسال OTP موفق"""
        vc = self.service.send_otp(phone_number='09123456789')
        assert vc is not None
        assert vc.phone_number == '09123456789'
        mock_sms.assert_called_once()

    @patch.object(OTPService, '_send_sms')
    def test_verify_otp_success(self, mock_sms):
        """اعتبارسنجی OTP موفق"""
        vc = self.service.send_otp(phone_number='09123456789')
        result = self.service.verify_otp(
            phone_number='09123456789',
            code=vc.code
        )
        assert result is True

    @patch.object(OTPService, '_send_sms')
    def test_verify_otp_wrong_code(self, mock_sms):
        """کد اشتباه باید خطا دهد"""
        self.service.send_otp(phone_number='09123456789')
        with pytest.raises(OTPInvalidError):
            self.service.verify_otp(
                phone_number='09123456789',
                code='000000'
            )

    def test_verify_otp_no_code(self):
        """بدون کد OTP باید خطا دهد"""
        with pytest.raises(OTPExpiredError):
            self.service.verify_otp(
                phone_number='09999999999',
                code='123456'
            )


@pytest.mark.django_db
class TestAuthService:

    def setup_method(self):
        self.service = AuthService()

    @patch.object(OTPService, '_send_sms')
    def test_request_otp_new_user(self, mock_sms):
        """کاربر جدید باید به صورت خودکار ثبت‌نام شود"""
        result = self.service.request_otp(
            phone_number='09123456789'
        )
        assert result['is_new_user'] is True
        assert User.objects.filter(
            phone_number='09123456789'
        ).exists()

    @patch.object(OTPService, '_send_sms')
    def test_request_otp_existing_user(self, mock_sms):
        """کاربر موجود باید is_new_user=False دریافت کند"""
        User.objects.create_user(phone_number='09123456789')
        result = self.service.request_otp(
            phone_number='09123456789'
        )
        assert result['is_new_user'] is False

    def test_login_with_wrong_password(self):
        """رمز عبور اشتباه باید خطا دهد"""
        User.objects.create_user(
            phone_number='09123456789',
            password='correct_password'
        )
        with pytest.raises(AuthenticationError):
            self.service.login_with_password(
                phone_number='09123456789',
                password='wrong_password'
            )