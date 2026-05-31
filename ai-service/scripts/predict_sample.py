from __future__ import annotations

import argparse
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "yolo" / "best.pt"
OUTPUT_DIR = ROOT / "outputs" / "predictions"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}


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


def find_sample_image() -> Path | None:
    search_roots = [
        ROOT / "datasets" / "selected_frames",
        ROOT / "datasets" / "extracted_frames",
        ROOT / "datasets" / "roboflow",
    ]
    for search_root in search_roots:
        if not search_root.exists():
            continue
        for image_path in sorted(search_root.rglob("*")):
            if image_path.suffix.lower() in IMAGE_EXTENSIONS:
                return image_path
    return None


def main() -> int:
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=Path)
    parser.add_argument("--source", type=Path, help="Alias for --image.")
    args = parser.parse_args()

    if not MODEL_PATH.exists():
        print(f"Model not found: {MODEL_PATH}")
        return 2

    image_path = args.source or args.image or find_sample_image()
    if not image_path or not image_path.exists():
        print("No sample image found. Provide --image or extract/select frames first.")
        return 2

    from ultralytics import YOLO

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    device = select_device(os.getenv("YOLO_DEVICE", "mps"))
    model = YOLO(str(MODEL_PATH))
    results = model.predict(
        source=str(image_path),
        device=device,
        save=True,
        project=str(OUTPUT_DIR),
        name="sample",
        exist_ok=True,
        verbose=False,
    )

    for result in results:
        detections = []
        for box in result.boxes:
            class_id = int(box.cls[0].item())
            detections.append(
                {
                    "class_id": class_id,
                    "class_name": result.names.get(class_id, str(class_id)),
                    "confidence": float(box.conf[0].item()),
                    "xyxy": [float(value) for value in box.xyxy[0].tolist()],
                }
            )
        print(f"image={image_path}")
        print(f"detections={detections}")

    print(f"Prediction outputs saved under: {OUTPUT_DIR / 'sample'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
