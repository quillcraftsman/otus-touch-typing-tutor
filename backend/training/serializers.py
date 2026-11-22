from rest_framework import serializers


class ProgressPatchSerializer(serializers.Serializer):
    currentLevel = serializers.IntegerField(
        min_value=1, required=False, source="current_level"
    )
    markCourseCompleted = serializers.BooleanField(
        required=False, default=False, source="mark_course_completed"
    )
    recordError = serializers.BooleanField(
        required=False, default=False, source="record_error"
    )

    def validate(self, attrs):
        record_error = attrs.get("record_error", False)
        has_level = "current_level" in attrs
        if record_error == has_level:
            raise serializers.ValidationError(
                "Укажите currentLevel или recordError"
            )
        return attrs
