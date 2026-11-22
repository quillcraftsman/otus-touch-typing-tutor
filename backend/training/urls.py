from django.urls import path

from training.views import ProgressView

urlpatterns = [
    path("progress/", ProgressView.as_view(), name="progress"),
]