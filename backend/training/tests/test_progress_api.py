from pathlib import Path

import pytest
from django.test import override_settings
from django.utils import timezone

ALPHABET = str(Path(__file__).resolve().parents[3] / "alphabet" / "main.txt")


@pytest.mark.django_db
@override_settings(ALPHABET_PATH=ALPHABET)
def test_progress_get(authed_client):
    response = authed_client.get("/api/v1/progress/")
    assert response.status_code == 200
    data = response.json()
    assert data["currentLevel"] == 1
    assert data["levelErrorCount"] == 0
    assert "maxLevel" in data


@pytest.mark.django_db
@override_settings(ALPHABET_PATH=ALPHABET)
def test_progress_patch(authed_client, user):
    response = authed_client.patch(
        "/api/v1/progress/",
        {"currentLevel": 2},
        format="json",
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.current_level == 2


@pytest.mark.django_db
@override_settings(ALPHABET_PATH=ALPHABET)
def test_progress_mark_course_completed(authed_client, user):
    max_level = len(Path(ALPHABET).read_text(encoding="utf-8").strip())
    response = authed_client.patch(
        "/api/v1/progress/",
        {"currentLevel": max_level, "markCourseCompleted": True},
        format="json",
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.course_completed_at is not None


@pytest.mark.django_db
@override_settings(ALPHABET_PATH=ALPHABET)
def test_progress_invalid_payload(authed_client):
    response = authed_client.patch(
        "/api/v1/progress/",
        {"currentLevel": 0},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
@override_settings(ALPHABET_PATH=ALPHABET)
def test_progress_no_duplicate_completion(authed_client, user):
    user.course_completed_at = timezone.now()
    user.save()
    max_level = len(Path(ALPHABET).read_text(encoding="utf-8").strip())
    authed_client.patch(
        "/api/v1/progress/",
        {"currentLevel": max_level, "markCourseCompleted": True},
        format="json",
    )
    user.refresh_from_db()
    assert user.course_completed_at is not None


@pytest.mark.django_db
@override_settings(ALPHABET_PATH=ALPHABET)
def test_progress_records_level_errors(authed_client, user):
    first = authed_client.patch(
        "/api/v1/progress/",
        {"recordError": True},
        format="json",
    )
    second = authed_client.patch(
        "/api/v1/progress/",
        {"recordError": True},
        format="json",
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["levelErrorCount"] == 2
    user.refresh_from_db()
    assert user.level_error_count == 2
    assert user.current_level == 1


@pytest.mark.django_db
@override_settings(ALPHABET_PATH=ALPHABET)
def test_progress_level_change_resets_error_count(authed_client, user):
    user.level_error_count = 4
    user.save(update_fields=["level_error_count"])

    response = authed_client.patch(
        "/api/v1/progress/",
        {"currentLevel": 2},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["levelErrorCount"] == 0
    user.refresh_from_db()
    assert user.level_error_count == 0


@pytest.mark.django_db
@override_settings(ALPHABET_PATH=ALPHABET)
def test_progress_same_level_keeps_error_count(authed_client, user):
    user.level_error_count = 3
    user.save(update_fields=["level_error_count"])

    response = authed_client.patch(
        "/api/v1/progress/",
        {"currentLevel": 1},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["levelErrorCount"] == 3
    user.refresh_from_db()
    assert user.level_error_count == 3


@pytest.mark.django_db
@override_settings(ALPHABET_PATH=ALPHABET)
def test_progress_rejects_empty_payload(authed_client):
    response = authed_client.patch(
        "/api/v1/progress/",
        {},
        format="json",
    )
    assert response.status_code == 400