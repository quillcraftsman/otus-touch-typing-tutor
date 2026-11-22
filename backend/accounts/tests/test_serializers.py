from accounts.serializers import RegisterSerializer


def test_password_validation_message():
    serializer = RegisterSerializer(data={"email": "a@b.com", "password": "123"})
    assert not serializer.is_valid()
    assert "Пароль" in str(serializer.errors["password"][0])