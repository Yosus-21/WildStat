from __future__ import annotations

from pathlib import Path

import cv2


class ClipExtractor:
    def extract_clip(
        self,
        video_path: Path,
        output_path: Path,
        start_seconds: float,
        end_seconds: float,
        fps: float,
        width: int,
        height: int,
    ) -> str | None:
        if fps <= 0 or width <= 0 or height <= 0 or end_seconds <= start_seconds:
            return None

        output_path.parent.mkdir(parents=True, exist_ok=True)
        cap = cv2.VideoCapture(str(video_path))
        writer: cv2.VideoWriter | None = None
        try:
            if not cap.isOpened():
                return None

            start_frame = max(0, int(start_seconds * fps))
            end_frame = max(start_frame + 1, int(end_seconds * fps))
            cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
            if not writer.isOpened():
                return None

            current_frame = start_frame
            while current_frame <= end_frame:
                ok, frame = cap.read()
                if not ok:
                    break
                writer.write(frame)
                current_frame += 1
        finally:
            cap.release()
            if writer is not None:
                writer.release()

        return str(output_path) if output_path.exists() else None
