from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path

from import_manual_dataset import load_yaml, validate_structure

ROOT = Path(__file__).resolve().parents[1]
ROBOFLOW_DIR = ROOT / "datasets" / "roboflow"
COMBINED_DIR = ROOT / "datasets" / "combined"
SELECTED_FRAMES_DIR = ROOT / "datasets" / "selected_frames"
REQUIRED_PATHS = [
    "train/images",
    "train/labels",
    "valid/images",
    "valid/labels",
    "test/images",
    "test/labels",
    "data.yaml",
]
OPTIONAL_LABEL_PATHS = ["test/labels"]


def find_yolo_dataset(base_dir: Path) -> Path | None:
    candidates = [base_dir, *[path for path in base_dir.rglob("*") if path.is_dir()]]
    for candidate in candidates:
        if all((candidate / required).exists() for required in REQUIRED_PATHS):
            return candidate
    return None


def resolve_manual_source(value: str | None) -> Path | None:
    if not value:
        return None
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = (ROOT / path).resolve()
    return path


def copy_tree_contents(source: Path, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    for item in source.iterdir():
        destination = target / item.name
        if item.is_dir():
            shutil.copytree(item, destination, dirs_exist_ok=True)
        else:
            shutil.copy2(item, destination)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--build-combined", action="store_true")
    parser.add_argument(
        "--source",
        type=Path,
        help="Manual YOLO dataset source, for example ../jaguar.",
    )
    args = parser.parse_args()

    SELECTED_FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    manual_source = resolve_manual_source(str(args.source)) if args.source else None
    manual_source = manual_source or resolve_manual_source(os.getenv("MANUAL_DATASET_PATH"))
    search_dir = manual_source if manual_source else ROBOFLOW_DIR
    dataset_dir = find_yolo_dataset(search_dir)

    if not dataset_dir:
        print(
            "Roboflow YOLOv8 dataset not found. Expected train/valid/test "
            f"images+labels and data.yaml under {search_dir}."
        )
        print(
            "Extracted video frames remain separate in selected_frames and must "
            "be annotated before training."
        )
        return 2

    print(f"YOLOv8 dataset verified: {dataset_dir}")
    data_yaml = dataset_dir / "data.yaml"
    errors = validate_structure(dataset_dir, load_yaml(data_yaml))
    if errors:
        print("YOLOv8 dataset content validation failed:")
        for error in errors:
            print(f"- {error}")
        return 2
    for optional_path in OPTIONAL_LABEL_PATHS:
        if not (dataset_dir / optional_path).exists():
            print(f"Optional path not present: {dataset_dir / optional_path}")
    print("Unlabeled extracted frames are not mixed into training data.")

    if args.build_combined:
        if COMBINED_DIR.exists():
            shutil.rmtree(COMBINED_DIR)
        copy_tree_contents(dataset_dir, COMBINED_DIR)
        print(f"Combined dataset initialized from Roboflow: {COMBINED_DIR}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
