import uuid

import pytest
from django.test import override_settings

from accounts.models import Role


@pytest.mark.django_db
def test_record_event(authed_client):
    response = authed_client.post(
        "/api/v1/analytics/events/",
        {
            "eventType": "TRAINER_IMPRESSION",
            "sessionId": str(uuid.uuid4()),
        },
        format="json",
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_duplicate_impression(authed_client):
    session_id = str(uuid.uuid4())
    payload = {"eventType": "TRAINER_IMPRESSION", "sessionId": session_id}
    authed_client.post("/api/v1/analytics/events/", payload, format="json")
    response = authed_client.post("/api/v1/analytics/events/", payload, format="json")
    assert response.json().get("duplicate") is True


@pytest.mark.django_db
def test_exit_requires_duration(authed_client):
    response = authed_client.post(
        "/api/v1/analytics/events/",
        {"eventType": "SUBSCRIPTION_PAGE_EXIT", "sessionId": str(uuid.uuid4())},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_invalid_event_payload(authed_client):
    response = authed_client.post(
        "/api/v1/analytics/events/",
        {"eventType": "BAD", "sessionId": "x"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_waitlist_join(authed_client, user):
    response = authed_client.post(
        "/api/v1/waitlist/",
        {"sessionId": str(uuid.uuid4())},
        format="json",
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.waitlist_joined_at is not None


@pytest.mark.django_db
def test_waitlist_idempotent(authed_client, user):
    session_id = str(uuid.uuid4())
    authed_client.post("/api/v1/waitlist/", {"sessionId": session_id}, format="json")
    user.refresh_from_db()
    first = user.waitlist_joined_at
    authed_client.post("/api/v1/waitlist/", {"sessionId": session_id}, format="json")
    user.refresh_from_db()
    assert user.waitlist_joined_at == first


@pytest.mark.django_db
def test_admin_metrics_forbidden(authed_client):
    response = authed_client.get("/api/v1/admin/metrics/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_metrics_success(admin_user, api_client):
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {__import__('django.conf').conf.settings.INTERNAL_API_SECRET}",
        HTTP_X_USER_ID=str(admin_user.id),
    )
    admin_user.role = Role.ADMIN
    admin_user.save()
    response = api_client.get("/api/v1/admin/metrics/?days=7")
    assert response.status_code == 200
    assert "daily" in response.json()


@pytest.mark.django_db
def test_admin_metrics_invalid_days(admin_user, api_client):
    from django.conf import settings

    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {settings.INTERNAL_API_SECRET}",
        HTTP_X_USER_ID=str(admin_user.id),
    )
    admin_user.role = Role.ADMIN
    admin_user.save()
    response = api_client.get("/api/v1/admin/metrics/?days=0")
    assert response.status_code == 400