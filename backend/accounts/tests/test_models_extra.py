import pytest

from accounts.models import User


@pytest.mark.django_db
def test_create_superuser():
    user = User.objects.create_superuser(
        email="super@example.com",
        password="secret123",
    )
    assert user.role == "ADMIN"