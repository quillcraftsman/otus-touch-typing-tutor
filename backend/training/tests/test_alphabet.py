from pathlib import Path

import pytest
from django.test import override_settings

from training.alphabet import get_max_level, load_alphabet
from training.levels import clamp_level


def test_clamp_level():
    assert clamp_level(0, 5) == 1
    assert clamp_level(10, 5) == 5
    assert clamp_level(3, 5) == 3


@override_settings(ALPHABET_PATH=str(Path(__file__).resolve().parents[3] / "alphabet" / "main.txt"))
def test_load_alphabet():
    alphabet = load_alphabet()
    assert len(alphabet) > 0
    assert get_max_level(alphabet) == len(alphabet)


@override_settings(ALPHABET_PATH="/nonexistent/empty.txt")
def test_empty_alphabet_file(tmp_path, settings):
    path = tmp_path / "empty.txt"
    path.write_text("   \n", encoding="utf-8")
    settings.ALPHABET_PATH = str(path)
    with pytest.raises(ValueError, match="empty"):
        load_alphabet()