"""
Accounts API URLs
"""
from django.urls import path
from apps.accounts.views import (
    RequestOTPView,
    VerifyOTPView,
    PasswordLoginView,
    LogoutView,
    RefreshTokenView,
    MeView,
    UserProfileView,
    AdminUserListView,
    AdminUserDetailView,
    ChangeUserRoleView,
)

app_name = 'accounts_api'

urlpatterns = [
    # ─── Authentication ──────────────────────────────────────────────────────
    path(
        'otp/request/',
        RequestOTPView.as_view(),
        name='otp-request'
    ),
    path(
        'otp/verify/',
        VerifyOTPView.as_view(),
        name='otp-verify'
    ),
    path(
        'login/',
        PasswordLoginView.as_view(),
        name='password-login'
    ),
    path(
        'logout/',
        LogoutView.as_view(),
        name='logout'
    ),
    path(
        'token/refresh/',
        RefreshTokenView.as_view(),
        name='token-refresh'
    ),
    path(
        'me/',
        MeView.as_view(),
        name='me'
    ),

    # ─── Users ───────────────────────────────────────────────────────────────
    path(
        'users/profile/',
        UserProfileView.as_view(),
        name='user-profile'
    ),
    path(
        'users/',
        AdminUserListView.as_view(),
        name='user-list-create'
    ),
    path(
        'users/<int:user_id>/',
        AdminUserDetailView.as_view(),
        name='user-detail'
    ),
    path(
        'users/<int:user_id>/role/',
        ChangeUserRoleView.as_view(),
        name='user-change-role'
    ),
]