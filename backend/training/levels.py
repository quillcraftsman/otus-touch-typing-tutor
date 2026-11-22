def clamp_level(level: int, max_level: int) -> int:
    return min(max(level, 1), max_level)