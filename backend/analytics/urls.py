from django.urls import path

from analytics.views import AdminMetricsView, AnalyticsEventView, WaitlistView

urlpatterns = [
    path("analytics/events/", AnalyticsEventView.as_view(), name="analytics-events"),
    path("waitlist/", WaitlistView.as_view(), name="waitlist"),
    path("admin/metrics/", AdminMetricsView.as_view(), name="admin-metrics"),
]