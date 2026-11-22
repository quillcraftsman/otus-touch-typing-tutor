from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.roles import sync_user_role


class CurrentUserView(APIView):
    def get(self, request):
        user = request.user
        role = sync_user_role(user)
        return Response(
            {
                "id": str(user.id),
                "email": user.email,
                "role": role,
                "waitlistJoinedAt": user.waitlist_joined_at,
                "currentLevel": user.current_level,
                "courseCompletedAt": user.course_completed_at,
            }
        )