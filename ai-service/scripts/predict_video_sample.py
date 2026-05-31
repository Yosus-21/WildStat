from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from app.services.paths import resolve_service_path  # noqa: E402
from app.services.video_processor import VideoProcessor  # noqa: E402
from app.services.yolo_detector import YoloDetector  # noqa: E402
from faunalens_ai.config import settings  # noqa: E402


def main() -> int:
    load_dotenv(ROOT / ".env")

    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument(
        "--frame-interval",
        type=float,
        default=settings.default_frame_interval_seconds,
    )
    parser.add_argument("--conf", type=float, default=settings.default_confidence_threshold)
    parser.add_argument("--event-gap", type=float, default=settings.default_event_gap_seconds)
    parser.add_argument(
        "--clip-padding",
        type=float,
        default=settings.default_clip_padding_seconds,
    )
    parser.add_argument("--max-frames", type=int, default=settings.default_max_frames)
    args = parser.parse_args()

    video_path = args.video.expanduser().resolve()
    if not video_path.exists():
        print(f"Video not found: {video_path}")
        return 2

    model_path = resolve_service_path(settings.model_path)
    if not model_path.exists():
        print(
            json.dumps(
                {
                    "status": "not_ready",
                    "message": "YOLO model not trained yet",
                    "model_path": str(model_path),
                    "events": [],
                },
                indent=2,
            )
        )
        return 2

    detector = YoloDetector(model_path=model_path, device=settings.yolo_device)
    processor = VideoProcessor(
        detector=detector,
        frames_output_dir=resolve_service_path(settings.output_frames_dir),
        clips_output_dir=resolve_service_path(settings.output_clips_dir),
    )
    result = processor.process_video(
        video_path=video_path,
        frame_interval_seconds=args.frame_interval,
        confidence_threshold=args.conf,
        event_gap_seconds=args.event_gap,
        clip_padding_seconds=args.clip_padding,
        max_frames=args.max_frames,
    )

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
