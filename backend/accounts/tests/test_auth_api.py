import pytest
from django.test import override_settings


@pytest.mark.django_db
def test_register_success(api_client):
    response = api_client.post(
        "/api/v1/auth/register/",
        {"email": "new@example.com", "password": "secret123"},
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["success"] is True


@pytest.mark.django_db
@override_settings(ADMIN_EMAIL="admin@example.com")
def test_register_admin_role(api_client):
    response = api_client.post(
        "/api/v1/auth/register/",
        {"email": "admin@example.com", "password": "secret123"},
        format="json",
    )
    assert response.status_code == 201


@pytest.mark.django_db
def test_register_validation_error(api_client):
    response = api_client.post(
        "/api/v1/auth/register/",
        {"email": "bad", "password": "123"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_register_conflict(user, api_client):
    response = api_client.post(
        "/api/v1/auth/register/",
        {"email": user.email, "password": "secret123"},
        format="json",
    )
    assert response.status_code == 409


@pytest.mark.django_db
def test_register_server_error(api_client, monkeypatch):
    from accounts import serializers

    def boom(*_args, **_kwargs):
        raise RuntimeError("fail")

    monkeypatch.setattr(serializers.RegisterSerializer, "save", boom)
    response = api_client.post(
        "/api/v1/auth/register/",
        {"email": "ok@example.com", "password": "secret123"},
        format="json",
    )
    assert response.status_code == 500


@pytest.mark.django_db
def test_login_success(user, api_client):
    response = api_client.post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": "secret123"},
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user.email
    assert "id" in data


@pytest.mark.django_db
def test_login_invalid_payload(api_client):
    response = api_client.post(
        "/api/v1/auth/login/",
        {"email": "nope", "password": ""},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_login_wrong_password(user, api_client):
    response = api_client.post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": "wrong"},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_current_user(authed_client, user):
    response = authed_client.get("/api/v1/auth/me/")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user.email
    assert data["role"] == "USER"