from datetime import timedelta

import pytest
from django.utils import timezone

from analytics.models import AnalyticsEvent, AnalyticsEventType
from analytics.services import (
    aggregate_daily_metrics,
    calculate_rate,
    get_daily_metrics,
    get_funnel_metrics,
    AnalyticsEventRecord,
)


def test_calculate_rate_zero_denominator():
    assert calculate_rate(1, 0) == 0


@pytest.mark.django_db
def test_get_daily_and_funnel(user):
    now = timezone.now()
    AnalyticsEvent.objects.create(
        user=user,
        session_id="11111111-1111-1111-1111-111111111111",
        event_type=AnalyticsEventType.TRAINER_IMPRESSION,
    )
    AnalyticsEvent.objects.create(
        user=user,
        session_id="11111111-1111-1111-1111-111111111111",
        event_type=AnalyticsEventType.SUBSCRIPTION_CLICK,
    )
    AnalyticsEvent.objects.create(
        user=user,
        session_id="11111111-1111-1111-1111-111111111111",
        event_type=AnalyticsEventType.SUBSCRIPTION_PAGE_EXIT,
        duration_ms=1000,
    )

    daily = get_daily_metrics(1)
    assert daily[0]["impressions"] >= 1
    funnel = get_funnel_metrics(30)
    assert funnel["trainerImpressions"] >= 1


def test_aggregate_daily_metrics_empty():
    points = aggregate_daily_metrics([], 2)
    assert len(points) == 2
    assert points[0]["ctr"] == 0


def test_aggregate_with_bounce():
    now = timezone.now()
    events = [
        AnalyticsEventRecord(
            session_id="s1",
            event_type=AnalyticsEventType.TRAINER_IMPRESSION,
            duration_ms=None,
            created_at=now,
        ),
        AnalyticsEventRecord(
            session_id="s1",
            event_type=AnalyticsEventType.SUBSCRIPTION_CLICK,
            duration_ms=None,
            created_at=now,
        ),
        AnalyticsEventRecord(
            session_id="s1",
            event_type=AnalyticsEventType.SUBSCRIPTION_PAGE_EXIT,
            duration_ms=500,
            created_at=now + timedelta(seconds=1),
        ),
    ]
    result = aggregate_daily_metrics(events, 1)
    assert result[0]["bounces"] == 1