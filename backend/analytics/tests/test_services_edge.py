from datetime import datetime

import pytest
from django.utils import timezone

from analytics.services import get_daily_metrics, get_funnel_metrics, start_of_day


def test_start_of_day_naive():
    value = datetime(2026, 1, 15, 13, 30)
    result = start_of_day(value)
    assert result.hour == 0


def test_start_of_day_aware():
    value = timezone.now()
    result = start_of_day(value)
    assert timezone.is_aware(result)


@pytest.mark.django_db
def test_metrics_default_days(user):
    assert get_daily_metrics(None)
    assert get_funnel_metrics(None)