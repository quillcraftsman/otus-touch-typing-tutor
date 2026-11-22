from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable

from django.conf import settings
from django.db.models import Count
from django.utils import timezone

from accounts.models import User
from analytics.models import AnalyticsEvent, AnalyticsEventType


@dataclass
class AnalyticsEventRecord:
    session_id: str
    event_type: str
    duration_ms: int | None
    created_at: datetime


def start_of_day(value: datetime) -> datetime:
    if timezone.is_aware(value):
        local = timezone.localtime(value)
        return timezone.make_aware(
            datetime(local.year, local.month, local.day),
            timezone.get_current_timezone(),
        )
    return datetime(value.year, value.month, value.day)


def format_date_key(value: datetime) -> str:
    return start_of_day(value).date().isoformat()


def build_date_range(days: int) -> list[datetime]:
    today = start_of_day(timezone.now())
    dates: list[datetime] = []
    for offset in range(days - 1, -1, -1):
        dates.append(today - timedelta(days=offset))
    return dates


def calculate_rate(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0
    return round((numerator / denominator) * 100, 2)


def aggregate_daily_metrics(
    events: Iterable[AnalyticsEventRecord],
    days: int,
) -> list[dict]:
    date_range = build_date_range(days)
    events_by_day: dict[str, list[AnalyticsEventRecord]] = defaultdict(list)

    for event in events:
        key = format_date_key(event.created_at)
        events_by_day[key].append(event)

    bounce_threshold = settings.ANALYTICS_BOUNCE_THRESHOLD_MS
    result: list[dict] = []

    for date in date_range:
        key = format_date_key(date)
        day_events = events_by_day.get(key, [])

        impressions = sum(
            1
            for e in day_events
            if e.event_type == AnalyticsEventType.TRAINER_IMPRESSION
        )
        clicks = sum(
            1
            for e in day_events
            if e.event_type == AnalyticsEventType.SUBSCRIPTION_CLICK
        )

        clicked_session_ids = {
            e.session_id
            for e in day_events
            if e.event_type == AnalyticsEventType.SUBSCRIPTION_CLICK
        }

        bounces = sum(
            1
            for e in day_events
            if e.event_type == AnalyticsEventType.SUBSCRIPTION_PAGE_EXIT
            and e.session_id in clicked_session_ids
            and (e.duration_ms if e.duration_ms is not None else 2**63 - 1)
            < bounce_threshold
        )

        result.append(
            {
                "date": key,
                "impressions": impressions,
                "clicks": clicks,
                "ctr": calculate_rate(clicks, impressions),
                "bounces": bounces,
                "bounceRate": calculate_rate(bounces, clicks),
            }
        )

    return result


def get_daily_metrics(days: int | None = None) -> list[dict]:
    if days is None:
        days = settings.ANALYTICS_METRICS_DEFAULT_DAYS

    from_date = start_of_day(timezone.now())
    from_date = from_date - timedelta(days=days - 1)

    qs = AnalyticsEvent.objects.filter(created_at__gte=from_date).order_by("created_at")
    events = [
        AnalyticsEventRecord(
            session_id=str(row.session_id),
            event_type=row.event_type,
            duration_ms=row.duration_ms,
            created_at=row.created_at,
        )
        for row in qs
    ]
    return aggregate_daily_metrics(events, days)


def get_funnel_metrics(days: int | None = None) -> dict:
    if days is None:
        days = settings.ANALYTICS_METRICS_DEFAULT_DAYS

    from_date = start_of_day(timezone.now())
    from_date = from_date - timedelta(days=days - 1)

    grouped = (
        AnalyticsEvent.objects.filter(created_at__gte=from_date)
        .values("event_type")
        .annotate(count=Count("id"))
    )
    counts = {row["event_type"]: row["count"] for row in grouped}

    registrations = User.objects.filter(created_at__gte=from_date).count()

    landing_cta = counts.get(AnalyticsEventType.LANDING_CTA_CLICK, 0)
    trainer_impressions = counts.get(AnalyticsEventType.TRAINER_IMPRESSION, 0)
    subscription_clicks = counts.get(AnalyticsEventType.SUBSCRIPTION_CLICK, 0)
    waitlist_joins = counts.get(AnalyticsEventType.WAITLIST_JOIN, 0)

    return {
        "landingCtaClicks": landing_cta,
        "registrations": registrations,
        "trainerImpressions": trainer_impressions,
        "subscriptionClicks": subscription_clicks,
        "waitlistJoins": waitlist_joins,
        "landingToRegisterRate": calculate_rate(registrations, landing_cta),
        "registerToTrainerRate": calculate_rate(trainer_impressions, registrations),
        "trainerToClickRate": calculate_rate(subscription_clicks, trainer_impressions),
    }