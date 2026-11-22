from rest_framework import serializers

from analytics.models import AnalyticsEventType


class AnalyticsEventSerializer(serializers.Serializer):
    eventType = serializers.ChoiceField(choices=AnalyticsEventType.choices)
    sessionId = serializers.UUIDField()
    durationMs = serializers.IntegerField(min_value=0, required=False)


class WaitlistSerializer(serializers.Serializer):
    sessionId = serializers.UUIDField()


class MetricsQuerySerializer(serializers.Serializer):
    days = serializers.IntegerField(min_value=1, max_value=90, required=False)