from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@dataclass
class SplitStats:
    images: int = 0
    labels: int = 0
    empty_labels: int = 0
    annotated_labels: int = 0
    boxes: int = 0


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
    return data if isinstance(data, dict) else {}


def normalize_names(names: Any) -> list[str]:
    if isinstance(names, dict):
        return [str(names[key]) for key in sorted(names, key=lambda value: int(value))]
    if isinstance(names, list):
        return [str(name) for name in names]
    return []


def count_images(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(1 for item in path.iterdir() if item.is_file() and item.suffix.lower() in IMAGE_EXTENSIONS)


def parse_label_line(label_file: Path, line_number: int, line: str) -> tuple[int, list[float], str | None]:
    parts = line.split()
    if len(parts) != 5:
        return -1, [], f"{label_file}:{line_number} must have 5 values"
    try:
        class_id_float = float(parts[0])
        class_id = int(class_id_float)
        if class_id_float != class_id:
            return -1, [], f"{label_file}:{line_number} class_id must be an integer"
        values = [float(value) for value in parts[1:]]
    except ValueError:
        return -1, [], f"{label_file}:{line_number} contains non-numeric values"
    if any(value < 0 or value > 1 for value in values):
        return class_id, values, f"{label_file}:{line_number} bbox values must be between 0 and 1"
    return class_id, values, None


def inspect_split(dataset_dir: Path, split: str) -> tuple[SplitStats, set[int], list[str], list[str]]:
    stats = SplitStats(images=count_images(dataset_dir / split / "images"))
    labels_dir = dataset_dir / split / "labels"
    class_ids: set[int] = set()
    errors: list[str] = []
    examples: list[str] = []
    if not labels_dir.exists():
        return stats, class_ids, [f"Missing directory: {labels_dir}"], examples

    label_files = sorted(labels_dir.glob("*.txt"))
    stats.labels = len(label_files)
    for label_file in label_files:
        lines = [line.strip() for line in label_file.read_text(encoding="utf-8").splitlines() if line.strip()]
        if not lines:
            stats.empty_labels += 1
            continue
        stats.annotated_labels += 1
        stats.boxes += len(lines)
        if len(examples) < 3:
            examples.append(f"{label_file}: {lines[0]}")
        for line_number, line in enumerate(lines, start=1):
            class_id, _values, error = parse_label_line(label_file, line_number, line)
            if error:
                errors.append(error)
            if class_id >= 0:
                class_ids.add(class_id)
    return stats, class_ids, errors, examples


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    args = parser.parse_args()

    source = args.source.expanduser().resolve()
    data_yaml = find_data_yaml(source)
    if not data_yaml:
        print(f"source={source}")
        print("valid=false")
        print("error=No data.yaml found")
        return 2

    dataset_dir = data_yaml.parent
    data = load_yaml(data_yaml)
    names = normalize_names(data.get("names"))
    nc = int(data.get("nc") or 0)
    all_class_ids: set[int] = set()
    all_errors: list[str] = []
    all_examples: list[str] = []

    print(f"source={source}")
    print(f"dataset_root={dataset_dir}")
    print(f"data_yaml={data_yaml}")
    print(f"nc={nc}")
    print(f"names={names}")

    for split in ("train", "valid", "test"):
        exists = {
            "images": (dataset_dir / split / "images").exists(),
            "labels": (dataset_dir / split / "labels").exists(),
        }
        stats, class_ids, errors, examples = inspect_split(dataset_dir, split)
        all_class_ids.update(class_ids)
        all_errors.extend(errors)
        all_examples.extend(examples)
        print(f"{split}_images_dir_exists={exists['images']}")
        print(f"{split}_labels_dir_exists={exists['labels']}")
        print(f"{split}_images={stats.images}")
        print(f"{split}_labels={stats.labels}")
        print(f"{split}_empty_labels={stats.empty_labels}")
        print(f"{split}_annotated_labels={stats.annotated_labels}")
        print(f"{split}_boxes={stats.boxes}")

    out_of_range = sorted(class_id for class_id in all_class_ids if class_id < 0 or class_id >= len(names))
    if nc != len(names):
        all_errors.append(f"nc={nc} does not match len(names)={len(names)}")
    if nc <= 0 or not names:
        all_errors.append("nc must be > 0 and names must not be empty")
    if out_of_range:
        all_errors.append(f"class IDs outside names range: {out_of_range}")

    print(f"class_ids_used={sorted(all_class_ids)}")
    print("non_empty_label_examples=")
    for example in all_examples[:3]:
        print(f"- {example}")
    print(f"valid={not all_errors}")
    if all_errors:
        print("errors=")
        for error in all_errors[:50]:
            print(f"- {error}")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
