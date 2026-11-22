from django.db.models import F
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from training.alphabet import get_max_level, load_alphabet
from training.levels import clamp_level
from training.serializers import ProgressPatchSerializer


def progress_payload(user, max_level):
    return {
        "currentLevel": clamp_level(user.current_level, max_level),
        "courseCompletedAt": user.course_completed_at,
        "maxLevel": max_level,
        "levelErrorCount": user.level_error_count,
    }


class ProgressView(APIView):
    def get(self, request):
        user = request.user
        alphabet = load_alphabet()
        max_level = get_max_level(alphabet)
        return Response(progress_payload(user, max_level))

    def patch(self, request):
        user = request.user
        serializer = ProgressPatchSerializer(data=request.data)
        if not serializer.is_valid():
            first = next(iter(serializer.errors.values()))[0]
            return Response({"error": str(first)}, status=status.HTTP_400_BAD_REQUEST)

        alphabet = load_alphabet()
        max_level = get_max_level(alphabet)

        if serializer.validated_data.get("record_error"):
            type(user).objects.filter(pk=user.pk).update(
                level_error_count=F("level_error_count") + 1
            )
            user.refresh_from_db()
            return Response(progress_payload(user, max_level))

        current_level = clamp_level(
            serializer.validated_data["current_level"], max_level
        )
        mark_completed = serializer.validated_data.get("mark_course_completed", False)
        level_changed = user.current_level != current_level

        user.current_level = current_level
        if (
            mark_completed
            and current_level == max_level
            and user.course_completed_at is None
        ):
            user.course_completed_at = timezone.now()

        update_fields = ["current_level", "course_completed_at", "updated_at"]
        if level_changed:
            user.level_error_count = 0
            update_fields.append("level_error_count")

        user.save(update_fields=update_fields)

        return Response(progress_payload(user, max_level))