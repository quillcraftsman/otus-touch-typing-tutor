from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.roles import sync_user_role
from accounts.serializers import LoginSerializer, RegisterSerializer


def _first_error(serializer) -> str:
    for field_errors in serializer.errors.values():
        if field_errors:
            return str(field_errors[0])
    return "Некорректные данные"


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": _first_error(serializer)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = serializer.validated_data["email"]
        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "Пользователь с таким email уже существует"},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            serializer.save()
        except Exception:
            return Response(
                {"error": "Не удалось зарегистрироваться"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"success": True}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        role = sync_user_role(user)
        return Response(
            {
                "id": str(user.id),
                "email": user.email,
                "role": role,
            }
        )