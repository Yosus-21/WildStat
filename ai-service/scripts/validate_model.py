from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "yolo" / "best.pt"
ROBOFLOW_DIR = ROOT / "datasets" / "roboflow"
COMBINED_DIR = ROOT / "datasets" / "combined"


def select_device(requested: str) -> str:
    if requested == "mps":
        try:
            import torch

            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
        except Exception:
            pass
        return "cpu"
    return "cpu" if requested == "cuda" else requested


def find_data_yaml() -> Path | None:
    for base_dir in [COMBINED_DIR, ROBOFLOW_DIR]:
        candidates = [base_dir / "data.yaml", *base_dir.glob("*/data.yaml")]
        for candidate in candidates:
            if candidate.exists():
                return candidate
    return None


def main() -> int:
    load_dotenv(ROOT / ".env")

    if not MODEL_PATH.exists():
        print(f"Model not found: {MODEL_PATH}")
        return 2

    data_yaml = find_data_yaml()
    if not data_yaml:
        print("No data.yaml found for validation.")
        return 2

    from ultralytics import YOLO

    device = select_device(os.getenv("YOLO_DEVICE", "mps"))
    model = YOLO(str(MODEL_PATH))
    metrics = model.val(data=str(data_yaml), device=device)

    box = getattr(metrics, "box", None)
    print(f"metrics={metrics}")
    if box:
        print(f"precision={getattr(box, 'mp', None)}")
        print(f"recall={getattr(box, 'mr', None)}")
        print(f"map50={getattr(box, 'map50', None)}")
        print(f"map50_95={getattr(box, 'map', None)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
