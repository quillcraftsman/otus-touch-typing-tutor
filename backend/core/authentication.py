from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from accounts.models import User
from django.conf import settings


class InternalServiceAuthentication(BaseAuthentication):
    """Trust Next.js BFF via shared secret and user id header."""

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header[7:].strip()
        if token != settings.INTERNAL_API_SECRET:
            raise AuthenticationFailed("Invalid internal credentials")

        user_id = request.META.get("HTTP_X_USER_ID", "").strip()
        if not user_id:
            raise AuthenticationFailed("Missing user id")

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist as exc:
            raise AuthenticationFailed("User not found") from exc

        return (user, None)