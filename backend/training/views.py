from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from training.alphabet import get_max_level, load_alphabet
from training.levels import clamp_level
from training.serializers import ProgressPatchSerializer


class ProgressView(APIView):
    def get(self, request):
        user = request.user
        alphabet = load_alphabet()
        max_level = get_max_level(alphabet)
        current_level = clamp_level(user.current_level, max_level)

        return Response(
            {
                "currentLevel": current_level,
                "courseCompletedAt": user.course_completed_at,
                "maxLevel": max_level,
            }
        )

    def patch(self, request):
        user = request.user
        serializer = ProgressPatchSerializer(data=request.data)
        if not serializer.is_valid():
            first = next(iter(serializer.errors.values()))[0]
            return Response({"error": str(first)}, status=status.HTTP_400_BAD_REQUEST)

        alphabet = load_alphabet()
        max_level = get_max_level(alphabet)
        current_level = clamp_level(serializer.validated_data["current_level"], max_level)
        mark_completed = serializer.validated_data.get("mark_course_completed", False)

        user.current_level = current_level
        if (
            mark_completed
            and current_level == max_level
            and user.course_completed_at is None
        ):
            user.course_completed_at = timezone.now()

        user.save(update_fields=["current_level", "course_completed_at", "updated_at"])

        return Response(
            {
                "currentLevel": user.current_level,
                "courseCompletedAt": user.course_completed_at,
                "maxLevel": max_level,
            }
        )