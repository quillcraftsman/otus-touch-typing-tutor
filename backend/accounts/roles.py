from django.conf import settings

from accounts.models import Role, User


def resolve_role_for_email(email: str) -> str:
    normalized = email.strip().lower()
    admin_email = settings.ADMIN_EMAIL
    if admin_email and normalized == admin_email:
        return Role.ADMIN
    return Role.USER


def sync_user_role(user: User) -> Role:
    expected = resolve_role_for_email(user.email)
    if user.role != expected:
        user.role = expected
        user.save(update_fields=["role", "updated_at"])
    return Role(user.role)