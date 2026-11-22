import pytest
from django.conf import settings
from rest_framework.test import APIClient

from accounts.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(email="user@example.com", password="secret123")


@pytest.fixture
def admin_user(db, settings):
    settings.ADMIN_EMAIL = "admin@example.com"
    return User.objects.create_user(
        email="admin@example.com",
        password="secret123",
        role="ADMIN",
    )


@pytest.fixture
def authed_client(api_client, user):
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {settings.INTERNAL_API_SECRET}",
        HTTP_X_USER_ID=str(user.id),
    )
    return api_client