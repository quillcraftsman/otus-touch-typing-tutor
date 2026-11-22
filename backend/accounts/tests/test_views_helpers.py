from accounts.views import _first_error


def test_first_error_fallback():
    class FakeErrors(dict):
        def values(self):
            return []

    class FakeSerializer:
        errors = FakeErrors()

    assert _first_error(FakeSerializer()) == "Некорректные данные"