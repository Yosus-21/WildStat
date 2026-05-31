from __future__ import annotations

from pathlib import Path
from typing import Any

import cv2

from app.services.clip_extractor import ClipExtractor
from app.services.frame_extractor import FrameSample, format_timestamp
from app.services.frame_extractor import FrameExtractor
from app.services.yolo_detector import YoloDetector


class VideoProcessor:
    def __init__(
        self,
        detector: YoloDetector,
        frames_output_dir: Path,
        clips_output_dir: Path,
    ) -> None:
        self.detector = detector
        self.frames_output_dir = frames_output_dir
        self.clips_output_dir = clips_output_dir
        self.frame_extractor = FrameExtractor()
        self.clip_extractor = ClipExtractor()

    def process_video(
        self,
        video_path: Path,
        frame_interval_seconds: float,
        confidence_threshold: float,
        event_gap_seconds: float,
        clip_padding_seconds: float,
        max_frames: int | None,
    ) -> dict[str, Any]:
        metadata, samples = self.frame_extractor.extract_frames(
            video_path=video_path,
            frame_interval_seconds=frame_interval_seconds,
            max_frames=max_frames,
            save_frames=False,
        )

        detections = self._detect_samples(samples, confidence_threshold)
        events = self._build_events(
            video_path=video_path,
            detections=detections,
            event_gap_seconds=event_gap_seconds,
            clip_padding_seconds=clip_padding_seconds,
            duration_seconds=metadata.duration_seconds,
            fps=metadata.fps,
            width=metadata.width,
            height=metadata.height,
        )

        return {
            "status": "ok",
            "media_type": "video",
            "file_name": video_path.name,
            "model_exists": self.detector.exists,
            "summary": {
                "duration_seconds": metadata.duration_seconds,
                "fps": metadata.fps,
                "width": metadata.width,
                "height": metadata.height,
                "frames_processed": len(samples),
                "detections_count": len(detections),
                "events_count": len(events),
            },
            "events": events,
        }

    def _detect_samples(
        self,
        samples: list[FrameSample],
        confidence_threshold: float,
    ) -> list[dict[str, Any]]:
        detections: list[dict[str, Any]] = []
        for sample in samples:
            frame_detections = self.detector.detect_image_array(
                sample.frame,
                confidence_threshold=confidence_threshold,
            )
            for detection in frame_detections:
                detections.append(
                    {
                        **detection,
                        "timestamp_seconds": sample.timestamp_seconds,
                        "timestamp_video": sample.timestamp_video,
                        "frame_index": sample.frame_index,
                        "_frame": sample.frame.copy(),
                    }
                )
        detections.sort(key=lambda item: item["timestamp_seconds"])
        return detections

    def _build_events(
        self,
        video_path: Path,
        detections: list[dict[str, Any]],
        event_gap_seconds: float,
        clip_padding_seconds: float,
        duration_seconds: float,
        fps: float,
        width: int,
        height: int,
    ) -> list[dict[str, Any]]:
        if not detections:
            return []

        grouped: list[list[dict[str, Any]]] = []
        current: list[dict[str, Any]] = []
        last_timestamp: float | None = None

        for detection in detections:
            timestamp = float(detection["timestamp_seconds"])
            if last_timestamp is None or timestamp - last_timestamp <= event_gap_seconds:
                current.append(detection)
            else:
                grouped.append(current)
                current = [detection]
            last_timestamp = timestamp

        if current:
            grouped.append(current)

        events: list[dict[str, Any]] = []
        for index, group in enumerate(grouped, start=1):
            best = max(group, key=lambda item: item["confidence"])
            start_time = min(float(item["timestamp_seconds"]) for item in group)
            end_time = max(float(item["timestamp_seconds"]) for item in group)
            frame_path = self._save_key_frame(video_path, index, best)
            clip_path = self._save_clip(
                video_path=video_path,
                event_index=index,
                start_time=max(0.0, start_time - clip_padding_seconds),
                end_time=min(duration_seconds, end_time + clip_padding_seconds),
                fps=fps,
                width=width,
                height=height,
            )

            events.append(
                {
                    "event_id": index,
                    "timestamp_video": format_timestamp(float(best["timestamp_seconds"])),
                    "start_time": start_time,
                    "end_time": end_time,
                    "ai_species": best["class_name"],
                    "ai_confidence": best["confidence"],
                    "frame_path": frame_path,
                    "clip_path": clip_path,
                    "bbox": best["bbox"],
                }
            )

        return events

    def _save_key_frame(
        self,
        video_path: Path,
        event_index: int,
        detection: dict[str, Any],
    ) -> str:
        self.frames_output_dir.mkdir(parents=True, exist_ok=True)
        frame = detection["_frame"].copy()
        x1, y1, x2, y2 = [int(round(value)) for value in detection["bbox"]]
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        label = f'{detection["class_name"]} {detection["confidence"]:.2f}'
        cv2.putText(
            frame,
            label,
            (max(0, x1), max(20, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2,
            cv2.LINE_AA,
        )
        frame_path = self.frames_output_dir / f"{video_path.stem}_event_{event_index:03d}.jpg"
        cv2.imwrite(str(frame_path), frame)
        return str(frame_path)

    def _save_clip(
        self,
        video_path: Path,
        event_index: int,
        start_time: float,
        end_time: float,
        fps: float,
        width: int,
        height: int,
    ) -> str | None:
        clip_path = self.clips_output_dir / f"{video_path.stem}_event_{event_index:03d}.mp4"
        return self.clip_extractor.extract_clip(
            video_path=video_path,
            output_path=clip_path,
            start_seconds=start_time,
            end_seconds=end_time,
            fps=fps,
            width=width,
            height=height,
        )
