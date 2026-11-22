from rest_framework import serializers


class ProgressPatchSerializer(serializers.Serializer):
    currentLevel = serializers.IntegerField(min_value=1, source="current_level")
    markCourseCompleted = serializers.BooleanField(
        required=False, default=False, source="mark_course_completed"
    )