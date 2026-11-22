from django.db import transaction
from django.utils import timezone

from analytics.models import AnalyticsEvent, AnalyticsEventType


def join_waitlist(user, session_id: str):
    if user.waitlist_joined_at:
        return user

    with transaction.atomic():
        user.waitlist_joined_at = timezone.now()
        user.save(update_fields=["waitlist_joined_at", "updated_at"])
        AnalyticsEvent.objects.create(
            user=user,
            session_id=session_id,
            event_type=AnalyticsEventType.WAITLIST_JOIN,
        )

    return user