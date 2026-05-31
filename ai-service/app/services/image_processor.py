from __future__ import annotations

from pathlib import Path
from typing import Any

from app.services.yolo_detector import YoloDetector


class ImageProcessor:
    def __init__(self, detector: YoloDetector, output_dir: Path) -> None:
        self.detector = detector
        self.output_dir = output_dir

    def process_image(
        self,
        image_path: Path,
        confidence_threshold: float,
    ) -> dict[str, Any]:
        detections, output_path = self.detector.detect_image_path(
            image_path=image_path,
            confidence_threshold=confidence_threshold,
            save=True,
            project=self.output_dir,
            name="api",
        )
        events = [
            {
                "aiSpecies": detection["class_name"],
                "aiConfidence": detection["confidence"],
                "bbox": detection["bbox"],
                "framePath": str(image_path),
                "outputPath": output_path,
                "classId": detection["class_id"],
                "className": detection["class_name"],
                "confidence": detection["confidence"],
                "xyxy": detection["bbox"],
            }
            for detection in detections
        ]
        return {
            "detections": events,
            "events": events,
        }
