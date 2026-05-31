from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def resolve_service_path(value: str | Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else ROOT / path
