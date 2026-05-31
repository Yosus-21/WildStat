from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.image_processor import ImageProcessor
from app.services.paths import resolve_service_path
from app.services.video_processor import VideoProcessor
from app.services.yolo_detector import YoloDetector
from faunalens_ai.config import settings

router = APIRouter()
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".m4v"}


def get_detector(confidence_threshold: float | None = None) -> YoloDetector:
    del confidence_threshold
    return YoloDetector(
        model_path=resolve_service_path(settings.model_path),
        device=settings.yolo_device,
    )


@router.get("/model")
def model_info() -> dict[str, str | float | bool]:
    model_path = resolve_service_path(settings.model_path)
    return {
        "model_path": str(model_path),
        "exists": model_path.exists(),
        "confidence_threshold": settings.confidence_threshold,
    }


@router.post("/detect/image")
async def detect_image(file: UploadFile = File(...)) -> dict[str, Any]:
    model_path = resolve_service_path(settings.model_path)
    detector = get_detector()

    if not model_path.exists():
        return {
            "status": "not_ready",
            "message": "YOLO model not trained yet",
            "model_path": str(model_path),
            "detections": [],
            "events": [],
        }

    suffix = Path(file.filename or "upload.jpg").suffix.lower() or ".jpg"
    if suffix not in IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported image format")

    output_root = resolve_service_path(settings.predictions_output_dir)
    output_root.mkdir(parents=True, exist_ok=True)
    temp_path = output_root / f"upload-{uuid4().hex}{suffix}"
    temp_path.write_bytes(await file.read())

    try:
        processor = ImageProcessor(detector=detector, output_dir=output_root)
        result = processor.process_image(
            image_path=temp_path,
            confidence_threshold=settings.confidence_threshold,
        )
        return {
            "status": "ok",
            "model_path": str(model_path),
            "detections": result["detections"],
            "events": result["events"],
        }
    finally:
        temp_path.unlink(missing_ok=True)


@router.post("/detect/video")
async def detect_video(
    file: UploadFile = File(...),
    frame_interval_seconds: float = Form(settings.default_frame_interval_seconds),
    confidence_threshold: float = Form(settings.default_confidence_threshold),
    event_gap_seconds: float = Form(settings.default_event_gap_seconds),
    clip_padding_seconds: float = Form(settings.default_clip_padding_seconds),
    max_frames: int | None = Form(settings.default_max_frames),
) -> dict[str, Any]:
    model_path = resolve_service_path(settings.model_path)
    if not model_path.exists():
        return {
            "status": "not_ready",
            "message": "YOLO model not trained yet",
            "model_path": str(model_path),
            "events": [],
        }

    suffix = Path(file.filename or "upload.mp4").suffix.lower() or ".mp4"
    if suffix not in VIDEO_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported video format")

    if frame_interval_seconds <= 0:
        raise HTTPException(status_code=400, detail="frame_interval_seconds must be > 0")
    if confidence_threshold < 0 or confidence_threshold > 1:
        raise HTTPException(status_code=400, detail="confidence_threshold must be 0..1")
    if event_gap_seconds < 0:
        raise HTTPException(status_code=400, detail="event_gap_seconds must be >= 0")
    if clip_padding_seconds < 0:
        raise HTTPException(status_code=400, detail="clip_padding_seconds must be >= 0")
    if max_frames is not None and max_frames <= 0:
        max_frames = None

    temp_dir = resolve_service_path(settings.temp_uploads_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"upload-{uuid4().hex}{suffix}"
    temp_path.write_bytes(await file.read())

    detector = get_detector()
    processor = VideoProcessor(
        detector=detector,
        frames_output_dir=resolve_service_path(settings.output_frames_dir),
        clips_output_dir=resolve_service_path(settings.output_clips_dir),
    )

    try:
        return processor.process_video(
            video_path=temp_path,
            frame_interval_seconds=frame_interval_seconds,
            confidence_threshold=confidence_threshold,
            event_gap_seconds=event_gap_seconds,
            clip_padding_seconds=clip_padding_seconds,
            max_frames=max_frames,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Video inference failed: {exc}") from exc
    finally:
        temp_path.unlink(missing_ok=True)
