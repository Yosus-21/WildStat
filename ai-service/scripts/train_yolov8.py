from __future__ import annotations

import os
import shutil
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
ROBOFLOW_DIR = ROOT / "datasets" / "roboflow"
COMBINED_DIR = ROOT / "datasets" / "combined"
MODELS_DIR = ROOT / "models" / "yolo"
RUNS_DIR = ROOT / "runs" / "train"


def select_device(requested: str) -> str:
    if requested == "mps":
        try:
            import torch

            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
        except Exception:
            pass
        return "cpu"
    if requested == "cuda":
        print("CUDA is not used on this Apple Silicon workflow. Falling back to cpu.")
        return "cpu"
    return requested or "cpu"


def find_data_yaml() -> Path | None:
    for base_dir in [COMBINED_DIR, ROBOFLOW_DIR]:
        candidates = [base_dir / "data.yaml", *base_dir.glob("*/data.yaml")]
        for candidate in candidates:
            if candidate.exists():
                return candidate
    return None


def main() -> int:
    load_dotenv(ROOT / ".env")
    data_yaml = find_data_yaml()

    if not data_yaml:
        print(
            "No YOLOv8 data.yaml found. Download Roboflow dataset or prepare "
            "datasets/combined before training."
        )
        return 2

    from ultralytics import YOLO

    model_name = os.getenv("YOLO_MODEL", "yolov8n.pt")
    epochs = int(os.getenv("YOLO_EPOCHS", "50"))
    imgsz = int(os.getenv("YOLO_IMGSZ", "640"))
    batch = int(os.getenv("YOLO_BATCH", "8"))
    patience = int(os.getenv("YOLO_PATIENCE", "15"))
    device = select_device(os.getenv("YOLO_DEVICE", "mps"))

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Training {model_name} with device={device}, data={data_yaml}")

    model = YOLO(model_name)
    results = model.train(
        data=str(data_yaml),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        device=device,
        patience=patience,
        project=str(RUNS_DIR),
        name=os.getenv("YOLO_RUN_NAME", "jaguar-yolov8n"),
        exist_ok=True,
    )

    best_source = Path(results.save_dir) / "weights" / "best.pt"
    best_target = MODELS_DIR / "best.pt"

    if best_source.exists():
        shutil.copy2(best_source, best_target)
        print(f"Best model copied to: {best_target}")
        return 0

    print(f"Training completed, but best.pt was not found at {best_source}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
