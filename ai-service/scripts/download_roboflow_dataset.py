from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT.parent / "jaguar_roboflow_sdk"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def count_files(path: Path, extensions: set[str]) -> int:
    if not path.exists():
        return 0
    return sum(1 for item in path.iterdir() if item.is_file() and item.suffix.lower() in extensions)


def find_dataset_root(source: Path) -> Path | None:
    candidates = [source, *[path for path in source.rglob("*") if path.is_dir()]]
    for candidate in candidates:
        if (
            (candidate / "data.yaml").exists()
            and (candidate / "train" / "images").exists()
            and (candidate / "train" / "labels").exists()
        ):
            return candidate
    return None


def copy_or_replace(source: Path, target: Path) -> None:
    if target.exists():
        shutil.rmtree(target)
    if source.resolve() == target.resolve():
        return
    shutil.copytree(source, target)


def print_basic_counts(dataset_dir: Path) -> None:
    print(f"dataset_root={dataset_dir}")
    print(f"data_yaml_exists={(dataset_dir / 'data.yaml').exists()}")
    for split in ("train", "valid", "test"):
        images = count_files(dataset_dir / split / "images", IMAGE_EXTENSIONS)
        labels = count_files(dataset_dir / split / "labels", {".txt"})
        print(f"{split}_images={images}")
        print(f"{split}_labels={labels}")


def main() -> int:
    load_dotenv(ROOT / ".env")

    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", default=os.getenv("ROBOFLOW_WORKSPACE", "jhow-rambo"))
    parser.add_argument("--project", default=os.getenv("ROBOFLOW_PROJECT", "jaguar"))
    parser.add_argument("--version", type=int, default=int(os.getenv("ROBOFLOW_VERSION", "4")))
    parser.add_argument("--format", default="yolov8")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    api_key = os.getenv("ROBOFLOW_API_KEY", "").strip()
    if not api_key or api_key == "unauthorized":
        print("Missing ROBOFLOW_API_KEY. Export it or set it in .env before downloading.")
        return 2

    from roboflow import Roboflow

    output = args.output.expanduser()
    if not output.is_absolute():
        output = (ROOT / output).resolve()

    download_parent = output.parent / f".roboflow_download_{args.project}_v{args.version}"
    if download_parent.exists():
        shutil.rmtree(download_parent)
    download_parent.mkdir(parents=True, exist_ok=True)

    print(
        "Downloading Roboflow dataset "
        f"workspace={args.workspace} project={args.project} "
        f"version={args.version} format={args.format}"
    )
    rf = Roboflow(api_key=api_key)
    project = rf.workspace(args.workspace).project(args.project)
    version = project.version(args.version)
    dataset = version.download(args.format, location=str(download_parent))

    downloaded_root = find_dataset_root(Path(dataset.location))
    if not downloaded_root:
        downloaded_root = find_dataset_root(download_parent)
    if not downloaded_root:
        print(f"Download finished, but no YOLO dataset root was found under {download_parent}")
        return 1

    copy_or_replace(downloaded_root, output)
    print(f"final_dataset_path={output}")
    print_basic_counts(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
