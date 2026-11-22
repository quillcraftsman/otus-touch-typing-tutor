import pytest
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory

from accounts.models import User
from core.authentication import InternalServiceAuthentication


@pytest.mark.django_db
def test_returns_none_without_bearer():
    request = APIRequestFactory().get("/api/v1/progress/")
    assert InternalServiceAuthentication().authenticate(request) is None


@pytest.mark.django_db
def test_rejects_invalid_secret():
    user = User.objects.create_user(email="a@example.com", password="x")
    request = APIRequestFactory().get(
        "/api/v1/progress/",
        HTTP_AUTHORIZATION="Bearer wrong",
        HTTP_X_USER_ID=str(user.id),
    )
    with pytest.raises(AuthenticationFailed):
        InternalServiceAuthentication().authenticate(request)


@pytest.mark.django_db
def test_rejects_missing_user_id():
    request = APIRequestFactory().get(
        "/api/v1/progress/",
        HTTP_AUTHORIZATION=f"Bearer {settings.INTERNAL_API_SECRET}",
    )
    with pytest.raises(AuthenticationFailed):
        InternalServiceAuthentication().authenticate(request)


@pytest.mark.django_db
def test_rejects_unknown_user():
    request = APIRequestFactory().get(
        "/api/v1/progress/",
        HTTP_AUTHORIZATION=f"Bearer {settings.INTERNAL_API_SECRET}",
        HTTP_X_USER_ID="00000000-0000-0000-0000-000000000001",
    )
    with pytest.raises(AuthenticationFailed):
        InternalServiceAuthentication().authenticate(request)


@pytest.mark.django_db
def test_authenticates_valid_request(user):
    request = APIRequestFactory().get(
        "/api/v1/progress/",
        HTTP_AUTHORIZATION=f"Bearer {settings.INTERNAL_API_SECRET}",
        HTTP_X_USER_ID=str(user.id),
    )
    auth_user, _ = InternalServiceAuthentication().authenticate(request)
    assert auth_user == user