import uuid

import pytest


@pytest.mark.django_db
def test_analytics_event_server_error(authed_client, monkeypatch):
    from analytics.models import AnalyticsEvent

    def fail_create(**_kwargs):
        raise RuntimeError("fail")

    monkeypatch.setattr(AnalyticsEvent.objects, "create", fail_create)

    response = authed_client.post(
        "/api/v1/analytics/events/",
        {"eventType": "LANDING_CTA_CLICK", "sessionId": str(uuid.uuid4())},
        format="json",
    )
    assert response.status_code == 500


@pytest.mark.django_db
def test_waitlist_invalid_payload(authed_client):
    response = authed_client.post("/api/v1/waitlist/", {"sessionId": "bad"}, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_waitlist_server_error(authed_client, monkeypatch):
    from analytics import views

    def boom(*_args, **_kwargs):
        raise RuntimeError("fail")

    monkeypatch.setattr(views, "join_waitlist", boom)
    response = authed_client.post(
        "/api/v1/waitlist/",
        {"sessionId": str(uuid.uuid4())},
        format="json",
    )
    assert response.status_code == 500