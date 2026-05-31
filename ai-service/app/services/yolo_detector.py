from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

_MODEL_CACHE: dict[str, Any] = {}


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


class YoloDetector:
    def __init__(self, model_path: Path, device: str = "mps") -> None:
        self.model_path = model_path
        self.device = select_device(device)

    @property
    def exists(self) -> bool:
        return self.model_path.exists()

    def _model(self) -> Any:
        cache_key = str(self.model_path.resolve())
        if cache_key not in _MODEL_CACHE:
            from ultralytics import YOLO

            _MODEL_CACHE[cache_key] = YOLO(cache_key)
        return _MODEL_CACHE[cache_key]

    def detect_image_path(
        self,
        image_path: Path,
        confidence_threshold: float,
        save: bool = False,
        project: Path | None = None,
        name: str = "predict",
    ) -> tuple[list[dict[str, Any]], str | None]:
        results = self._model().predict(
            source=str(image_path),
            conf=confidence_threshold,
            device=self.device,
            save=save,
            project=str(project) if project else None,
            name=name,
            exist_ok=True,
            verbose=False,
        )
        detections: list[dict[str, Any]] = []
        output_path: str | None = None
        for result in results:
            if getattr(result, "save_dir", None):
                output_path = str(Path(result.save_dir) / image_path.name)
            detections.extend(self._parse_result(result))
        return detections, output_path

    def detect_image_array(
        self,
        frame: np.ndarray,
        confidence_threshold: float,
    ) -> list[dict[str, Any]]:
        results = self._model().predict(
            source=frame,
            conf=confidence_threshold,
            device=self.device,
            verbose=False,
        )
        detections: list[dict[str, Any]] = []
        for result in results:
            detections.extend(self._parse_result(result))
        return detections

    @staticmethod
    def _parse_result(result: Any) -> list[dict[str, Any]]:
        detections: list[dict[str, Any]] = []
        names = result.names
        for box in result.boxes:
            class_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            bbox = [float(value) for value in box.xyxy[0].tolist()]
            detections.append(
                {
                    "class_id": class_id,
                    "class_name": names.get(class_id, str(class_id)),
                    "confidence": confidence,
                    "bbox": bbox,
                    "xyxy": bbox,
                }
            )
        return detections
