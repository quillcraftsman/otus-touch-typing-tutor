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