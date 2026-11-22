from pathlib import Path

from django.conf import settings


def load_alphabet() -> str:
    path = Path(settings.ALPHABET_PATH)
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        raise ValueError("Alphabet file is empty")
    return raw


def get_max_level(alphabet: str) -> int:
    return len(alphabet)