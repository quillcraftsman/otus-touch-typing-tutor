from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.models import AnalyticsEvent, AnalyticsEventType
from analytics.serializers import (
    AnalyticsEventSerializer,
    MetricsQuerySerializer,
    WaitlistSerializer,
)
from analytics.services import get_daily_metrics, get_funnel_metrics
from analytics.waitlist import join_waitlist
from core.permissions import IsAdminRole


class AnalyticsEventView(APIView):
    def post(self, request):
        serializer = AnalyticsEventSerializer(data=request.data)
        if not serializer.is_valid():
            first = next(iter(serializer.errors.values()))[0]
            return Response({"error": str(first)}, status=status.HTTP_400_BAD_REQUEST)

        event_type = serializer.validated_data["eventType"]
        session_id = serializer.validated_data["sessionId"]
        duration_ms = serializer.validated_data.get("durationMs")

        if (
            event_type == AnalyticsEventType.SUBSCRIPTION_PAGE_EXIT
            and duration_ms is None
        ):
            return Response(
                {"error": "durationMs is required for page exit events"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if event_type == AnalyticsEventType.TRAINER_IMPRESSION:
            exists = AnalyticsEvent.objects.filter(
                user=request.user,
                session_id=session_id,
                event_type=AnalyticsEventType.TRAINER_IMPRESSION,
            ).exists()
            if exists:
                return Response({"success": True, "duplicate": True})

        try:
            AnalyticsEvent.objects.create(
                user=request.user,
                session_id=session_id,
                event_type=event_type,
                duration_ms=duration_ms,
            )
        except Exception:
            return Response(
                {"error": "Failed to record analytics event"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"success": True})


class WaitlistView(APIView):
    def post(self, request):
        serializer = WaitlistSerializer(data=request.data)
        if not serializer.is_valid():
            first = next(iter(serializer.errors.values()))[0]
            return Response({"error": str(first)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = join_waitlist(request.user, serializer.validated_data["sessionId"])
        except Exception:
            return Response(
                {"error": "Failed to join waitlist"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "success": True,
                "waitlistJoinedAt": user.waitlist_joined_at,
            }
        )


class AdminMetricsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        raw_days = request.query_params.get("days")
        default_days = settings.ANALYTICS_METRICS_DEFAULT_DAYS
        payload = {"days": raw_days if raw_days is not None else default_days}
        serializer = MetricsQuerySerializer(data=payload)
        if not serializer.is_valid():
            first = next(iter(serializer.errors.values()))[0]
            return Response({"error": str(first)}, status=status.HTTP_400_BAD_REQUEST)

        days = serializer.validated_data.get("days") or default_days
        daily = get_daily_metrics(days)
        funnel = get_funnel_metrics(days)
        return Response({"daily": daily, "funnel": funnel})