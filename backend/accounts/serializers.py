from rest_framework import serializers

from accounts.models import User
from accounts.roles import resolve_role_for_email


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(error_messages={"invalid": "Некорректный email"})
    password = serializers.CharField(
        min_length=6,
        error_messages={"min_length": "Пароль должен быть не короче 6 символов"},
    )

    def create(self, validated_data):
        email = validated_data["email"]
        user = User.objects.create_user(
            email=email,
            password=validated_data["password"],
            role=resolve_role_for_email(email),
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()