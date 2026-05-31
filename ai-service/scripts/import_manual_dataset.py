from __future__ import annotations

import argparse
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT.parent / "jaguar"
TARGET_DIR = ROOT / "datasets" / "roboflow"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@dataclass(frozen=True)
class SplitSummary:
    images: int
    labels: int
    annotated_labels: int
    boxes: int


def find_data_yaml(source: Path) -> Path | None:
    direct = source / "data.yaml"
    if direct.exists():
        return direct

    for candidate in sorted(source.rglob("data.yaml")):
        if candidate.is_file():
            return candidate
    return None


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file) or {}
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a YAML mapping.")
    return data


def count_files(path: Path, extensions: set[str] | None = None) -> int:
    if not path.exists():
        return 0
    files = [item for item in path.iterdir() if item.is_file()]
    if extensions is None:
        return len(files)
    return sum(1 for item in files if item.suffix.lower() in extensions)


def normalize_names(names: Any) -> list[str]:
    if isinstance(names, dict):
        return [str(names[key]) for key in sorted(names, key=lambda value: int(value))]
    if isinstance(names, list):
        return [str(name) for name in names]
    raise ValueError("data.yaml must define names as a list or numeric mapping.")


def split_dir(dataset_dir: Path, split: str, kind: str) -> Path:
    return dataset_dir / split / kind


def summarize_split(dataset_dir: Path, split: str) -> SplitSummary:
    labels_dir = split_dir(dataset_dir, split, "labels")
    label_files = [
        item for item in labels_dir.iterdir() if item.is_file() and item.suffix == ".txt"
    ] if labels_dir.exists() else []
    annotated_labels = 0
    boxes = 0
    for label_file in label_files:
        lines = [
            line.strip()
            for line in label_file.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        if lines:
            annotated_labels += 1
            boxes += len(lines)

    return SplitSummary(
        images=count_files(split_dir(dataset_dir, split, "images"), IMAGE_EXTENSIONS),
        labels=len(label_files),
        annotated_labels=annotated_labels,
        boxes=boxes,
    )


def collect_class_ids(dataset_dir: Path) -> set[int]:
    class_ids: set[int] = set()
    for labels_dir in dataset_dir.glob("*/labels"):
        for label_file in labels_dir.glob("*.txt"):
            for line_number, line in enumerate(
                label_file.read_text(encoding="utf-8").splitlines(), start=1
            ):
                if not line.strip():
                    continue
                parts = line.split()
                try:
                    class_ids.add(int(float(parts[0])))
                except (IndexError, ValueError) as exc:
                    raise ValueError(
                        f"Invalid YOLO label class at {label_file}:{line_number}"
                    ) from exc
    return class_ids


def validate_structure(dataset_dir: Path, data: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    for split in ("train", "valid"):
        for kind in ("images", "labels"):
            required = split_dir(dataset_dir, split, kind)
            if not required.exists():
                errors.append(f"Missing required directory: {required}")

    for kind in ("images", "labels"):
        required = split_dir(dataset_dir, "test", kind)
        if not required.exists():
            errors.append(f"Missing required directory: {required}")

    for key in ("train", "names", "nc"):
        if key not in data:
            errors.append(f"data.yaml missing required key: {key}")

    if "val" not in data and "valid" not in data:
        errors.append("data.yaml missing required key: val or valid")

    try:
        names = normalize_names(data.get("names"))
        nc = int(data.get("nc"))
        if nc != len(names):
            errors.append(f"data.yaml nc={nc} does not match len(names)={len(names)}")
        if nc <= 0 or not names:
            errors.append("data.yaml declares no classes: nc must be > 0 and names must not be empty")
    except Exception as exc:
        errors.append(str(exc))

    total_boxes = 0
    for split in ("train", "valid", "test"):
        summary = summarize_split(dataset_dir, split)
        total_boxes += summary.boxes
        if summary.images == 0:
            errors.append(f"{split}/images has no images")
        if summary.labels == 0:
            errors.append(f"{split}/labels has no labels")
        if summary.images and summary.labels and summary.images != summary.labels:
            errors.append(
                f"{split} image/label count mismatch: "
                f"{summary.images} images vs {summary.labels} labels"
            )
        if summary.labels and summary.annotated_labels == 0:
            errors.append(
                f"{split}/labels contains {summary.labels} files but no annotations"
            )

    if total_boxes == 0:
        errors.append("No YOLO bounding boxes found in any label file")

    try:
        names = normalize_names(data.get("names"))
        class_ids = collect_class_ids(dataset_dir)
        if class_ids:
            max_class_id = max(class_ids)
            if max_class_id >= len(names):
                errors.append(
                    f"Label class id {max_class_id} is outside data.yaml names "
                    f"range 0..{len(names) - 1}"
                )
    except Exception as exc:
        errors.append(str(exc))

    return errors


def copy_dataset(source_dataset: Path, target: Path) -> None:
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)

    for item in source_dataset.iterdir():
        destination = target / item.name
        if item.is_dir():
            shutil.copytree(item, destination)
        else:
            shutil.copy2(item, destination)


def write_local_data_yaml(target: Path, data: dict[str, Any]) -> list[str]:
    names = normalize_names(data["names"])
    corrected = {
        "path": str(target.resolve()),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": len(names),
        "names": {index: name for index, name in enumerate(names)},
    }
    with (target / "data.yaml").open("w", encoding="utf-8") as file:
        yaml.safe_dump(corrected, file, sort_keys=False, allow_unicode=False)
    return names


def print_summary(dataset_dir: Path, names: list[str]) -> None:
    train = summarize_split(dataset_dir, "train")
    valid = summarize_split(dataset_dir, "valid")
    test = summarize_split(dataset_dir, "test")
    print(f"dataset={dataset_dir}")
    print(f"train_images={train.images}")
    print(f"train_labels={train.labels}")
    print(f"train_annotated_labels={train.annotated_labels}")
    print(f"train_boxes={train.boxes}")
    print(f"valid_images={valid.images}")
    print(f"valid_labels={valid.labels}")
    print(f"valid_annotated_labels={valid.annotated_labels}")
    print(f"valid_boxes={valid.boxes}")
    print(f"test_images={test.images}")
    print(f"test_labels={test.labels}")
    print(f"test_annotated_labels={test.annotated_labels}")
    print(f"test_boxes={test.boxes}")
    print(f"classes={names}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--target", type=Path, default=TARGET_DIR)
    args = parser.parse_args()

    source = args.source.expanduser().resolve()
    data_yaml = find_data_yaml(source)
    if not data_yaml:
        print(f"No data.yaml found under source: {source}")
        return 2

    dataset_dir = data_yaml.parent
    data = load_yaml(data_yaml)
    names = normalize_names(data.get("names"))

    print(f"manual_source={source}")
    print(f"yolo_dataset={dataset_dir}")
    print_summary(dataset_dir, names)

    errors = validate_structure(dataset_dir, data)
    if errors:
        print("Dataset validation failed:")
        for error in errors:
            print(f"- {error}")
        print("Import stopped. Training was not started.")
        return 2

    copy_dataset(dataset_dir, args.target)
    corrected_names = write_local_data_yaml(args.target, data)
    print(f"Dataset copied to: {args.target}")
    print(f"Corrected data.yaml written to: {args.target / 'data.yaml'}")
    print_summary(args.target, corrected_names)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
