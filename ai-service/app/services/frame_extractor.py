from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np


@dataclass(frozen=True)
class VideoMetadata:
    fps: float
    frame_count: int
    duration_seconds: float
    width: int
    height: int


@dataclass
class FrameSample:
    frame_index: int
    timestamp_seconds: float
    timestamp_video: str
    frame_path: str | None
    frame: np.ndarray


def format_timestamp(seconds: float) -> str:
    total_seconds = max(0, int(seconds))
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


class FrameExtractor:
    def get_metadata(self, video_path: Path) -> VideoMetadata:
        cap = cv2.VideoCapture(str(video_path))
        try:
            if not cap.isOpened():
                raise ValueError(f"OpenCV cannot open video: {video_path}")

            fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
            duration = frame_count / fps if fps > 0 else 0.0
            return VideoMetadata(
                fps=fps,
                frame_count=frame_count,
                duration_seconds=duration,
                width=width,
                height=height,
            )
        finally:
            cap.release()

    def extract_frames(
        self,
        video_path: Path,
        frame_interval_seconds: float = 1.0,
        max_frames: int | None = None,
        output_dir: Path | None = None,
        save_frames: bool = False,
    ) -> tuple[VideoMetadata, list[FrameSample]]:
        metadata = self.get_metadata(video_path)
        if metadata.fps <= 0 or metadata.frame_count <= 0:
            raise ValueError(f"Invalid video metadata: {video_path}")

        interval = max(frame_interval_seconds, 0.001)
        frame_step = max(1, int(round(metadata.fps * interval)))
        cap = cv2.VideoCapture(str(video_path))
        samples: list[FrameSample] = []
        stem = video_path.stem

        if save_frames and output_dir:
            output_dir.mkdir(parents=True, exist_ok=True)

        try:
            frame_index = 0
            while frame_index < metadata.frame_count:
                if max_frames is not None and len(samples) >= max_frames:
                    break
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
                ok, frame = cap.read()
                if not ok:
                    break

                timestamp_seconds = frame_index / metadata.fps
                frame_path: str | None = None
                if save_frames and output_dir:
                    path = output_dir / f"{stem}_frame_{len(samples) + 1:06d}.jpg"
                    cv2.imwrite(str(path), frame)
                    frame_path = str(path)

                samples.append(
                    FrameSample(
                        frame_index=frame_index,
                        timestamp_seconds=timestamp_seconds,
                        timestamp_video=format_timestamp(timestamp_seconds),
                        frame_path=frame_path,
                        frame=frame,
                    )
                )
                frame_index += frame_step
        finally:
            cap.release()

        return metadata, samples
