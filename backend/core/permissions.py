from rest_framework.permissions import BasePermission

from accounts.models import Role


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.role == Role.ADMIN