import pytest
from rest_framework.test import APIRequestFactory

from accounts.models import Role
from core.permissions import IsAdminRole


@pytest.mark.django_db
def test_denies_anonymous():
    request = APIRequestFactory().get("/")
    request.user = None
    assert IsAdminRole().has_permission(request, None) is False


@pytest.mark.django_db
def test_denies_regular_user(user):
    request = APIRequestFactory().get("/")
    request.user = user
    assert IsAdminRole().has_permission(request, None) is False


@pytest.mark.django_db
def test_allows_admin(admin_user):
    request = APIRequestFactory().get("/")
    admin_user.role = Role.ADMIN
    request.user = admin_user
    assert IsAdminRole().has_permission(request, None) is True