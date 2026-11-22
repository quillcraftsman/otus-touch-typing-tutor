import uuid

from django.conf import settings
from django.db import models


class AnalyticsEventType(models.TextChoices):
    TRAINER_IMPRESSION = "TRAINER_IMPRESSION", "Trainer impression"
    SUBSCRIPTION_CLICK = "SUBSCRIPTION_CLICK", "Subscription click"
    SUBSCRIPTION_PAGE_VIEW = "SUBSCRIPTION_PAGE_VIEW", "Subscription page view"
    SUBSCRIPTION_PAGE_EXIT = "SUBSCRIPTION_PAGE_EXIT", "Subscription page exit"
    LANDING_CTA_CLICK = "LANDING_CTA_CLICK", "Landing CTA click"
    WAITLIST_JOIN = "WAITLIST_JOIN", "Waitlist join"


class AnalyticsEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="analytics_events",
    )
    session_id = models.UUIDField()
    event_type = models.CharField(max_length=40, choices=AnalyticsEventType.choices)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["session_id"]),
        ]