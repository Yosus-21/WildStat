from __future__ import annotations

import argparse
import csv
from pathlib import Path

import cv2

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = ROOT.parent
DEFAULT_SOURCE_DIRS = [
    WORKSPACE_ROOT / "videos",
    ROOT / "datasets" / "raw_videos",
]
OUTPUT_DIR = ROOT / "datasets" / "extracted_frames"
CSV_PATH = OUTPUT_DIR / "frames_index.csv"
VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}


def timestamp_hhmmss(seconds: float) -> str:
    total_seconds = int(round(seconds))
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def safe_stem(path: Path) -> str:
    return "".join(char if char.isalnum() else "_" for char in path.stem).strip("_")


def discover_videos(source_dir: Path | None) -> list[Path]:
    source_dirs = [source_dir] if source_dir else DEFAULT_SOURCE_DIRS
    videos: list[Path] = []

    for directory in source_dirs:
        if not directory or not directory.exists():
            continue
        videos.extend(
            sorted(path for path in directory.iterdir() if path.suffix.lower() in VIDEO_EXTENSIONS)
        )

    return videos


def extract_frames(interval_seconds: float, source_dir: Path | None) -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    videos = discover_videos(source_dir)

    if not videos:
        print("No videos found in WWF/videos or ai-service/datasets/raw_videos.")
        return 1

    rows: list[dict[str, str | float]] = []

    for video_path in videos:
        capture = cv2.VideoCapture(str(video_path))
        if not capture.isOpened():
            print(f"Skipping unreadable video: {video_path}")
            continue

        fps = capture.get(cv2.CAP_PROP_FPS) or 30
        frame_step = max(1, int(round(fps * interval_seconds)))
        frame_index = 0
        extracted = 0

        while True:
            success, frame = capture.read()
            if not success:
                break

            if frame_index % frame_step == 0:
                timestamp_seconds = frame_index / fps
                hhmmss = timestamp_hhmmss(timestamp_seconds)
                output_name = (
                    f"{safe_stem(video_path)}__{hhmmss.replace(':', '-')}.jpg"
                )
                output_path = OUTPUT_DIR / output_name

                if not output_path.exists():
                    cv2.imwrite(str(output_path), frame)

                rows.append(
                    {
                        "video_name": video_path.name,
                        "frame_path": str(output_path.relative_to(ROOT)),
                        "timestamp_seconds": round(timestamp_seconds, 2),
                        "timestamp_hhmmss": hhmmss,
                    }
                )
                extracted += 1

            frame_index += 1

        capture.release()
        print(f"{video_path.name}: extracted/indexed {extracted} frames")

    with CSV_PATH.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=[
                "video_name",
                "frame_path",
                "timestamp_seconds",
                "timestamp_hhmmss",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Frame index written to: {CSV_PATH}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument("--source-dir", type=Path)
    args = parser.parse_args()
    return extract_frames(args.interval, args.source_dir)


if __name__ == "__main__":
    raise SystemExit(main())
