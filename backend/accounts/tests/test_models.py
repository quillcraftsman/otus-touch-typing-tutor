import pytest

from accounts.models import User, UserManager


@pytest.mark.django_db
def test_user_str():
    user = User.objects.create_user(email="x@example.com", password="pass")
    assert str(user) == "x@example.com"


def test_create_user_requires_email():
    manager = UserManager()
    manager.model = User
    with pytest.raises(ValueError, match="Email is required"):
        manager.create_user(email="", password="x")