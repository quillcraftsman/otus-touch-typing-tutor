import pytest
from django.test import override_settings

from accounts.models import Role, User
from accounts.roles import resolve_role_for_email, sync_user_role


@override_settings(ADMIN_EMAIL="admin@example.com")
def test_resolve_admin():
    assert resolve_role_for_email("Admin@Example.com") == Role.ADMIN


@override_settings(ADMIN_EMAIL="admin@example.com")
def test_resolve_user():
    assert resolve_role_for_email("user@example.com") == Role.USER


@pytest.mark.django_db
@override_settings(ADMIN_EMAIL="admin@example.com")
def test_sync_user_role_updates_stale_role():
    user = User.objects.create_user(email="admin@example.com", password="x", role=Role.USER)
    assert sync_user_role(user) == Role.ADMIN
    user.refresh_from_db()
    assert user.role == Role.ADMIN


@pytest.mark.django_db
@override_settings(ADMIN_EMAIL="admin@example.com")
def test_sync_user_role_keeps_matching_role(user):
    assert sync_user_role(user) == Role.USER